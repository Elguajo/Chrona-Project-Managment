"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Check, FileText, Flag, Plus, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  createDocumentAction,
  createMilestoneAction,
  createTaskAction,
  deleteDocumentAction,
  deleteMilestoneAction,
  deleteTaskAction,
  toggleMilestoneAction,
  updateDocumentAction,
  updateTaskAction,
} from "@/app/actions/workspace";
import { Button } from "@/components/ui/button";
import { TASK_STATUSES, type ProjectActionResult, type ProjectRecord } from "@/lib/projects/types";

function displayLabel(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

type WorkspaceAction = (formData: FormData) => Promise<ProjectActionResult>;

export function ProjectWorkspace({ project }: { project: ProjectRecord }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const readOnly = Boolean(project.archivedAt);

  function execute(action: WorkspaceAction, formData: FormData, success: string, reset?: HTMLFormElement) {
    setMessage(null);
    startTransition(async () => {
      const result = await action(formData);
      if (!result.ok) {
        setMessage(result.error ?? "Could not save the project workspace.");
        return;
      }
      reset?.reset();
      setMessage(success);
      router.refresh();
    });
  }

  function submit(action: WorkspaceAction, success: string) {
    return (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = event.currentTarget;
      execute(action, new FormData(form), success, form.dataset.reset === "true" ? form : undefined);
    };
  }

  function remove(action: WorkspaceAction, formData: FormData, label: string) {
    if (window.confirm(`Delete ${label}? This cannot be undone.`)) execute(action, formData, `${label} deleted.`);
  }

  return (
    <section className="mt-8 border-t pt-6" aria-labelledby="project-workspace-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[var(--accent)]">Project workspace</p>
          <h3 id="project-workspace-title" className="mt-1 text-lg font-semibold">Tasks, milestones, and documents</h3>
        </div>
        <span className="text-xs text-[var(--muted-foreground)]">
          {project.tasks.length} tasks · {project.milestones.length} milestones · {project.documents.length} documents
        </span>
      </div>
      {readOnly && <p className="mt-4 text-sm text-[var(--muted-foreground)]">Restore this project before editing its workspace.</p>}
      {message && <p className="mt-4 text-sm text-[var(--muted-foreground)]" role="status">{message}</p>}

      <div className="mt-6 grid gap-7">
        <WorkspaceBlock icon={Check} title="Tasks" description="Lightweight actions owned by this project.">
          <form data-reset="true" onSubmit={submit(createTaskAction, "Task added.")} className="grid gap-3 rounded border bg-[var(--muted)] p-3 sm:grid-cols-2" aria-label="Add task">
            <input type="hidden" name="projectId" value={project.id} />
            <Field label="Task title"><input name="title" required maxLength={240} className="field" disabled={readOnly || pending} /></Field>
            <Field label="Status"><select name="status" defaultValue="todo" className="field" disabled={readOnly || pending}>{TASK_STATUSES.map((status) => <option key={status} value={status}>{displayLabel(status)}</option>)}</select></Field>
            <Field label="Due date"><input name="dueDate" type="date" className="field" disabled={readOnly || pending} /></Field>
            <Field label="Detail"><input name="detail" maxLength={5000} className="field" disabled={readOnly || pending} /></Field>
            <Button type="submit" size="sm" disabled={readOnly || pending} className="sm:col-span-2"><Plus aria-hidden="true" /> Add task</Button>
          </form>
          <div className="mt-3 grid gap-3">
            {project.tasks.length === 0 ? <Empty>Nothing to do yet.</Empty> : project.tasks.map((task) => (
              <form key={task.id} onSubmit={submit(updateTaskAction, "Task saved.")} className="grid gap-3 border p-3 sm:grid-cols-[minmax(0,1fr)_9rem_8rem_auto]">
                <input type="hidden" name="projectId" value={project.id} />
                <input type="hidden" name="taskId" value={task.id} />
                <Field label="Task"><input name="title" required maxLength={240} defaultValue={task.title} className="field" disabled={readOnly || pending} /></Field>
                <Field label="Status"><select name="status" defaultValue={task.status} className="field" disabled={readOnly || pending}>{TASK_STATUSES.map((status) => <option key={status} value={status}>{displayLabel(status)}</option>)}</select></Field>
                <Field label="Due"><input name="dueDate" type="date" defaultValue={task.dueDate ?? ""} className="field" disabled={readOnly || pending} /></Field>
                <div className="flex items-end gap-2"><Button type="submit" size="sm" variant="outline" disabled={readOnly || pending}><Save aria-hidden="true" /> Save</Button><Button type="button" size="sm" variant="destructive" disabled={readOnly || pending} onClick={() => remove(deleteTaskAction, formData(project.id, "taskId", task.id), `task “${task.title}”`)}><Trash2 aria-hidden="true" /><span className="sr-only">Delete task</span></Button></div>
                <Field label="Detail" className="sm:col-span-4"><input name="detail" maxLength={5000} defaultValue={task.detail ?? ""} className="field" disabled={readOnly || pending} /></Field>
              </form>
            ))}
          </div>
        </WorkspaceBlock>

        <WorkspaceBlock icon={Flag} title="Milestones" description="Dated checkpoints for the project timeline.">
          <form data-reset="true" onSubmit={submit(createMilestoneAction, "Milestone added.")} className="grid gap-3 rounded border bg-[var(--muted)] p-3 sm:grid-cols-[minmax(0,1fr)_11rem_auto]" aria-label="Add milestone">
            <input type="hidden" name="projectId" value={project.id} />
            <Field label="Milestone"><input name="title" required maxLength={240} className="field" disabled={readOnly || pending} /></Field>
            <Field label="Date"><input name="targetDate" type="date" required className="field" disabled={readOnly || pending} /></Field>
            <div className="flex items-end"><Button type="submit" size="sm" disabled={readOnly || pending}><Plus aria-hidden="true" /> Add</Button></div>
          </form>
          <div className="mt-3 grid gap-2">
            {project.milestones.length === 0 ? <Empty>No milestones yet.</Empty> : project.milestones.map((milestone) => (
              <div key={milestone.id} className="flex flex-wrap items-center justify-between gap-3 border p-3">
                <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={Boolean(milestone.completedAt)} disabled={readOnly || pending} onChange={(event) => { const data = formData(project.id, "milestoneId", milestone.id); data.set("completed", String(event.target.checked)); execute(toggleMilestoneAction, data, event.target.checked ? "Milestone completed." : "Milestone reopened."); }} /><span className={milestone.completedAt ? "line-through text-[var(--muted-foreground)]" : ""}>{milestone.title}</span></label>
                <div className="flex items-center gap-3"><time className="text-xs text-[var(--muted-foreground)]">{milestone.targetDate}</time><Button type="button" size="sm" variant="destructive" disabled={readOnly || pending} onClick={() => remove(deleteMilestoneAction, formData(project.id, "milestoneId", milestone.id), `milestone “${milestone.title}”`)}><Trash2 aria-hidden="true" /><span className="sr-only">Delete milestone</span></Button></div>
              </div>
            ))}
          </div>
        </WorkspaceBlock>

        <WorkspaceBlock icon={FileText} title="Documents" description="Local text notes; use project links for external files and references.">
          <form data-reset="true" onSubmit={submit(createDocumentAction, "Document created.")} className="grid gap-3 rounded border bg-[var(--muted)] p-3" aria-label="Create document">
            <input type="hidden" name="projectId" value={project.id} />
            <Field label="Document title"><input name="title" required maxLength={240} className="field" disabled={readOnly || pending} /></Field>
            <Field label="Content"><textarea name="content" maxLength={50000} className="field min-h-24" disabled={readOnly || pending} /></Field>
            <div><Button type="submit" size="sm" disabled={readOnly || pending}><Plus aria-hidden="true" /> Create document</Button></div>
          </form>
          <div className="mt-3 grid gap-3">
            {project.documents.length === 0 ? <Empty>No local documents yet.</Empty> : project.documents.map((document) => (
              <form key={document.id} onSubmit={submit(updateDocumentAction, "Document saved.")} className="grid gap-3 border p-3">
                <input type="hidden" name="projectId" value={project.id} />
                <input type="hidden" name="documentId" value={document.id} />
                <Field label="Title"><input name="title" required maxLength={240} defaultValue={document.title} className="field" disabled={readOnly || pending} /></Field>
                <Field label="Content"><textarea name="content" maxLength={50000} defaultValue={document.content} className="field min-h-28" disabled={readOnly || pending} /></Field>
                <div className="flex flex-wrap items-center justify-between gap-2"><time className="text-xs text-[var(--muted-foreground)]">Updated {new Date(document.updatedAt).toLocaleString()}</time><div className="flex gap-2"><Button type="submit" size="sm" variant="outline" disabled={readOnly || pending}><Save aria-hidden="true" /> Save</Button><Button type="button" size="sm" variant="destructive" disabled={readOnly || pending} onClick={() => remove(deleteDocumentAction, formData(project.id, "documentId", document.id), `document “${document.title}”`)}><Trash2 aria-hidden="true" /> Delete</Button></div></div>
              </form>
            ))}
          </div>
        </WorkspaceBlock>
      </div>
    </section>
  );
}

function formData(projectId: string, key?: string, value?: string) {
  const data = new FormData();
  data.set("projectId", projectId);
  if (key && value) data.set(key, value);
  return data;
}

function WorkspaceBlock({ icon: Icon, title, description, children }: { icon: typeof Check; title: string; description: string; children: React.ReactNode }) {
  return <section aria-label={title}><div className="flex items-center gap-2"><Icon className="size-4 text-[var(--accent)]" aria-hidden="true" /><h4 className="font-semibold">{title}</h4></div><p className="mt-1 text-sm text-[var(--muted-foreground)]">{description}</p><div className="mt-3">{children}</div></section>;
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return <label className={`grid gap-1.5 text-sm font-medium ${className ?? ""}`}>{label}{children}</label>;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="border border-dashed p-3 text-sm text-[var(--muted-foreground)]">{children}</p>;
}
