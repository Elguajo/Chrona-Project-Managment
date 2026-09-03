import "server-only";

import { getDatabase } from "@/lib/db/connection";
import { settings } from "@/lib/db/schema";

export const DEFAULT_SETTINGS = {
  appearance: "dark",
  defaultView: "kanban",
  sidebarCollapsed: false,
} as const;

export type LocalSettings = {
  appearance: string;
  defaultView: string;
  sidebarCollapsed: boolean;
};

export function getLocalSettings(): LocalSettings {
  const database = getDatabase();
  const rows = database.select().from(settings).all();
  const values = new Map(rows.map((row) => [row.key, row.valueJson]));

  return {
    appearance: parseString(values.get("appearance"), DEFAULT_SETTINGS.appearance),
    defaultView: parseString(values.get("default_view"), DEFAULT_SETTINGS.defaultView),
    sidebarCollapsed: parseBoolean(
      values.get("sidebar_collapsed"),
      DEFAULT_SETTINGS.sidebarCollapsed,
    ),
  };
}

function parseString(value: string | undefined, fallback: string) {
  if (!value) {
    return fallback;
  }

  try {
    const parsed: unknown = JSON.parse(value);
    return typeof parsed === "string" ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (!value) {
    return fallback;
  }

  try {
    const parsed: unknown = JSON.parse(value);
    return typeof parsed === "boolean" ? parsed : fallback;
  } catch {
    return fallback;
  }
}
