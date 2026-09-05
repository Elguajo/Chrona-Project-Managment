"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Archive, ArchiveRestore, GripVertical, Plus, Search, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  archiveProjectAction,
  createProjectAction,
  deleteProjectAction,
  moveProjectAction,
  restoreProjectAction,
  updateProjectAction,
} from "@/app/actions/projects";
import { Button } from "@/components/ui/button";
import { matchesProjectSearch } from "@/lib/projects/search";
import { ProjectWorkspace } from "@/components/projects/project-workspace";
import {
  COVER_MODES,
  LINK_TYPES,
  PROJECT_PRIORITIES,
  PROJECT_STATUSES,
  PROJECT_TYPES,
  type ProjectActionResult,
  type ProjectRecord,
  type ProjectStatus,
  type ProjectTemplateRecord,
} from "@/lib/projects/types";
import { addCalendarDays, localToday } from "@/lib/timeline/date";

const INITIAL_ACTION_STATE: ProjectActionResult = { ok: false };

const STATUS_STYLES: Record<ProjectStatus, string> = {
  pitch: "bg-sky-500",
  negotiating: "bg-violet-500",
  planning: "bg-amber-500",
  active: "bg-emerald-500",
  on_hold: "bg-orange-500",
  completed: "bg-teal-600",
  cancelled: "bg-rose-500",
};

