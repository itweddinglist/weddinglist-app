// =============================================================================
// app/api/guests/import/route.ts
// POST /api/guests/import â€" Import guests from CSV file
//
// Fixes applied:
//   FIX 2: Two separate dedup sets (existingDbKeys vs seenCsvKeys)
//   FIX 3: Row-by-row fallback on chunk insert failure
//   FIX 4: Strict create_groups validation ("true"/"false"/"1"/"0" only)
//   FIX 5: Group resolve failure â†’ per-row error, not silent null
//   FIX 6: Clear semantics: created + skipped + error rows = total
// =============================================================================

import { type NextRequest } from "next/server";
import { type SupabaseClient } from "@supabase/supabase-js";
import {
  getServerAppContext,
  requireAuthenticatedContext,
  requireWeddingAccess,
} from "@/lib/server-context";
import { supabaseServer } from "@/app/lib/supabase/server";
import { parseGuestsCsv } from "@/lib/csv/parse-guests";
import {
  successResponse,
  errorResponse,
  internalErrorResponse,
} from "@/lib/api-response";
import type {
  ImportResult,
  ImportRowError,
  ImportRowWarning,
  ParsedGuestRow,
} from "@/types/guest-import";

// â"€â"€â"€ Constants â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const CHUNK_SIZE = 100;
const VALID_CREATE_GROUPS = new Set(["true", "false", "1", "0"]);

// â"€â"€â"€ POST /api/guests/import â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

