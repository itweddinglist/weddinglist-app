#!/usr/bin/env tsx
// scripts/db-types-generate.ts
//
// Regenerate types/database.ts from Supabase local schema.
//
// Faza 13.0 PR 1A — Schema-code consistency layer.
// Vezi: CLAUDE.md §10.1, /docs/audit/2026-05-pre-launch.md §10.12.
//
// Hardening:
//   - capture stdout direct (NO shell redirect care contamineaza file pe Windows)
//   - ignore stderr explicit (banner-ul CLI update apare pe stderr, NOT stdout)
//   - validate output cu start/end markers ca sa prinda truncari sau contaminari

import { execSync } from "node:child_process";
import { existsSync, statSync, writeFileSync } from "node:fs";

const TYPES_PATH = "types/database.ts";
const MIN_FILE_SIZE_BYTES = 10 * 1024; // 10KB sanity threshold (realitate ~47KB pentru schema curenta)
const EXPECTED_START_PREFIX = "export type Json =";
const EXPECTED_END_SUFFIX = "} as const";

function validateOutput(raw: string): string {
  const trimmed = raw.replace(/^\s+|\s+$/g, "");
  if (!trimmed.startsWith(EXPECTED_START_PREFIX)) {
    throw new Error(
      `Output nu incepe cu "${EXPECTED_START_PREFIX}". First 80 chars: ${trimmed.slice(0, 80)}`
    );
  }
  if (!trimmed.endsWith(EXPECTED_END_SUFFIX)) {
    throw new Error(
      `Output nu se termina cu "${EXPECTED_END_SUFFIX}". Last 80 chars: ${trimmed.slice(-80)}`
    );
  }
  return trimmed + "\n";
}

function main(): void {
  console.log("Regenerating Supabase types from local schema...");

  let stdout: string;
  try {
    stdout = execSync("npx supabase gen types typescript --local", {
      encoding: "utf-8",
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large schemas
      stdio: ["inherit", "pipe", "ignore"], // ignore stderr (banner CLI update)
    });
  } catch {
    console.error("FAILED: supabase gen types --local");
    console.error("");
    console.error("Verifica:");
    console.error("  1. Supabase local ruleaza: npx supabase status");
    console.error("  2. Daca nu: npx supabase start");
    console.error("  3. SAU regen manual din cloud: npm run db:types:linked");
    process.exit(1);
  }

  let validated: string;
  try {
    validated = validateOutput(stdout);
  } catch (err) {
    console.error(`FAILED validation: ${(err as Error).message}`);
    process.exit(1);
  }

  writeFileSync(TYPES_PATH, validated, "utf-8");

  if (!existsSync(TYPES_PATH)) {
    console.error(`FAILED: ${TYPES_PATH} nu a fost creat`);
    process.exit(1);
  }

  const stats = statSync(TYPES_PATH);
  if (stats.size < MIN_FILE_SIZE_BYTES) {
    console.error(`FAILED: ${TYPES_PATH} prea mic (${stats.size} bytes < ${MIN_FILE_SIZE_BYTES})`);
    console.error("Verifica ca Supabase local are migrations aplicate corect.");
    process.exit(1);
  }

  console.log(`OK Types regenerated: ${TYPES_PATH} (${(stats.size / 1024).toFixed(1)} KB)`);
}

main();