function displayLabel(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function moveInMemory(projects: ProjectRecord[], projectId: string, toStatus: ProjectStatus, beforeProjectId: string | null) {
  const project = projects.find((item) => item.id === projectId);
  if (!project) return projects;

  const remaining = projects.filter((item) => item.id !== projectId);
  const moved = { ...project, status: toStatus };
  const beforeIndex = beforeProjectId ? remaining.findIndex((item) => item.id === beforeProjectId) : -1;
  const destinationLastIndex = remaining.reduce(
    (lastIndex, item, index) => (item.status === toStatus && !item.archivedAt ? index : lastIndex),
    -1,
  );
  remaining.splice(beforeIndex >= 0 ? beforeIndex : destinationLastIndex + 1, 0, moved);
  return remaining;
}

function orderBoardProjects(projects: ProjectRecord[]) {
  return [...projects].sort((left, right) => {
    const statusDifference = PROJECT_STATUSES.indexOf(left.status as ProjectStatus) - PROJECT_STATUSES.indexOf(right.status as ProjectStatus);
    if (statusDifference !== 0) return statusDifference;
    const leftOrder = left.sortOrder ?? Number.POSITIVE_INFINITY;
    const rightOrder = right.sortOrder ?? Number.POSITIVE_INFINITY;
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;
    return left.createdAt.localeCompare(right.createdAt);
  });
}

type KanbanBoardProps = { projects: ProjectRecord[]; templates?: ProjectTemplateRecord[] };

export function KanbanBoard({ projects, templates = [] }: KanbanBoardProps) {
  const router = useRouter();
  const [boardProjects, setBoardProjects] = useState(() => orderBoardProjects(projects));
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [isSavingMove, setIsSavingMove] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("");
  const [type, setType] = useState("");

  const editingProject = editingId && editingId !== "new"
    ? boardProjects.find((project) => project.id === editingId) ?? null
    : null;

  const activeProjects = useMemo(() => boardProjects.filter((project) => !project.archivedAt), [boardProjects]);
  const archivedProjects = useMemo(() => boardProjects.filter((project) => project.archivedAt), [boardProjects]);

  const visibleProjects = useMemo(() => {
    return activeProjects.filter((project) => {
      return matchesProjectSearch(project, search)
        && (!priority || project.priority === priority)
        && (!type || project.type === type);
    });
  }, [activeProjects, priority, search, type]);

  const isFiltered = Boolean(search || priority || type);

  async function persistMove(projectId: string, toStatus: ProjectStatus, beforeProjectId: string | null) {
    if (isSavingMove || projectId === beforeProjectId) return;

    const snapshot = boardProjects;
    const project = snapshot.find((item) => item.id === projectId);
    if (!project) return;
    setNotice(null);
    setBoardProjects(moveInMemory(snapshot, projectId, toStatus, beforeProjectId));
    setIsSavingMove(true);

    const formData = new FormData();
    formData.set("projectId", projectId);
    formData.set("toStatus", toStatus);
    if (beforeProjectId) formData.set("beforeProjectId", beforeProjectId);
    const result = await moveProjectAction(formData);

    if (!result.ok) {
      setBoardProjects(snapshot);
      setNotice(result.error ?? `Could not move ${project.name}. The board was restored.`);
    } else {
      setNotice(`${project.name} moved to ${displayLabel(toStatus)}.`);
      router.refresh();
    }
    setIsSavingMove(false);
  }

  function dragProjectId(event: React.DragEvent<HTMLElement>) {
    return event.dataTransfer.getData("text/plain") || draggedId;
  }

  return (
    <section className="mt-8" aria-labelledby="kanban-title">
      <div className="flex flex-col gap-5 border-b pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-medium text-[var(--muted-foreground)]">Portfolio lifecycle</p>
          <h2 id="kanban-title" className="mt-1 text-2xl font-semibold tracking-tight">Kanban</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Drag cards to reorder or change status. Every card also has a keyboard-accessible Move to control.
          </p>
        </div>
        <Button onClick={() => setEditingId("new")}><Plus aria-hidden="true" /> New project</Button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-[minmax(16rem,1fr)_11rem_11rem]" aria-label="Kanban filters">
        <label className="relative block">
          <span className="sr-only">Search local projects, work, tags, or links</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" aria-hidden="true" />
          <input className="field pl-9" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search projects, work, tags, or links" />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          <span className="sr-only">Filter by priority</span>
          <select className="field" value={priority} onChange={(event) => setPriority(event.target.value)}>
            <option value="">All priorities</option>
            {PROJECT_PRIORITIES.map((value) => <option key={value} value={value}>{displayLabel(value)}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium">
          <span className="sr-only">Filter by project type</span>
          <select className="field" value={type} onChange={(event) => setType(event.target.value)}>
            <option value="">All types</option>
            {PROJECT_TYPES.map((value) => <option key={value} value={value}>{displayLabel(value)}</option>)}
          </select>
        </label>
      </div>

      <p className="mt-3 min-h-5 text-sm text-[var(--muted-foreground)]" aria-live="polite" role={notice?.startsWith("Could not") ? "alert" : "status"}>
        {notice}
      </p>

      <div className="relative -mx-5 mt-2 overflow-x-auto px-5 pb-4 sm:-mx-8 sm:px-8">
        <div className="grid min-w-max grid-cols-7 gap-4">
          {PROJECT_STATUSES.map((status) => {
            const allInColumn = activeProjects.filter((project) => project.status === status);
            const cards = visibleProjects.filter((project) => project.status === status);
            return (
              <section
                key={status}
                className="flex min-h-80 w-72 flex-col rounded-xl border bg-[var(--muted)]/55 p-3"
                aria-labelledby={`kanban-column-${status}`}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const projectId = dragProjectId(event);
                  if (projectId) void persistMove(projectId, status, null);
                }}
              >
                <div className="flex items-center justify-between gap-3 px-1 pb-3">
                  <h3 id={`kanban-column-${status}`} className="flex items-center gap-2 text-xs font-semibold tracking-wide uppercase">
                    <span className={`size-2 rounded-full ${STATUS_STYLES[status]}`} aria-hidden="true" />
                    {displayLabel(status)}
                  </h3>
                  <span className="rounded-full bg-[var(--background)] px-2 py-0.5 text-xs tabular-nums text-[var(--muted-foreground)]" aria-label={`${allInColumn.length} projects`}>
                    {isFiltered ? `${cards.length}/${allInColumn.length}` : allInColumn.length}
                  </span>
                </div>
                <div className="grid content-start gap-3">
                  {cards.map((project) => (
                    <KanbanCard
                      key={project.id}
                      project={project}
                      isSavingMove={isSavingMove}
                      onOpen={() => setEditingId(project.id)}
                      onMove={(toStatus) => void persistMove(project.id, toStatus, null)}
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", project.id);
                        setDraggedId(project.id);
                      }}
                      onDragEnd={() => setDraggedId(null)}
                      onDropBefore={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        const projectId = dragProjectId(event);
                        if (projectId) void persistMove(projectId, status, project.id);
                      }}
                    />
                  ))}
                  {cards.length === 0 && !isFiltered && <p className="px-1 py-6 text-center text-xs text-[var(--muted-foreground)]">No projects</p>}
                  {cards.length === 0 && isFiltered && <p className="px-1 py-6 text-center text-xs text-[var(--muted-foreground)]">No matching projects</p>}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {archivedProjects.length > 0 && (
        <details className="mt-4 border p-4">
          <summary className="cursor-pointer text-sm font-medium">Archived projects ({archivedProjects.length})</summary>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {archivedProjects.map((project) => (
              <button
                key={project.id}
                type="button"
                className="border bg-[var(--card)] p-3 text-left text-sm font-medium underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-[var(--ring)]"
                onClick={() => setEditingId(project.id)}
              >
                {project.name}
              </button>
            ))}
          </div>
        </details>
      )}

      <ProjectDrawer open={editingId !== null} project={editingProject} templates={templates} onClose={() => setEditingId(null)} />
    </section>
  );
}

function KanbanCard({
  project,
  isSavingMove,
  onOpen,
  onMove,
  onDragStart,
  onDragEnd,
  onDropBefore,
}: {
  project: ProjectRecord;
  isSavingMove: boolean;
  onOpen: () => void;
  onMove: (status: ProjectStatus) => void;
  onDragStart: (event: React.DragEvent<HTMLElement>) => void;
  onDragEnd: () => void;
  onDropBefore: (event: React.DragEvent<HTMLElement>) => void;
}) {
  return (
    <article
      draggable={!isSavingMove}
      className="rounded-lg border bg-[var(--card)] p-3 shadow-sm transition-opacity has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--ring)]"
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDropBefore}
      aria-label={project.name}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="mt-0.5 size-4 shrink-0 text-[var(--muted-foreground)]" aria-hidden="true" />
        <button type="button" className="min-w-0 flex-1 text-left font-semibold underline-offset-4 hover:underline" onClick={onOpen}>
          {project.name}
        </button>
      </div>
      <p className="mt-2 text-xs text-[var(--muted-foreground)]">
        {project.clientName ?? "No client"} · {project.workProgress}% work
      </p>
      {project.deadline && <p className="mt-1 text-xs text-[var(--muted-foreground)]">Due {project.deadline}</p>}
      {project.tags.length > 0 && <p className="mt-2 truncate text-xs text-[var(--muted-foreground)]">{project.tags.join(" · ")}</p>}
      <label className="mt-3 grid gap-1 text-xs font-medium">
        <span className="sr-only">Move {project.name} to another status</span>
        <select className="field text-xs" value="" disabled={isSavingMove} onChange={(event) => {
          const nextStatus = event.target.value as ProjectStatus;
          if (nextStatus) onMove(nextStatus);
        }}>
          <option value="">Move to…</option>
          {PROJECT_STATUSES.filter((status) => status !== project.status).map((status) => (
            <option key={status} value={status}>{displayLabel(status)}</option>
          ))}
        </select>
      </label>
    </article>
  );
}

export function ProjectDrawer({ open, project, templates = [], onClose }: { open: boolean; project: ProjectRecord | null; templates?: ProjectTemplateRecord[]; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      requestAnimationFrame(() => dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus());
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="project-drawer m-0 ml-auto h-dvh w-screen max-w-none overflow-hidden border-l bg-[var(--background)] p-0 text-[var(--foreground)] shadow-2xl backdrop:bg-black/45 sm:h-svh sm:w-full sm:max-w-xl"
      aria-labelledby="project-drawer-title"
      onClose={onClose}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
    >
      <div className="h-full overflow-y-auto p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[var(--accent)]">Project record</p>
            <h2 id="project-drawer-title" className="mt-1 text-xl font-semibold">{project ? "Edit project" : "New project"}</h2>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close project drawer"><X aria-hidden="true" /></Button>
        </div>
        {project && <Link href={`/projects/${project.id}`} className="mt-5 inline-flex text-sm font-medium text-[var(--accent)] underline-offset-4 hover:underline">Open full workspace</Link>}
        <ProjectForm key={project?.id ?? "new"} project={project} templates={templates} onSaved={onClose} />
        {project && <><ProjectWorkspace project={project} /><ProjectLifecycleActions project={project} onComplete={onClose} /></>}
      </div>
    </dialog>
  );
}

export function ProjectForm({ project, templates = [], onSaved }: { project: ProjectRecord | null; templates?: ProjectTemplateRecord[]; onSaved: () => void }) {
  const router = useRouter();
  const [state, setState] = useState(INITIAL_ACTION_STATE);
  const [pending, startTransition] = useTransition();
  const [templateId, setTemplateId] = useState("");
  const template = !project ? templates.find((item) => item.id === templateId) ?? null : null;
  const templateStart = template ? localToday() : "";
  const templateDeadline = template?.maxOffsetDays === null || template?.maxOffsetDays === undefined ? "" : addCalendarDays(templateStart, template.maxOffsetDays);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setState(INITIAL_ACTION_STATE);
    startTransition(async () => {
      const result = await (project ? updateProjectAction : createProjectAction)(INITIAL_ACTION_STATE, data);
      setState(result);
      if (result.ok) {
        router.refresh();
        onSaved();
      }
    });
  }

  return (
    <form key={`${project?.id ?? "new"}:${templateId}`} onSubmit={submit} className="mt-6">
      <fieldset disabled={pending} className="grid min-w-0 gap-4">
      {project && <input type="hidden" name="projectId" value={project.id} />}
      {!project && templates.length > 0 && <Field label="Start from template"><select name="templateId" value={templateId} onChange={(event) => setTemplateId(event.target.value)} className="field"><option value="">Blank project</option>{templates.map((item) => <option key={item.id} value={item.id}>{item.name}{item.isStarter ? " · starter" : ""}</option>)}</select>{template && <span className="text-xs font-normal text-[var(--muted-foreground)]">Creates {template.tasks.length} tasks, {template.milestones.length} milestones, and {template.documents.length} documents. Start date is required for its schedule.</span>}</Field>}
      <Field label="Name" required><input data-autofocus name="name" required maxLength={160} defaultValue={project?.name ?? template?.name ?? ""} className="field" /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Status"><select name="status" defaultValue={project?.status ?? template?.status ?? "pitch"} className="field">{PROJECT_STATUSES.map((value) => <option key={value} value={value}>{displayLabel(value)}</option>)}</select></Field>
        <Field label="Type"><select name="type" defaultValue={project?.type ?? template?.type ?? ""} className="field"><option value="">Unspecified</option>{PROJECT_TYPES.map((value) => <option key={value} value={value}>{displayLabel(value)}</option>)}</select></Field>
        <Field label="Start date" required={Boolean(template?.requiresStartDate)}><input name="startDate" type="date" required={Boolean(template?.requiresStartDate)} defaultValue={project?.startDate ?? templateStart} className="field" /></Field>
        <Field label="Deadline"><input name="deadline" type="date" defaultValue={project?.deadline ?? templateDeadline} className="field" /></Field>
        <Field label="Work progress"><input name="workProgress" type="number" min="0" max="100" step="1" required defaultValue={project?.workProgress ?? 0} className="field" /></Field>
        <Field label="Priority"><select name="priority" defaultValue={project?.priority ?? template?.priority ?? ""} className="field"><option value="">Unspecified</option>{PROJECT_PRIORITIES.map((value) => <option key={value} value={value}>{displayLabel(value)}</option>)}</select></Field>
      </div>
      <Field label="Client"><input name="clientName" maxLength={160} defaultValue={project?.clientName ?? ""} className="field" /></Field>
      <Field label="Description"><textarea name="description" maxLength={5000} defaultValue={project?.description ?? template?.description ?? ""} className="field min-h-20" /></Field>
      <Field label="Tags"><input name="tags" maxLength={600} defaultValue={project?.tags.join(", ") ?? template?.tags.join(", ") ?? ""} placeholder="portfolio, client" className="field" /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Link title"><input name="linkTitle" maxLength={160} defaultValue={project?.links[0]?.title ?? ""} className="field" /></Field>
        <Field label="Link URL"><input name="linkUrl" type="url" maxLength={2048} defaultValue={project?.links[0]?.url ?? ""} className="field" /></Field>
        <Field label="Link type"><select name="linkType" defaultValue={project?.links[0]?.type ?? "custom"} className="field">{LINK_TYPES.map((value) => <option key={value} value={value}>{displayLabel(value)}</option>)}</select></Field>
        <Field label="Color"><input name="color" type="color" defaultValue={project?.color ?? template?.color ?? "#3b82f6"} className="field h-9 p-1" /></Field>
      </div>
      <Field label="Cover"><select name="coverMode" defaultValue={project?.coverMode ?? "none"} className="field">{COVER_MODES.map((value) => <option key={value} value={value}>{displayLabel(value)}</option>)}</select></Field>
      <Field label="Local cover image"><input name="coverImage" type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="block w-full text-sm" /></Field>
      {state.error && <p className="text-sm text-[var(--destructive)]" role="alert">{state.error}</p>}
      {state.ok && <p role="status" className="text-sm text-[var(--muted-foreground)]">Project saved.</p>}
      <Button type="submit" disabled={pending}><Plus aria-hidden="true" /> {pending ? "Saving…" : project ? "Save project" : "Create project"}</Button>
      </fieldset>
    </form>
  );
}

