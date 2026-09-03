"use client";

import { useActionState, useEffect, useState } from "react";
import { Archive, ArchiveRestore, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  archiveProjectAction,
  createProjectAction,
  deleteProjectAction,
  restoreProjectAction,
  updateProjectAction,
} from "@/app/actions/projects";
import { Button } from "@/components/ui/button";
import {
  COVER_MODES,
  LINK_TYPES,
  PROJECT_PRIORITIES,
  PROJECT_STATUSES,
  PROJECT_TYPES,
  type ProjectActionResult,
  type ProjectRecord,
} from "@/lib/projects/types";

const INITIAL_ACTION_STATE: ProjectActionResult = { ok: false };

function displayLabel(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

type ProjectManagerProps = { projects: ProjectRecord[] };

export function ProjectManager({ projects }: ProjectManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingProject = projects.find((project) => project.id === editingId) ?? null;
  const activeProjects = projects.filter((project) => !project.archivedAt);
  const archivedProjects = projects.filter((project) => project.archivedAt);

  return (
    <section className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_26rem]" aria-labelledby="project-domain-title">
      <div>
        <div className="flex items-end justify-between gap-4 border-b pb-4">
          <div>
            <p className="text-sm font-medium text-[var(--accent)]">Project domain</p>
            <h2 id="project-domain-title" className="mt-1 text-xl font-semibold">Local projects</h2>
          </div>
          <span className="text-sm text-[var(--muted-foreground)]">{activeProjects.length} active records</span>
        </div>

        {activeProjects.length === 0 ? (
          <p className="mt-6 border bg-[var(--muted)] p-5 text-sm text-[var(--muted-foreground)]">
            No projects yet. Create the first local record using the form.
          </p>
        ) : (
          <div className="mt-5 grid gap-3">
            {activeProjects.map((project) => (
              <ProjectCard key={project.id} project={project} onEdit={() => setEditingId(project.id)} />
            ))}
          </div>
        )}

        {archivedProjects.length > 0 && (
          <details className="mt-8 border p-4">
            <summary className="cursor-pointer text-sm font-medium">Archived projects ({archivedProjects.length})</summary>
            <div className="mt-4 grid gap-3">
              {archivedProjects.map((project) => (
                <ProjectCard key={project.id} project={project} onEdit={() => setEditingId(project.id)} />
              ))}
            </div>
          </details>
        )}
      </div>

      <ProjectForm key={editingProject?.id ?? "new"} project={editingProject} onCancel={() => setEditingId(null)} />
    </section>
  );
}

function ProjectCard({ project, onEdit }: { project: ProjectRecord; onEdit: () => void }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);

  async function submitLifecycle(action: (formData: FormData) => Promise<ProjectActionResult>, confirmation?: string) {
    const formData = new FormData();
    formData.set("projectId", project.id);
    if (confirmation) formData.set("confirmation", confirmation);
    const result = await action(formData);
    if (!result.ok) setMessage(result.error ?? "Operation failed.");
    else router.refresh();
  }

  return (
    <article className="border bg-[var(--card)] p-4" aria-label={project.name}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{project.name}</h3>
            <span className="border px-2 py-0.5 text-xs">{displayLabel(project.status)}</span>
            {project.priority && <span className="text-xs text-[var(--muted-foreground)]">{displayLabel(project.priority)}</span>}
          </div>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {project.startDate ?? "No start date"} — {project.deadline ?? "No deadline"} · Work {project.workProgress}%
          </p>
          {project.tags.length > 0 && <p className="mt-2 text-xs text-[var(--muted-foreground)]">Tags: {project.tags.join(", ")}</p>}
          {project.links.length > 0 && <p className="mt-1 text-xs text-[var(--muted-foreground)]">Link: {project.links[0].title}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={onEdit}><Pencil aria-hidden="true" /> Edit</Button>
          {project.archivedAt ? (
            <Button size="sm" variant="outline" onClick={() => void submitLifecycle(restoreProjectAction)}><ArchiveRestore aria-hidden="true" /> Restore</Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => void submitLifecycle(archiveProjectAction)}><Archive aria-hidden="true" /> Archive</Button>
          )}
          <Button
            size="sm"
            variant="destructive"
            onClick={() => {
              if (window.confirm(`Permanently delete “${project.name}” and all of its local tasks, milestones, documents, history, tags, and links?`)) {
                void submitLifecycle(deleteProjectAction, "DELETE");
              }
            }}
          >
            <Trash2 aria-hidden="true" /> Delete
          </Button>
        </div>
      </div>
      {message && <p className="mt-3 text-sm text-[var(--destructive)]" role="alert">{message}</p>}
    </article>
  );
}

