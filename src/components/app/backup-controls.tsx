"use client";

import { Download, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function BackupControls() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState<{ text: string; isError: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function exportBackup() {
    setBusy(true); setFeedback(null);
    try {
      const response = await fetch("/api/backup");
      if (!response.ok) throw new Error("Could not create a backup.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = `local-project-os-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.append(link); link.click(); link.remove(); URL.revokeObjectURL(url);
      setFeedback({ text: "Backup downloaded.", isError: false });
    } catch (error) {
      setFeedback({ text: error instanceof Error ? error.message : "Could not create a backup.", isError: true });
    } finally { setBusy(false); }
  }

  async function importBackup(file: File) {
    if (!window.confirm("Replace all local projects, workspace records, templates, settings, and cover assets with this backup? This cannot be undone.")) return;
    setBusy(true); setFeedback(null);
    try {
      const response = await fetch("/api/backup", { method: "POST", headers: { "Content-Type": "application/json" }, body: await file.text() });
      const result: unknown = await response.json();
      if (!response.ok || typeof result !== "object" || result === null || !((result as { ok?: unknown }).ok)) {
        const error = typeof result === "object" && result !== null && typeof (result as { error?: unknown }).error === "string" ? (result as { error: string }).error : "The backup could not be restored. Your existing data was not changed.";
        throw new Error(error);
      }
      setFeedback({ text: "Backup restored. Reloading local data.", isError: false });
      router.refresh();
    } catch (error) {
      setFeedback({ text: error instanceof Error ? error.message : "The backup could not be restored. Your existing data was not changed.", isError: true });
    } finally { setBusy(false); if (inputRef.current) inputRef.current.value = ""; }
  }

  return <div className="flex flex-wrap items-center justify-start gap-2 sm:justify-end" aria-label="Local backup controls">
    <Button variant="outline" size="sm" disabled={busy} onClick={() => void exportBackup()}><Download aria-hidden="true" /> Export backup</Button>
    <Button variant="outline" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}><Upload aria-hidden="true" /> Import backup</Button>
    <input ref={inputRef} className="sr-only" type="file" accept="application/json,.json" aria-label="Choose a JSON backup file" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importBackup(file); }} />
    {feedback && <p role={feedback.isError ? "alert" : "status"} className={`basis-full text-right text-xs ${feedback.isError ? "text-[var(--destructive)]" : "text-[var(--muted-foreground)]"}`}>{feedback.text}</p>}
  </div>;
}