function ProjectLifecycleActions({ project, onComplete }: { project: ProjectRecord; onComplete: () => void }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);

  async function submit(action: (formData: FormData) => Promise<ProjectActionResult>, confirmation?: string) {
    const formData = new FormData();
    formData.set("projectId", project.id);
    if (confirmation) formData.set("confirmation", confirmation);
    const result = await action(formData);
    if (!result.ok) setMessage(result.error ?? "Operation failed.");
    else {
      router.refresh();
      onComplete();
    }
  }

  return (
    <div className="mt-8 border-t pt-5">
      <p className="text-sm font-semibold">Project lifecycle</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {project.archivedAt ? (
          <Button size="sm" variant="outline" onClick={() => void submit(restoreProjectAction)}><ArchiveRestore aria-hidden="true" /> Restore</Button>
        ) : (
          <Button size="sm" variant="outline" onClick={() => void submit(archiveProjectAction)}><Archive aria-hidden="true" /> Archive</Button>
        )}
        <Button
          size="sm"
          variant="destructive"
          onClick={() => {
            if (window.confirm(`Permanently delete “${project.name}” and all of its local tasks, milestones, documents, history, tags, and links?`)) {
              void submit(deleteProjectAction, "DELETE");
            }
          }}
        >
          <Trash2 aria-hidden="true" /> Delete
        </Button>
      </div>
      {message && <p className="mt-3 text-sm text-[var(--destructive)]" role="alert">{message}</p>}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label className="grid gap-1.5 text-sm font-medium">{label}{required && " *"}{children}</label>;
}
