import { createBackup, BackupValidationError, MAX_BACKUP_BYTES, restoreBackup } from "@/lib/backup/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  const backup = createBackup();
  const filename = `local-project-os-backup-${backup.exportedAt.slice(0, 10)}.json`;
  return Response.json(backup, {
    headers: { "Content-Disposition": `attachment; filename=\"${filename}\"` },
  });
}

export async function POST(request: Request) {
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BACKUP_BYTES) {
    return Response.json({ ok: false, error: "Backup file is too large." }, { status: 413 });
  }
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return Response.json({ ok: false, error: "Upload a JSON backup file." }, { status: 415 });
  }
  try {
    const body = await request.text();
    if (Buffer.byteLength(body) > MAX_BACKUP_BYTES) return Response.json({ ok: false, error: "Backup file is too large." }, { status: 413 });
    restoreBackup(JSON.parse(body) as unknown);
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof BackupValidationError || error instanceof SyntaxError) {
      return Response.json({ ok: false, error: error instanceof BackupValidationError ? error.message : "The file is not valid JSON. Your existing data was not changed." }, { status: 400 });
    }
    console.error("Backup restore failed", error);
    return Response.json({ ok: false, error: "The backup could not be restored. Your existing data was not changed." }, { status: 500 });
  }
}
