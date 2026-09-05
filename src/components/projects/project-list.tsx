"use client";

import { ArrowDown, ArrowDownUp, ArrowUp, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { ProjectDrawer } from "@/components/projects/kanban-board";
import { matchesProjectSearch } from "@/lib/projects/search";
import { PROJECT_PRIORITIES, PROJECT_STATUSES, PROJECT_TYPES, type ProjectRecord } from "@/lib/projects/types";

type SortKey = "name" | "status" | "deadline" | "progress" | "updated";

function displayLabel(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function sortValue(project: ProjectRecord, key: SortKey) {
  if (key === "name") return project.name.toLocaleLowerCase();
  if (key === "status") return project.status;
  if (key === "deadline") return project.deadline ?? "9999-12-31";
  if (key === "progress") return String(project.workProgress).padStart(3, "0");
  return project.updatedAt;
}

export function ProjectList({ projects }: { projects: ProjectRecord[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [priority, setPriority] = useState("");
  const [sort, setSort] = useState<SortKey>("updated");
  const [descending, setDescending] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const selected = projects.find((project) => project.id === editingId) ?? null;
  const visible = useMemo(() => {
    return projects.filter((project) => !project.archivedAt).filter((project) => {
      return matchesProjectSearch(project, query) && (!status || project.status === status) && (!type || project.type === type) && (!priority || project.priority === priority);
    }).sort((left, right) => {
      const result = sortValue(left, sort).localeCompare(sortValue(right, sort));
      return descending ? -result : result;
    });
  }, [descending, priority, projects, query, sort, status, type]);

  function nextSort(key: SortKey) {
    if (sort === key) setDescending((value) => !value);
    else { setSort(key); setDescending(key === "updated" || key === "progress"); }
  }

  return <section className="mt-8" aria-labelledby="list-title">
    <div className="border-b pb-5"><p className="text-xs font-medium text-[var(--muted-foreground)]">Portfolio data</p><h2 id="list-title" className="mt-1 text-2xl font-semibold tracking-tight">List</h2><p className="mt-1 text-sm text-[var(--muted-foreground)]">Find, compare and open your projects.</p></div>
    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(16rem,1fr)_10rem_10rem_10rem]">
      <label className="relative block"><span className="sr-only">Search local projects, work, tags, or links</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" aria-hidden="true" /><input className="field pl-9" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects, work, tags, or links" /></label>
      <label><span className="sr-only">Filter by status</span><select className="field" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option>{PROJECT_STATUSES.map((value) => <option key={value} value={value}>{displayLabel(value)}</option>)}</select></label>
      <label><span className="sr-only">Filter by type</span><select className="field" value={type} onChange={(event) => setType(event.target.value)}><option value="">All types</option>{PROJECT_TYPES.map((value) => <option key={value} value={value}>{displayLabel(value)}</option>)}</select></label>
      <label><span className="sr-only">Filter by priority</span><select className="field" value={priority} onChange={(event) => setPriority(event.target.value)}><option value="">All priorities</option>{PROJECT_PRIORITIES.map((value) => <option key={value} value={value}>{displayLabel(value)}</option>)}</select></label>
    </div>
    <div className="relative mt-5 overflow-x-auto rounded-lg border"><table className="w-full min-w-[55rem] border-collapse text-left text-sm"><thead className="bg-[var(--muted)] text-xs text-[var(--muted-foreground)]"><tr><Heading label="Project" sort="name" active={sort} descending={descending} onSort={nextSort} /><Heading label="Status" sort="status" active={sort} descending={descending} onSort={nextSort} /><Heading label="Deadline" sort="deadline" active={sort} descending={descending} onSort={nextSort} /><Heading label="Work" sort="progress" active={sort} descending={descending} onSort={nextSort} /><th className="px-4 py-3">Tasks</th><Heading label="Updated" sort="updated" active={sort} descending={descending} onSort={nextSort} /></tr></thead><tbody>{visible.map((project) => { const done = project.tasks.filter((task) => task.status === "done").length; return <tr key={project.id} className="border-t hover:bg-[var(--muted)]/60"><td className="px-4 py-3"><Button variant="ghost" size="sm" className="h-auto min-h-8 justify-start rounded-none border-0 bg-transparent p-0 text-left font-medium underline-offset-4 hover:bg-transparent hover:underline" onClick={() => setEditingId(project.id)}>{project.name}</Button><div className="mt-1 text-xs text-[var(--muted-foreground)]">{project.clientName ?? project.type ?? "Unspecified"}</div></td><td className="px-4 py-3">{displayLabel(project.status)}</td><td className="px-4 py-3">{project.deadline ?? "—"}</td><td className="px-4 py-3 tabular-nums">{project.workProgress}%</td><td className="px-4 py-3 tabular-nums">{done}/{project.tasks.length}</td><td className="px-4 py-3 text-xs text-[var(--muted-foreground)]">{new Date(project.updatedAt).toLocaleDateString()}</td></tr>; })}</tbody></table></div>
    {visible.length === 0 && <p className="mt-5 border border-dashed p-5 text-sm text-[var(--muted-foreground)]">No projects match these filters.</p>}
    <ProjectDrawer open={editingId !== null} project={selected} onClose={() => setEditingId(null)} />
  </section>;
}

function Heading({ label, sort, active, descending, onSort }: { label: string; sort: SortKey; active: SortKey; descending: boolean; onSort: (key: SortKey) => void }) {
  const SortIcon = active === sort ? descending ? ArrowDown : ArrowUp : ArrowDownUp;
  return <th aria-sort={active === sort ? descending ? "descending" : "ascending" : undefined} className="px-4 py-3 font-medium"><Button size="sm" variant="ghost" className="h-auto min-h-6 gap-1 rounded-none border-0 bg-transparent p-0 text-xs font-medium" onClick={() => onSort(sort)}>{label}<SortIcon className={`size-3 ${active === sort ? "text-[var(--foreground)]" : ""}`} aria-hidden="true" /><span className="sr-only">{active === sort ? descending ? "sorted descending" : "sorted ascending" : "sort"}</span></Button></th>;
}
