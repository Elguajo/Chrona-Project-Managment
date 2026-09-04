"use client";

import { FileText, Flag, FolderPlus, Keyboard, ListPlus, Plus } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { createProjectAction } from "@/app/actions/projects";
import { createDocumentAction, createMilestoneAction, createTaskAction } from "@/app/actions/workspace";
import { Button } from "@/components/ui/button";
import type { ProjectActionResult, ProjectRecord, ProjectTemplateRecord } from "@/lib/projects/types";

type QuickKind = "project" | "task" | "milestone" | "document";

const ACTIONS: Array<{ kind: QuickKind; label: string; icon: typeof FolderPlus }> = [
  { kind: "project", label: "Project", icon: FolderPlus },
  { kind: "task", label: "Task", icon: ListPlus },
  { kind: "milestone", label: "Milestone", icon: Flag },
  { kind: "document", label: "Document", icon: FileText },
];

export function QuickAdd({ projects, templates }: { projects: ProjectRecord[]; templates: ProjectTemplateRecord[] }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<QuickKind>("project");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function show() {
    lastFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setOpen(true);
  }

  function close() {
    setOpen(false);
  }

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      requestAnimationFrame(() => dialog.querySelector<HTMLElement>("[data-quick-autofocus]")?.focus());
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => dialogRef.current?.querySelector<HTMLElement>("[data-quick-autofocus]")?.focus());
  }, [kind, open]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.isComposing || !(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k") return;
      event.preventDefault();
      show();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function onDialogClose() {
    setOpen(false);
    setMessage(null);
    requestAnimationFrame(() => lastFocusedRef.current?.focus());
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const templateId = formData.get("templateId");
    const template = typeof templateId === "string" ? templates.find((item) => item.id === templateId) : null;
    let action: (data: FormData) => Promise<ProjectActionResult>;
    if (kind === "project") {
      formData.set("status", template?.status ?? "planning");
      formData.set("type", template?.type ?? "");
      formData.set("priority", template?.priority ?? "");
      formData.set("color", template?.color ?? "#3b82f6");
      formData.set("workProgress", "0");
      formData.set("coverMode", "none");
      action = (data) => createProjectAction({ ok: false }, data);
    } else if (kind === "task") {
      formData.set("status", "todo");
      action = createTaskAction;
    } else if (kind === "milestone") {
      action = createMilestoneAction;
    } else {
      action = createDocumentAction;
    }
    setMessage(null);
    startTransition(async () => {
      const result = await action(formData);
      if (!result.ok) {
        setMessage(result.error ?? "Could not create the record.");
        return;
      }
      router.refresh();
      close();
    });
  }

  const activeProjects = projects.filter((project) => !project.archivedAt);
  return <>
    <Button size="sm" onClick={show}><Plus aria-hidden="true" /> Quick add <kbd className="hidden rounded border px-1 text-[10px] font-normal sm:inline">⌘K</kbd></Button>
    <dialog ref={dialogRef} className="m-auto w-[calc(100%-2rem)] max-w-xl border bg-[var(--background)] p-0 text-[var(--foreground)] shadow-2xl backdrop:bg-black/45" aria-labelledby="quick-add-title" onCancel={(event) => { event.preventDefault(); close(); }} onClose={onDialogClose}>
      <form className="p-5 sm:p-6" onSubmit={submit}>
        <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-medium text-[var(--accent)]">Quick add</p><h2 id="quick-add-title" className="mt-1 text-xl font-semibold">Create a local record</h2></div><span className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]"><Keyboard className="size-3.5" aria-hidden="true" /> ⌘/Ctrl K</span></div>
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">{ACTIONS.map(({ kind: candidate, label, icon: Icon }) => <button key={candidate} type="button" className={`flex min-h-20 flex-col items-center justify-center gap-2 border p-2 text-sm font-medium transition-colors ${kind === candidate ? "border-[var(--accent)] bg-[var(--muted)]" : "hover:bg-[var(--muted)]"}`} onClick={() => { setKind(candidate); setMessage(null); }}><Icon className="size-5" aria-hidden="true" />{label}</button>)}</div>
        <QuickForm kind={kind} projects={activeProjects} templates={templates} pending={pending} />
        {message && <p className="mt-4 text-sm text-[var(--destructive)]" role="alert">{message}</p>}
        <div className="mt-5 flex justify-end gap-2"><Button type="button" variant="outline" onClick={close}>Cancel</Button><Button type="submit" disabled={pending}>{pending ? "Saving…" : `Create ${kind}`}</Button></div>
      </form>
    </dialog>
  </>;
}

function QuickForm({ kind, projects, templates, pending }: { kind: QuickKind; projects: ProjectRecord[]; templates: ProjectTemplateRecord[]; pending: boolean }) {
  const [templateId, setTemplateId] = useState("");
  const template = templates.find((item) => item.id === templateId);
  if (kind === "project") return <div key="project" className="mt-5 grid gap-4"><Field label="Project name" required><input data-quick-autofocus name="name" required maxLength={160} className="field" placeholder={template ? template.name : "Project name"} disabled={pending} /></Field><Field label="Start from template"><select name="templateId" className="field" value={templateId} onChange={(event) => setTemplateId(event.target.value)} disabled={pending}><option value="">Blank project</option>{templates.map((item) => <option key={item.id} value={item.id}>{item.name}{item.isStarter ? " · starter" : ""}</option>)}</select></Field><Field label="Start date" required={Boolean(template?.requiresStartDate)}><input name="startDate" type="date" required={Boolean(template?.requiresStartDate)} className="field" disabled={pending} /></Field>{template && <p className="text-sm text-[var(--muted-foreground)]">Creates {template.tasks.length} tasks, {template.milestones.length} milestones, and {template.documents.length} documents. The deadline defaults to day {template.maxOffsetDays ?? 0}.</p>}</div>;
  if (kind === "task") return <div key="task" className="mt-5 grid gap-4"><ProjectSelect projects={projects} pending={pending} /><Field label="Task title" required><input data-quick-autofocus name="title" required maxLength={240} className="field" disabled={pending} /></Field><Field label="Due date"><input name="dueDate" type="date" className="field" disabled={pending} /></Field><Field label="Detail"><input name="detail" maxLength={5000} className="field" disabled={pending} /></Field></div>;
  if (kind === "milestone") return <div key="milestone" className="mt-5 grid gap-4"><ProjectSelect projects={projects} pending={pending} /><Field label="Milestone" required><input data-quick-autofocus name="title" required maxLength={240} className="field" disabled={pending} /></Field><Field label="Date" required><input name="targetDate" type="date" required className="field" disabled={pending} /></Field></div>;
  return <div key="document" className="mt-5 grid gap-4"><ProjectSelect projects={projects} pending={pending} /><Field label="Document title" required><input data-quick-autofocus name="title" required maxLength={240} className="field" disabled={pending} /></Field><Field label="Content"><textarea name="content" maxLength={50000} className="field min-h-28" disabled={pending} /></Field></div>;
}

function ProjectSelect({ projects, pending }: { projects: ProjectRecord[]; pending: boolean }) {
  return <Field label="Project" required><select data-quick-autofocus name="projectId" required className="field" disabled={pending || projects.length === 0}><option value="">Select a project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select>{projects.length === 0 && <span className="text-xs font-normal text-[var(--destructive)]">Create a project first.</span>}</Field>;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label className="grid gap-1.5 text-sm font-medium">{label}{required && " *"}{children}</label>;
}
