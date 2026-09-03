"use server";

import { revalidatePath } from "next/cache";

import { projectActionResult } from "@/lib/projects/server";
import type { ProjectActionResult } from "@/lib/projects/types";
import {
  createDocument,
  createMilestone,
  createTask,
  deleteDocument,
  deleteMilestone,
  deleteTask,
  toggleMilestone,
  updateDocument,
  updateTask,
} from "@/lib/workspace/server";

function ids(formData: FormData, childName?: string) {
  const projectId = formData.get("projectId");
  const childId = childName ? formData.get(childName) : null;
  if (typeof projectId !== "string" || !projectId || (childName && (typeof childId !== "string" || !childId))) {
    throw new Error("Required workspace identifier is missing.");
  }
  return { projectId, childId: childId as string | null };
}

async function run(action: () => void): Promise<ProjectActionResult> {
  try {
    action();
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return projectActionResult(error);
  }
}

export async function createTaskAction(formData: FormData) {
  return run(() => {
    const { projectId } = ids(formData);
    createTask(projectId, formData);
  });
}

export async function updateTaskAction(formData: FormData) {
  return run(() => {
    const { projectId, childId } = ids(formData, "taskId");
    updateTask(projectId, childId!, formData);
  });
}

export async function deleteTaskAction(formData: FormData) {
  return run(() => {
    const { projectId, childId } = ids(formData, "taskId");
    deleteTask(projectId, childId!);
  });
}

export async function createMilestoneAction(formData: FormData) {
  return run(() => {
    const { projectId } = ids(formData);
    createMilestone(projectId, formData);
  });
}

export async function toggleMilestoneAction(formData: FormData) {
  return run(() => {
    const { projectId, childId } = ids(formData, "milestoneId");
    toggleMilestone(projectId, childId!, formData.get("completed") === "true");
  });
}

export async function deleteMilestoneAction(formData: FormData) {
  return run(() => {
    const { projectId, childId } = ids(formData, "milestoneId");
    deleteMilestone(projectId, childId!);
  });
}

export async function createDocumentAction(formData: FormData) {
  return run(() => {
    const { projectId } = ids(formData);
    createDocument(projectId, formData);
  });
}

export async function updateDocumentAction(formData: FormData) {
  return run(() => {
    const { projectId, childId } = ids(formData, "documentId");
    updateDocument(projectId, childId!, formData);
  });
}

export async function deleteDocumentAction(formData: FormData) {
  return run(() => {
    const { projectId, childId } = ids(formData, "documentId");
    deleteDocument(projectId, childId!);
  });
}
