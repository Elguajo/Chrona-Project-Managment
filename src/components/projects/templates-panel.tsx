"use client";

import { Copy, FileText, Flag, LayoutTemplate, Pencil, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  createTemplateAction,
  deleteTemplateAction,
  duplicateTemplateAction,
  updateTemplateAction,
} from "@/app/actions/templates";
import { Button } from "@/components/ui/button";
import {
  PROJECT_PRIORITIES,
  PROJECT_STATUSES,
  PROJECT_TYPES,
  TASK_STATUSES,
  type ProjectActionResult,
  type ProjectTemplateDraft,
  type ProjectTemplateRecord,
} from "@/lib/projects/types";

const EMPTY_DRAFT: ProjectTemplateDraft = {
  name: "",
  description: "",
  type: "",
  status: "planning",
  priority: "",
  color: "#3b82f6",
  tags: "",
  tasks: [],
  milestones: [],
  documents: [],
};

function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function draftFrom(template: ProjectTemplateRecord): ProjectTemplateDraft {
  return {
    name: template.name,
    description: template.description ?? "",
    type: template.type ?? "",
    status: template.status,
    priority: template.priority ?? "",
    color: template.color ?? "#3b82f6",
    tags: template.tags.join(", "),
    tasks: template.tasks.map((task) => ({ title: task.title, detail: task.detail ?? "", status: task.status, dueOffsetDays: task.dueOffsetDays })),
    milestones: template.milestones.map((milestone) => ({ title: milestone.title, targetOffsetDays: milestone.targetOffsetDays })),
    documents: template.documents.map((document) => ({ title: document.title, content: document.content })),
  };
}

export function TemplatesPanel({ templates }: { templates: ProjectTemplateRecord[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<ProjectTemplateDraft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: (formData: FormData) => Promise<ProjectActionResult>, formData: FormData, success: string) {
    setMessage(null);
    startTransition(async () => {
      const result = await action(formData);
      if (!result.ok) {
        setMessage(result.error ?? "Could not save the template.");
        return;
      }
      setMessage(success);
      setDraft(null);
      setEditingId(null);
      router.refresh();
    });
  }

  function save() {
    if (!draft) return;
    const formData = new FormData();
    formData.set("templatePayload", JSON.stringify(draft));
    if (editingId) formData.set("templateId", editingId);
    run(editingId ? updateTemplateAction : createTemplateAction, formData, editingId ? "Template updated." : "Template created.");
  }

  function duplicate(templateId: string) {
    const formData = new FormData();
    formData.set("templateId", templateId);
    run(duplicateTemplateAction, formData, "Template duplicated. You can now edit the personal copy.");
  }

  function remove(template: ProjectTemplateRecord) {
    if (!window.confirm(`Delete template “${template.name}”? This cannot be undone.`)) return;
    const formData = new FormData();
    formData.set("templateId", template.id);
    run(deleteTemplateAction, formData, "Template deleted.");
  }

  return <section className="mt-8" aria-labelledby="templates-title">
    <div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-sm font-medium text-[var(--accent)]">Reusable structures</p>
        <h2 id="templates-title" className="mt-1 text-2xl font-semibold tracking-tight">Project templates</h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">Start a local project with ready tasks, dated milestones, and a document.</p>
      </div>
      <Button onClick={() => { setDraft({ ...EMPTY_DRAFT, tasks: [], milestones: [], documents: [] }); setEditingId(null); }}><Plus aria-hidden="true" /> New template</Button>
    </div>

    {message && <p className="mt-4 text-sm text-[var(--muted-foreground)]" role="status">{message}</p>}

    {draft && <TemplateEditor draft={draft} setDraft={setDraft} pending={pending} isEditing={Boolean(editingId)} onCancel={() => { setDraft(null); setEditingId(null); }} onSave={save} />}

    <div className="mt-6 grid gap-4 lg:grid-cols-2">
      {templates.map((template) => <article key={template.id} className="border bg-[var(--card)] p-5">
        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-semibold">{template.name}</h3>{template.isStarter && <span className="border px-2 py-0.5 text-xs">Starter</span>}</div><p className="mt-1 text-sm text-[var(--muted-foreground)]">{template.description ?? "No description."}</p></div><span className="mt-1 size-3 shrink-0 rounded-full" style={{ backgroundColor: template.color ?? "var(--accent)" }} aria-label="Template color" /></div>
        <p className="mt-4 text-xs text-[var(--muted-foreground)]">{template.tasks.length} tasks · {template.milestones.length} milestones · {template.documents.length} documents{template.maxOffsetDays !== null ? ` · ${template.maxOffsetDays} days` : ""}</p>
        {template.tags.length > 0 && <p className="mt-2 text-xs text-[var(--muted-foreground)]">Tags: {template.tags.join(", ")}</p>}
        <details className="mt-4 border-t pt-3"><summary className="cursor-pointer text-sm font-medium">Preview contents</summary><TemplatePreview template={template} /></details>
        <div className="mt-4 flex flex-wrap gap-2">
          {template.isStarter ? <Button size="sm" variant="outline" disabled={pending} onClick={() => duplicate(template.id)}><Copy aria-hidden="true" /> Duplicate</Button> : <><Button size="sm" variant="outline" disabled={pending} onClick={() => { setDraft(draftFrom(template)); setEditingId(template.id); }}><Pencil aria-hidden="true" /> Edit</Button><Button size="sm" variant="destructive" disabled={pending} onClick={() => remove(template)}><Trash2 aria-hidden="true" /> Delete</Button></>}
        </div>
      </article>)}
    </div>
  </section>;
}

function TemplatePreview({ template }: { template: ProjectTemplateRecord }) {
  return <div className="mt-3 grid gap-3 text-sm"><PreviewBlock icon={LayoutTemplate} title="Tasks" rows={template.tasks.map((task) => `${task.title}${task.dueOffsetDays === null ? "" : ` · day ${task.dueOffsetDays}`}`)} /><PreviewBlock icon={Flag} title="Milestones" rows={template.milestones.map((milestone) => `${milestone.title} · day ${milestone.targetOffsetDays}`)} /><PreviewBlock icon={FileText} title="Documents" rows={template.documents.map((document) => document.title)} /></div>;
}

function PreviewBlock({ icon: Icon, title, rows }: { icon: typeof Flag; title: string; rows: string[] }) {
  return <div><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]"><Icon className="size-3.5" aria-hidden="true" /> {title}</p><div className="mt-1 grid gap-1">{rows.length ? rows.map((row) => <p key={row} className="truncate text-sm">{row}</p>) : <p className="text-sm text-[var(--muted-foreground)]">None</p>}</div></div>;
}

