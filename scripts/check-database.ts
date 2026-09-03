import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const checkDirectory = mkdtempSync(path.join(tmpdir(), "local-project-os-db-check-"));
process.env.PROJECT_OS_DATA_DIR = checkDirectory;

async function main() {
  try {
  const { getDatabase, getDatabasePathForDiagnostics } = await import(
    "../src/lib/db/connection"
  );
  const { settings } = await import("../src/lib/db/schema");

  const database = getDatabase();
  const databasePath = getDatabasePathForDiagnostics();
  const rows = database.select().from(settings).all();

  if (!existsSync(databasePath)) {
    throw new Error(`Expected a migrated SQLite file at ${databasePath}.`);
  }

  if (rows.length !== 3) {
    throw new Error(`Expected 3 seeded settings, found ${rows.length}.`);
  }

  console.info(`Migration and settings check passed: ${databasePath}`);
  } finally {
    rmSync(checkDirectory, { recursive: true, force: true });
  }
}

void main();