export async function POST(request: NextRequest): Promise<Response> {
  // 1. Authenticate
  const ctx = await getServerAppContext(request);
  const authResult = requireAuthenticatedContext(ctx);
  if (!authResult.ok) return authResult.response;

  // 2. Parse multipart form data
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse(
      400,
      "INVALID_FORM_DATA",
      "Request must be multipart/form-data."
    );
  }

  // 3. Extract and validate form fields
  const file = formData.get("file");
  const createGroupsRaw = formData.get("create_groups");

  if (!file || !(file instanceof File)) {
    return errorResponse(
      400,
      "MISSING_FILE",
      "A CSV file must be uploaded in the 'file' field."
    );
  }

  // FIX 4: Strict create_groups validation
  const createGroupsStr =
    typeof createGroupsRaw === "string" ? createGroupsRaw : "";
  if (createGroupsRaw !== null && !VALID_CREATE_GROUPS.has(createGroupsStr)) {
    return errorResponse(
      400,
      "INVALID_CREATE_GROUPS",
      `create_groups must be one of: "true", "false", "1", "0". Got: "${createGroupsStr}".`
    );
  }
  const createGroups = createGroupsStr === "true" || createGroupsStr === "1";

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return errorResponse(
      400,
      "FILE_TOO_LARGE",
      `File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds the 2MB limit.`
    );
  }

  // Validate file type
  const fileName = file.name?.toLowerCase() ?? "";
  const isValidType =
    fileName.endsWith(".csv") ||
    fileName.endsWith(".txt") ||
    file.type.startsWith("text/") ||
    file.type === "application/csv" ||
    file.type === "application/vnd.ms-excel";

  if (!isValidType) {
    return errorResponse(
      400,
      "INVALID_FILE_TYPE",
      `File type "${file.type}" is not supported. Upload a .csv file.`
    );
  }

  // 4. Authorize - wedding_id comes from active context
  const access = await requireWeddingAccess({ ctx: authResult.ctx, minRole: "editor" });
  if (!access.ok) return access.response;

  const weddingId = access.wedding_id;

  try {
    // 5. Read + parse CSV
    const csvText = await file.text();

    if (!csvText.trim()) {
      return errorResponse(400, "EMPTY_FILE", "The uploaded file is empty.");
    }

    const parseResult = parseGuestsCsv(csvText);

    // Blocking errors (no header, too many rows, empty): return immediately
    if (parseResult.errors.length > 0 && parseResult.rows.length === 0) {
      const result: ImportResult = {
        created: 0,
        skipped: 0,
        errors: parseResult.errors,
        warnings: parseResult.warnings,
        total_rows: parseResult.totalDataRows,
      };
      return successResponse(result);
    }

    // 6. Fetch existing guests for deduplication
    const { data: existingGuests, error: existingError } = await supabaseServer
      .from("guests")
      .select("first_name, last_name")
      .eq("wedding_id", weddingId);

    if (existingError) {
      return internalErrorResponse(
        existingError,
        "POST /api/guests/import - fetch existing"
      );
    }

    // FIX 2: Two separate dedup sets
    const existingDbKeys = new Set(
      (existingGuests ?? []).map((g) =>
        dedupKey(g.first_name, g.last_name)
      )
    );
    const seenCsvKeys = new Set<string>();

    // 7. Categorize rows: toInsert vs skipped vs errors
    const warnings: ImportRowWarning[] = [...parseResult.warnings];
    const errors: ImportRowError[] = [...parseResult.errors];
    const toInsert: ParsedGuestRow[] = [];
    let skippedCount = 0;

    for (const row of parseResult.rows) {
      const key = dedupKey(row.first_name, row.last_name);

      if (existingDbKeys.has(key)) {
        // FIX 2: DB duplicate â€" distinct message
        warnings.push({
          row: row._csvRow,
          message: `Skipped: guest "${row.display_name}" already exists in this wedding.`,
        });
        skippedCount++;
      } else if (seenCsvKeys.has(key)) {
        // FIX 2: Intra-CSV duplicate â€" distinct message
        warnings.push({
          row: row._csvRow,
          message: `Skipped: duplicate of another row in this CSV.`,
        });
        skippedCount++;
      } else {
        seenCsvKeys.add(key);
        toInsert.push(row);
      }
    }

    // 8. Resolve guest groups
    let groupMap = new Map<string, string>(); // group_name â†’ group_id

    if (createGroups) {
      const groupNames = new Set(
        toInsert
          .map((r) => r.group_name)
          .filter((name): name is string => name !== null)
      );

      if (groupNames.size > 0) {
        groupMap = await resolveGroups(supabaseServer, weddingId, groupNames);
      }
    }

    // FIX 5: Group resolution failure â†’ per-row error
    // Filter toInsert: rows with unresolvable groups become errors
    const readyToInsert: ParsedGuestRow[] = [];

    for (const row of toInsert) {
      if (row.group_name && createGroups) {
        if (!groupMap.has(row.group_name)) {
          errors.push({
            row: row._csvRow,
            field: "group",
            message: `Group "${row.group_name}" could not be created/resolved.`,
          });
          continue; // Don't insert this row
        }
      }

      if (row.group_name && !createGroups) {
        warnings.push({
          row: row._csvRow,
          message: `Group "${row.group_name}" ignored (create_groups is false).`,
        });
      }

      readyToInsert.push(row);
    }

    // 9. Build insert payloads (keep _csvRow for error reporting)
    const insertItems = readyToInsert.map((row) => ({
      _csvRow: row._csvRow,
      payload: {
        wedding_id: weddingId,
        first_name: row.first_name,
        last_name: row.last_name,
        display_name: row.display_name,
        guest_group_id: row.group_name
          ? (groupMap.get(row.group_name) ?? null)
          : null,
        side: row.side,
        notes: row.notes,
        is_vip: row.is_vip,
      },
    }));

    // 10. Batch insert with row-by-row fallback (FIX 3)
    let createdCount = 0;

    for (let i = 0; i < insertItems.length; i += CHUNK_SIZE) {
      const chunk = insertItems.slice(i, i + CHUNK_SIZE);
      const payloads = chunk.map((item) => item.payload);

      const { data: inserted, error: insertError } = await supabaseServer
        .from("guests")
        .insert(payloads)
        .select("id");

      if (!insertError) {
        // Whole chunk succeeded
        createdCount += inserted?.length ?? 0;
      } else {
        // FIX 3: Chunk failed â€" retry each row individually
        console.warn(
          `[Import] Chunk ${Math.floor(i / CHUNK_SIZE) + 1} failed, retrying row-by-row:`,
          insertError.message
        );

        for (const item of chunk) {
          const { data: singleInsert, error: singleError } = await supabaseServer
            .from("guests")
            .insert(item.payload)
            .select("id")
            .single();

          if (singleError) {
            errors.push({
              row: item._csvRow,
              field: "database",
              message: `Insert failed: ${singleError.message} (code: ${singleError.code ?? "unknown"})`,
            });
          } else if (singleInsert) {
            createdCount++;
          }
        }
      }
    }

    // 11. Build final result (FIX 6: clear semantics)
    const result: ImportResult = {
      created: createdCount,
      skipped: skippedCount,
      errors,
      warnings,
      total_rows: parseResult.totalDataRows,
    };

    return successResponse(result, createdCount > 0 ? 201 : 200);
  } catch (err) {
    return internalErrorResponse(err, "POST /api/guests/import");
  }
}

