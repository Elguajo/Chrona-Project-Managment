"use client";

import { FileText, Flag, FolderPlus, Keyboard, ListPlus, Plus, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { createProjectAction } from "@/app/actions/projects";
import { createDocumentAction, createMilestoneAction, createTaskAction } from "@/app/actions/workspace";
import { PORTFOLIO_VIEWS, type PortfolioView } from "@/components/app/portfolio-navigation";
import { Button } from "@/components/ui/button";
import type { ProjectActionResult, ProjectRecord, ProjectTemplateRecord } from "@/lib/projects/types";

type QuickKind = "project" | "task" | "milestone" | "document";

const ACTIONS: Array<{ kind: QuickKind; label: string; icon: typeof FolderPlus }> = [
  { kind: "project", label: "Project", icon: FolderPlus },
  { kind: "task", label: "Task", icon: ListPlus },
  { kind: "milestone", label: "Milestone", icon: Flag },
  { kind: "document", label: "Document", icon: FileText },
];

const VIEW_LABELS: Record<PortfolioView, string> = {
  dashboard: "Dashboard",
  kanban: "Kanban",
  timeline: "Timeline",
  calendar: "Calendar",
  list: "List",
  templates: "Templates",
};

type Command =
  | { id: string; label: string; detail: string; type: "create"; kind: QuickKind }
  | { id: string; label: string; detail: string; type: "view"; view: PortfolioView }
  | { id: string; label: string; detail: string; type: "project"; projectId: string };

function isEditableTarget(target: EventTarget | null) {
  return target instanceof Element && target.closest("input, textarea, select, [contenteditable='true']") !== null;
}

function hasVisibleUnsavedForm() {
  const forms = Array.from(document.forms).filter((form) => form.getClientRects().length > 0);
  return forms.some((form) => Array.from(form.elements).some((element) => {
    if (element instanceof HTMLInputElement) {
      if (["button", "submit", "reset", "hidden"].includes(element.type)) return false;
      if (element.type === "checkbox" || element.type === "radio") return element.checked !== element.defaultChecked;
      if (element.type === "file") return element.files !== null && element.files.length > 0;
      return element.value !== element.defaultValue;
    }
    if (element instanceof HTMLTextAreaElement) return element.value !== element.defaultValue;
    if (element instanceof HTMLSelectElement) return Array.from(element.options).some((option) => option.selected !== option.defaultSelected);
    return false;
  }));
}

export function QuickAdd({ projects, templates, onNavigate }: { projects: ProjectRecord[]; templates: ProjectTemplateRecord[]; onNavigate?: (view: PortfolioView) => void }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [screen, setScreen] = useState<"commands" | "create">("commands");
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [kind, setKind] = useState<QuickKind>("project");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function show() {
    lastFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setOpen(true);
  }

  function canDiscardDraft() {
    return !pending && (!dirty || window.confirm("Discard this unsaved draft?"));
  }

  function close() {
    if (canDiscardDraft()) setOpen(false);
  }

  useEffect(() => {
    if (open && screen === "commands") {
      dialogRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
    }
  }, [open, screen, query, selectedIndex]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      requestAnimationFrame(() => dialog.querySelector<HTMLElement>("[data-command-autofocus], [data-quick-autofocus]")?.focus());
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => dialogRef.current?.querySelector<HTMLElement>("[data-command-autofocus], [data-quick-autofocus]")?.focus());
  }, [kind, open, screen]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.isComposing || !(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k") return;
      if (isEditableTarget(event.target) || document.querySelector("dialog[open]")) return;
      event.preventDefault();
      show();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function onDialogClose() {
    setOpen(false);
    setScreen("commands");
    setDirty(false);
    setQuery("");
    setSelectedIndex(0);
    setMessage(null);
    requestAnimationFrame(() => lastFocusedRef.current?.focus());
  }

  const activeProjects = projects.filter((project) => !project.archivedAt);
  const commands: Command[] = [
    ...ACTIONS.map(({ kind: commandKind, label }) => ({ id: `create-${commandKind}`, label: `Create ${label}`, detail: "Create a local record", type: "create" as const, kind: commandKind })),
    ...PORTFOLIO_VIEWS.map((view) => ({ id: `view-${view}`, label: `Open ${VIEW_LABELS[view]}`, detail: "Open local portfolio view", type: "view" as const, view })),
    ...projects.map((project) => ({ id: `project-${project.id}`, label: project.name, detail: project.archivedAt ? "Archived Project workspace" : "Project workspace", type: "project" as const, projectId: project.id })),
  ];
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const matchingCommands = commands.filter((command) => !normalizedQuery || `${command.label} ${command.detail}`.toLocaleLowerCase().includes(normalizedQuery)).slice(0, 20);

  function canNavigateAway() {
    return !hasVisibleUnsavedForm() || window.confirm("Leave this page without saving the changed form?");
  }

  function runCommand(command: Command) {
    if (command.type === "create") {
      setKind(command.kind);
      setScreen("create");
      setMessage(null);
      return;
    }
    if (!canNavigateAway()) return;
    if (command.type === "view") {
      if (onNavigate) onNavigate(command.view);
      else router.push(`/?view=${command.view}`);
    } else {
      router.push(`/projects/${encodeURIComponent(command.projectId)}`);
    }
    close();
  }

  function handleCommandKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((index) => Math.min(index + 1, Math.max(matchingCommands.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && matchingCommands[selectedIndex]) {
      event.preventDefault();
      runCommand(matchingCommands[selectedIndex]);
    }
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
      setNotice(`${kind[0].toUpperCase()}${kind.slice(1)} created.`);
      setOpen(false);
    });
  }

  return <>
    <Button size="sm" onClick={show}><Plus aria-hidden="true" /> Quick add <kbd className="hidden rounded border px-1 text-[10px] font-normal sm:inline">⌘K</kbd></Button>
    <span role="status" className="sr-only">{notice}</span>
    <dialog ref={dialogRef} className="command-palette m-auto w-[calc(100%-2rem)] max-w-xl rounded-xl border bg-[var(--card)] p-0 text-[var(--foreground)] shadow-2xl backdrop:bg-black/45" aria-labelledby="command-palette-title" onCancel={(event) => { event.preventDefault(); close(); }} onClose={onDialogClose}>
      {screen === "commands" ? <div className="p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-medium text-[var(--accent)]">Local command palette</p><h2 id="command-palette-title" className="mt-1 text-xl font-semibold">Navigate or create</h2></div><span className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]"><Keyboard className="size-3.5" aria-hidden="true" /> ⌘/Ctrl K</span><Button type="button" variant="ghost" size="icon" onClick={close} aria-label="Close command palette"><X aria-hidden="true" /></Button></div><label className="mt-5 grid gap-1.5 text-sm font-medium" htmlFor="command-query">Find a command or Project<input id="command-query" data-command-autofocus role="combobox" aria-expanded="true" aria-autocomplete="list" type="search" value={query} onChange={(event) => { setQuery(event.target.value); setSelectedIndex(0); }} onKeyDown={handleCommandKeyDown} className="field" autoComplete="off" aria-controls="command-results" aria-activedescendant={matchingCommands[selectedIndex] ? `command-${matchingCommands[selectedIndex].id}` : undefined} /></label><div id="command-results" role="listbox" aria-label="Commands" className="mt-3 grid max-h-80 overflow-y-auto rounded-md border">{matchingCommands.length === 0 ? <p className="p-4 text-sm text-[var(--muted-foreground)]">No local command or Project matches.</p> : matchingCommands.map((command, index) => <button id={`command-${command.id}`} key={command.id} role="option" tabIndex={-1} aria-selected={selectedIndex === index} type="button" className={`grid gap-0.5 border-b px-4 py-3 text-left text-sm last:border-b-0 ${selectedIndex === index ? "bg-[var(--muted)]" : "hover:bg-[var(--muted)]"}`} onMouseMove={() => setSelectedIndex(index)} onClick={() => runCommand(command)}><span className="font-medium">{command.label}</span><span className="text-xs text-[var(--muted-foreground)]">{command.detail}</span></button>)}</div><p className="mt-3 text-xs text-[var(--muted-foreground)]">Use ↑ ↓ then Enter, or Escape to close.</p></div> : <form className="p-5 sm:p-6" onSubmit={submit} onChange={() => setDirty(true)}><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-medium text-[var(--accent)]">Quick add</p><h2 id="command-palette-title" className="mt-1 text-xl font-semibold">Create a local record</h2></div><span className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]"><Keyboard className="size-3.5" aria-hidden="true" /> ⌘/Ctrl K</span></div><div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">{ACTIONS.map(({ kind: candidate, label, icon: Icon }) => <button key={candidate} type="button" className={`flex min-h-20 flex-col items-center justify-center gap-2 border p-2 text-sm font-medium transition-colors ${kind === candidate ? "border-[var(--accent)] bg-[var(--muted)]" : "hover:bg-[var(--muted)]"}`} disabled={pending} aria-pressed={kind === candidate} onClick={() => { if (kind === candidate || !canDiscardDraft()) return; setKind(candidate); setDirty(false); setMessage(null); }}><Icon className="size-5" aria-hidden="true" />{label}</button>)}</div><QuickForm key={kind} kind={kind} projects={activeProjects} templates={templates} pending={pending} />{message && <p className="mt-4 text-sm text-[var(--destructive)]" role="alert">{message}</p>}<div className="mt-5 flex justify-end gap-2"><Button type="button" variant="outline" disabled={pending} onClick={() => { if (!canDiscardDraft()) return; setScreen("commands"); setDirty(false); setMessage(null); }}>Back</Button><Button type="button" variant="outline" disabled={pending} onClick={close}>Cancel</Button><Button type="submit" disabled={pending || (kind !== "project" && activeProjects.length === 0)}>{pending ? "Saving…" : `Create ${kind}`}</Button></div></form>}
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
