"use server";

import { revalidatePath } from "next/cache";

import {
  archiveProject,
  createProject,
  moveProject,
  permanentlyDeleteProject,
  projectActionResult,
  restoreProject,
  updateProject,
} from "@/lib/projects/server";
import type { ProjectActionResult } from "@/lib/projects/types";
import { PROJECT_STATUSES, type ProjectStatus } from "@/lib/projects/types";

export async function createProjectAction(
  _previous: ProjectActionResult,
  formData: FormData,
): Promise<ProjectActionResult> {
  try {
    await createProject(formData);
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return projectActionResult(error);
  }
}

export async function updateProjectAction(
  _previous: ProjectActionResult,
  formData: FormData,
): Promise<ProjectActionResult> {
  try {
    const projectId = formData.get("projectId");
    if (typeof projectId !== "string" || !projectId) {
      return { ok: false, error: "Project identifier is missing." };
    }
    await updateProject(projectId, formData);
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return projectActionResult(error);
  }
}

export async function archiveProjectAction(formData: FormData): Promise<ProjectActionResult> {
  try {
    const projectId = formData.get("projectId");
    if (typeof projectId !== "string" || !projectId) return { ok: false, error: "Project identifier is missing." };
    archiveProject(projectId);
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return projectActionResult(error);
  }
}

export async function restoreProjectAction(formData: FormData): Promise<ProjectActionResult> {
  try {
    const projectId = formData.get("projectId");
    if (typeof projectId !== "string" || !projectId) return { ok: false, error: "Project identifier is missing." };
    restoreProject(projectId);
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return projectActionResult(error);
  }
}

export async function deleteProjectAction(formData: FormData): Promise<ProjectActionResult> {
  try {
    const projectId = formData.get("projectId");
    const confirmation = formData.get("confirmation");
    if (typeof projectId !== "string" || !projectId || typeof confirmation !== "string") {
      return { ok: false, error: "Project identifier or deletion confirmation is missing." };
    }
    permanentlyDeleteProject(projectId, confirmation);
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return projectActionResult(error);
  }
}

export async function moveProjectAction(formData: FormData): Promise<ProjectActionResult> {
  try {
    const projectId = formData.get("projectId");
    const toStatus = formData.get("toStatus");
    const beforeProjectId = formData.get("beforeProjectId");
    if (typeof projectId !== "string" || !projectId || typeof toStatus !== "string" || !PROJECT_STATUSES.includes(toStatus as ProjectStatus)) {
      return { ok: false, error: "Project identifier or destination status is invalid." };
    }
    if (beforeProjectId !== null && (typeof beforeProjectId !== "string" || !beforeProjectId)) {
      return { ok: false, error: "The drop target is invalid." };
    }
    moveProject(projectId, toStatus as ProjectStatus, beforeProjectId);
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return projectActionResult(error);
  }
}
