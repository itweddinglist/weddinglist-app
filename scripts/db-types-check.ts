#!/usr/bin/env tsx
// scripts/db-types-check.ts
//
// Verify types/database.ts is in sync with Supabase local schema.
// Used to detect drift between committed types and actual schema.
//
// Exit 0 if in sync, exit 1 if drift detected.
//
// Faza 13.0 PR 1A — local safety net pentru types regen.
// CI activation scheduled in PR 1B (cere setup Supabase in CI workflow).
// Vezi: CLAUDE.md §10.1.
//
// Hardening:
//   - capture stdout direct (NO shell redirect care contamineaza file pe Windows)
//   - ignore stderr explicit (banner-ul CLI update apare pe stderr, NOT stdout)
//   - validate output cu start/end markers ca sa prinda truncari sau contaminari

import { execSync } from "node:child_process";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";

const TYPES_PATH = "types/database.ts";
const TEMP_PATH = "types/database.ts.check.tmp";
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
  if (!existsSync(TYPES_PATH)) {
    console.error(`FAILED: ${TYPES_PATH} nu exista. Ruleaza: npm run db:types:generate`);
    process.exit(1);
  }

  console.log("Generating fresh types for comparison...");

  let stdout: string;
  try {
    stdout = execSync("npx supabase gen types typescript --local", {
      encoding: "utf-8",
      maxBuffer: 50 * 1024 * 1024,
      stdio: ["inherit", "pipe", "ignore"],
    });
  } catch {
    console.error("FAILED: supabase gen types --local (during check)");
    process.exit(1);
  }

  let validated: string;
  try {
    validated = validateOutput(stdout);
  } catch (err) {
    console.error(`FAILED validation: ${(err as Error).message}`);
    process.exit(1);
  }

  writeFileSync(TEMP_PATH, validated, "utf-8");

  const committed = readFileSync(TYPES_PATH, "utf8");
  const fresh = readFileSync(TEMP_PATH, "utf8");

  try {
    unlinkSync(TEMP_PATH);
  } catch {
    // Ignore cleanup errors
  }

  if (committed === fresh) {
    console.log(`OK ${TYPES_PATH} is in sync with Supabase local schema.`);
    process.exit(0);
  }

  console.error(`DRIFT DETECTED: ${TYPES_PATH} differs from current schema.`);
  console.error("");
  console.error("Run 'npm run db:types:generate' and commit the result.");
  console.error("");

  const committedLines = committed.split("\n");
  const freshLines = fresh.split("\n");
  const maxLines = Math.min(committedLines.length, freshLines.length);
  let firstDiffLine = -1;
  for (let i = 0; i < maxLines; i++) {
    if (committedLines[i] !== freshLines[i]) {
      firstDiffLine = i + 1;
      break;
    }
  }
  if (firstDiffLine > 0) {
    console.error(`First difference at line ${firstDiffLine}:`);
    console.error(`  Committed: ${committedLines[firstDiffLine - 1]}`);
    console.error(`  Fresh:     ${freshLines[firstDiffLine - 1]}`);
  } else if (committedLines.length !== freshLines.length) {
    console.error(`Line count differs: committed=${committedLines.length}, fresh=${freshLines.length}`);
  }
  process.exit(1);
}

main();