// â"€â"€â"€ Helpers â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

/**
 * Normalizes a string for deduplication:
 * lowercase + trim + NFD decomposition to strip diacritics.
 * "È˜tefan" === "Stefan", "Andrei" === "AndreÄ­" etc.
 * Important for Romanian names.
 */
function normalizeForDedup(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Deduplication key: normalized "first_name|last_name".
 */
function dedupKey(firstName: string, lastName: string | null): string {
  return `${normalizeForDedup(firstName)}|${normalizeForDedup(lastName ?? "")}`;
}

/**
 * Resolves group names to group IDs.
 * - Fetches existing groups for the wedding (case-insensitive match).
 * - Creates any groups that don't exist yet.
 * - Returns a map of group_name â†’ group_id.
 *   Missing entries = groups that failed to create (FIX 5).
 */
async function resolveGroups(
  supabase: SupabaseClient,
  weddingId: string,
  groupNames: Set<string>
): Promise<Map<string, string>> {
  const result = new Map<string, string>();

  // 1. Fetch existing groups (include sort_order for next-order calculation)
  const { data: existing, error: fetchError } = await supabase
    .from("guest_groups")
    .select("id, name, sort_order")
    .eq("wedding_id", weddingId);

  if (fetchError) {
    console.error("[Import] Failed to fetch groups:", fetchError.message);
    // Return empty map â€" all group rows will become errors (FIX 5)
    return result;
  }

  // Case-insensitive lookup
  const existingByName = new Map<string, string>();
  for (const group of existing ?? []) {
    existingByName.set(group.name.toLowerCase().trim(), group.id);
  }

  // 2. Map existing, collect missing
  const toCreate: string[] = [];
  for (const name of groupNames) {
    const key = name.toLowerCase().trim();
    const existingId = existingByName.get(key);
    if (existingId) {
      result.set(name, existingId);
    } else {
      toCreate.push(name);
    }
  }

  // 3. Create missing groups
  if (toCreate.length > 0) {
    const maxSortOrder = (existing ?? []).reduce(
      (max, g) => Math.max(max, (g as { sort_order?: number }).sort_order ?? 0),
      0
    );

    const insertPayload = toCreate.map((name, i) => ({
      wedding_id: weddingId,
      name,
      sort_order: maxSortOrder + i + 1,
    }));

    const { data: created, error: createError } = await supabase
      .from("guest_groups")
      .insert(insertPayload)
      .select("id, name");

    if (createError) {
      console.error("[Import] Failed to create groups:", createError.message);
      // Don't add to result map â€" these groups will cause per-row errors (FIX 5)
    } else {
      for (const group of created ?? []) {
        result.set(group.name, group.id);
      }
    }
  }

  return result;
}

