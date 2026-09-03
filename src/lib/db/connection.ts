import "server-only";

import { mkdirSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import * as schema from "@/lib/db/schema";

const DEFAULT_DATA_DIRECTORY = "data";
const DATABASE_FILENAME = "project-os.db";

type DatabaseState = {
  databasePath: string;
  sqlite: Database.Database;
  db: ReturnType<typeof drizzle<typeof schema>>;
  migrated: boolean;
};

const globalForDatabase = globalThis as typeof globalThis & {
  __localProjectOsDatabase?: DatabaseState;
};

function getDatabasePath() {
  return path.join(getDataDirectory(), DATABASE_FILENAME);
}

export function getDataDirectory() {
  const dataDirectory = process.env.PROJECT_OS_DATA_DIR ?? DEFAULT_DATA_DIRECTORY;
  return path.resolve(/* turbopackIgnore: true */ process.cwd(), dataDirectory);
}

function createState(): DatabaseState {
  const databasePath = getDatabasePath();
  mkdirSync(path.dirname(databasePath), { recursive: true });

  const sqlite = new Database(databasePath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  return {
    databasePath,
    sqlite,
    db: drizzle(sqlite, { schema }),
    migrated: false,
  };
}

function getState() {
  const databasePath = getDatabasePath();
  const existing = globalForDatabase.__localProjectOsDatabase;

  if (existing && existing.databasePath === databasePath) {
    return existing;
  }

  if (existing) {
    existing.sqlite.close();
  }

  const state = createState();
  globalForDatabase.__localProjectOsDatabase = state;
  return state;
}

/**
 * Creates the data directory when necessary and applies only committed Drizzle
 * migrations. It intentionally never recreates or replaces an existing database.
 */
export function initializeDatabase() {
  const state = getState();

  if (!state.migrated) {
    migrate(state.db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
    state.migrated = true;
  }

  return state;
}

export function getDatabase() {
  return initializeDatabase().db;
}

export function getDatabasePathForDiagnostics() {
  return initializeDatabase().databasePath;
}