function TemplateEditor({ draft, setDraft, pending, isEditing, onCancel, onSave }: { draft: ProjectTemplateDraft; setDraft: React.Dispatch<React.SetStateAction<ProjectTemplateDraft | null>>; pending: boolean; isEditing: boolean; onCancel: () => void; onSave: () => void }) {
  const change = <K extends keyof ProjectTemplateDraft>(key: K, value: ProjectTemplateDraft[K]) => setDraft((current) => current ? { ...current, [key]: value } : current);
  return <form className="mt-6 border bg-[var(--card)] p-5" onSubmit={(event) => { event.preventDefault(); onSave(); }} aria-label={isEditing ? "Edit template" : "New template"}>
    <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-medium text-[var(--accent)]">Personal template</p><h3 className="mt-1 text-lg font-semibold">{isEditing ? "Edit template" : "New template"}</h3></div><Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancel</Button></div>
    <div className="mt-5 grid gap-4"><Field label="Name" required><input autoFocus required maxLength={160} className="field" value={draft.name} onChange={(event) => change("name", event.target.value)} /></Field><Field label="Description"><textarea maxLength={5000} className="field min-h-20" value={draft.description} onChange={(event) => change("description", event.target.value)} /></Field>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Field label="Status"><select className="field" value={draft.status} onChange={(event) => change("status", event.target.value as ProjectTemplateDraft["status"])}>{PROJECT_STATUSES.map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></Field><Field label="Type"><select className="field" value={draft.type} onChange={(event) => change("type", event.target.value as ProjectTemplateDraft["type"])}><option value="">Unspecified</option>{PROJECT_TYPES.map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></Field><Field label="Priority"><select className="field" value={draft.priority} onChange={(event) => change("priority", event.target.value as ProjectTemplateDraft["priority"])}><option value="">Unspecified</option>{PROJECT_PRIORITIES.map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></Field><Field label="Color"><input type="color" className="field h-9 p-1" value={draft.color} onChange={(event) => change("color", event.target.value)} /></Field></div>
      <Field label="Tags"><input maxLength={600} className="field" value={draft.tags} onChange={(event) => change("tags", event.target.value)} placeholder="client, delivery" /></Field>
      <DraftTasks draft={draft} change={change} /><DraftMilestones draft={draft} change={change} /><DraftDocuments draft={draft} change={change} />
      <div className="flex gap-2"><Button type="submit" disabled={pending}>{pending ? "Saving…" : isEditing ? "Save template" : "Create template"}</Button><Button type="button" variant="outline" onClick={onCancel}>Cancel</Button></div>
    </div>
  </form>;
}

function DraftTasks({ draft, change }: { draft: ProjectTemplateDraft; change: <K extends keyof ProjectTemplateDraft>(key: K, value: ProjectTemplateDraft[K]) => void }) {
  return <section className="border p-4"><div className="flex items-center justify-between gap-3"><h4 className="font-semibold">Tasks</h4><Button type="button" size="sm" variant="outline" onClick={() => change("tasks", [...draft.tasks, { title: "", detail: "", status: "todo", dueOffsetDays: null }])}><Plus aria-hidden="true" /> Add task</Button></div><div className="mt-4 grid gap-3">{draft.tasks.map((task, index) => <div key={index} className="grid gap-3 border p-3 lg:grid-cols-[minmax(0,1fr)_8rem_7rem_auto]"><Field label="Title"><input required maxLength={240} className="field" value={task.title} onChange={(event) => change("tasks", draft.tasks.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item))} /></Field><Field label="Status"><select className="field" value={task.status} onChange={(event) => change("tasks", draft.tasks.map((item, itemIndex) => itemIndex === index ? { ...item, status: event.target.value as typeof item.status } : item))}>{TASK_STATUSES.map((status) => <option key={status} value={status}>{label(status)}</option>)}</select></Field><Field label="Due day"><input type="number" min="0" max="3660" className="field" value={task.dueOffsetDays ?? ""} onChange={(event) => change("tasks", draft.tasks.map((item, itemIndex) => itemIndex === index ? { ...item, dueOffsetDays: event.target.value === "" ? null : Number(event.target.value) } : item))} /></Field><div className="flex items-end"><Button type="button" size="sm" variant="destructive" onClick={() => change("tasks", draft.tasks.filter((_, itemIndex) => itemIndex !== index))}><Trash2 aria-hidden="true" /><span className="sr-only">Delete task</span></Button></div><Field label="Detail" className="lg:col-span-4"><input maxLength={5000} className="field" value={task.detail} onChange={(event) => change("tasks", draft.tasks.map((item, itemIndex) => itemIndex === index ? { ...item, detail: event.target.value } : item))} /></Field></div>)}</div></section>;
}

function DraftMilestones({ draft, change }: { draft: ProjectTemplateDraft; change: <K extends keyof ProjectTemplateDraft>(key: K, value: ProjectTemplateDraft[K]) => void }) {
  return <section className="border p-4"><div className="flex items-center justify-between gap-3"><h4 className="font-semibold">Milestones</h4><Button type="button" size="sm" variant="outline" onClick={() => change("milestones", [...draft.milestones, { title: "", targetOffsetDays: 0 }])}><Plus aria-hidden="true" /> Add milestone</Button></div><div className="mt-4 grid gap-3">{draft.milestones.map((milestone, index) => <div key={index} className="grid gap-3 border p-3 sm:grid-cols-[minmax(0,1fr)_8rem_auto]"><Field label="Title"><input required maxLength={240} className="field" value={milestone.title} onChange={(event) => change("milestones", draft.milestones.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item))} /></Field><Field label="Target day"><input required type="number" min="0" max="3660" className="field" value={milestone.targetOffsetDays} onChange={(event) => change("milestones", draft.milestones.map((item, itemIndex) => itemIndex === index ? { ...item, targetOffsetDays: Number(event.target.value) } : item))} /></Field><div className="flex items-end"><Button type="button" size="sm" variant="destructive" onClick={() => change("milestones", draft.milestones.filter((_, itemIndex) => itemIndex !== index))}><Trash2 aria-hidden="true" /><span className="sr-only">Delete milestone</span></Button></div></div>)}</div></section>;
}

function DraftDocuments({ draft, change }: { draft: ProjectTemplateDraft; change: <K extends keyof ProjectTemplateDraft>(key: K, value: ProjectTemplateDraft[K]) => void }) {
  return <section className="border p-4"><div className="flex items-center justify-between gap-3"><h4 className="font-semibold">Documents</h4><Button type="button" size="sm" variant="outline" onClick={() => change("documents", [...draft.documents, { title: "", content: "" }])}><Plus aria-hidden="true" /> Add document</Button></div><div className="mt-4 grid gap-3">{draft.documents.map((document, index) => <div key={index} className="grid gap-3 border p-3"><div className="flex gap-3"><Field label="Title" className="min-w-0 flex-1"><input required maxLength={240} className="field" value={document.title} onChange={(event) => change("documents", draft.documents.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item))} /></Field><div className="flex items-end"><Button type="button" size="sm" variant="destructive" onClick={() => change("documents", draft.documents.filter((_, itemIndex) => itemIndex !== index))}><Trash2 aria-hidden="true" /><span className="sr-only">Delete document</span></Button></div></div><Field label="Content"><textarea maxLength={50000} className="field min-h-20" value={document.content} onChange={(event) => change("documents", draft.documents.map((item, itemIndex) => itemIndex === index ? { ...item, content: event.target.value } : item))} /></Field></div>)}</div></section>;
}

function Field({ label, required, children, className }: { label: string; required?: boolean; children: React.ReactNode; className?: string }) {
  return <label className={`grid gap-1.5 text-sm font-medium ${className ?? ""}`}>{label}{required && " *"}{children}</label>;
}
