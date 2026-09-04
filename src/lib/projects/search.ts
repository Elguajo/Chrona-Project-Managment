import type { ProjectRecord } from "@/lib/projects/types";

/**
 * Searches the locally loaded Project aggregate. This deliberately performs no
 * I/O: List, Kanban, and Timeline use the same in-memory Project projection.
 */
export function matchesProjectSearch(project: ProjectRecord, query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return true;

  const searchableValues = [
    project.name,
    project.clientName,
    project.description,
    ...project.tags,
    ...project.links.flatMap((link) => [link.type, link.title, link.url]),
    ...project.tasks.flatMap((task) => [task.title, task.detail]),
    ...project.milestones.map((milestone) => milestone.title),
    ...project.documents.flatMap((document) => [document.title, document.content]),
  ];

  return searchableValues
    .filter((value): value is string => Boolean(value))
    .some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
}