function ProjectForm({ project, onCancel }: { project: ProjectRecord | null; onCancel: () => void }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(project ? updateProjectAction : createProjectAction, INITIAL_ACTION_STATE);

  useEffect(() => {
    if (state.ok) {
      router.refresh();
      onCancel();
    }
  }, [onCancel, router, state.ok]);

  return (
    <form action={formAction} className="h-fit border bg-[var(--card)] p-5" encType="multipart/form-data">
      {project && <input type="hidden" name="projectId" value={project.id} />}
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">{project ? "Edit project" : "New project"}</h2>
        {project && <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>}
      </div>
      <div className="mt-5 grid gap-4">
        <Field label="Name" required><input name="name" required maxLength={160} defaultValue={project?.name} className="field" /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Status"><select name="status" defaultValue={project?.status ?? "pitch"} className="field">{PROJECT_STATUSES.map((value) => <option key={value} value={value}>{displayLabel(value)}</option>)}</select></Field>
          <Field label="Type"><select name="type" defaultValue={project?.type ?? ""} className="field"><option value="">Unspecified</option>{PROJECT_TYPES.map((value) => <option key={value} value={value}>{displayLabel(value)}</option>)}</select></Field>
          <Field label="Start date"><input name="startDate" type="date" defaultValue={project?.startDate ?? ""} className="field" /></Field>
          <Field label="Deadline"><input name="deadline" type="date" defaultValue={project?.deadline ?? ""} className="field" /></Field>
          <Field label="Work progress"><input name="workProgress" type="number" min="0" max="100" step="1" required defaultValue={project?.workProgress ?? 0} className="field" /></Field>
          <Field label="Priority"><select name="priority" defaultValue={project?.priority ?? ""} className="field"><option value="">Unspecified</option>{PROJECT_PRIORITIES.map((value) => <option key={value} value={value}>{displayLabel(value)}</option>)}</select></Field>
        </div>
        <Field label="Client"><input name="clientName" maxLength={160} defaultValue={project?.clientName ?? ""} className="field" /></Field>
        <Field label="Description"><textarea name="description" maxLength={5000} defaultValue={project?.description ?? ""} className="field min-h-20" /></Field>
        <Field label="Tags"><input name="tags" maxLength={600} defaultValue={project?.tags.join(", ") ?? ""} placeholder="portfolio, client" className="field" /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Link title"><input name="linkTitle" maxLength={160} defaultValue={project?.links[0]?.title ?? ""} className="field" /></Field>
          <Field label="Link URL"><input name="linkUrl" type="url" maxLength={2048} defaultValue={project?.links[0]?.url ?? ""} className="field" /></Field>
          <Field label="Link type"><select name="linkType" defaultValue={project?.links[0]?.type ?? "custom"} className="field">{LINK_TYPES.map((value) => <option key={value} value={value}>{displayLabel(value)}</option>)}</select></Field>
          <Field label="Color"><input name="color" type="color" defaultValue={project?.color ?? "#3b82f6"} className="field h-9 p-1" /></Field>
        </div>
        <Field label="Cover"><select name="coverMode" defaultValue={project?.coverMode ?? "none"} className="field">{COVER_MODES.map((value) => <option key={value} value={value}>{displayLabel(value)}</option>)}</select></Field>
        <Field label="Local cover image"><input name="coverImage" type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="block w-full text-sm" /></Field>
        {state.error && <p className="text-sm text-[var(--destructive)]" role="alert">{state.error}</p>}
        <Button type="submit" disabled={pending}><Plus aria-hidden="true" /> {pending ? "Saving…" : project ? "Save project" : "Create project"}</Button>
      </div>
    </form>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label className="grid gap-1.5 text-sm font-medium">{label}{required && " *"}{children}</label>;
}
