#!/usr/bin/env node
/**
 * Manual database backup script using pg_dump.
 * Requires DATABASE_URL env var and pg_dump CLI.
 *
 * Usage: node scripts/backup.mjs
 */
import { execSync } from "child_process";
import { mkdirSync } from "fs";
import { join } from "path";

const BACKUP_DIR = join(process.cwd(), "backups");
const date = new Date().toISOString().slice(0, 10);
const filename = `backup-${date}.sql`;
const outPath = join(BACKUP_DIR, filename);

if (!process.env.DATABASE_URL) {
  console.error("ERROR: DATABASE_URL not set in environment.");
  process.exit(1);
}

try {
  mkdirSync(BACKUP_DIR, { recursive: true });
  console.log(`Backing up database to ${outPath} ...`);
  execSync(`pg_dump "${process.env.DATABASE_URL}" > "${outPath}"`, { stdio: "inherit" });
  console.log(`✓ Backup complete: ${outPath}`);
} catch (err) {
  console.error("Backup failed:", err.message);
  process.exit(1);
}
