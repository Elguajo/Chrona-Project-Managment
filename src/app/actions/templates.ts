"use server";

import { revalidatePath } from "next/cache";

import { projectActionResult } from "@/lib/projects/server";
import type { ProjectActionResult } from "@/lib/projects/types";
import { createTemplate, deleteTemplate, duplicateTemplate, updateTemplate } from "@/lib/templates/server";

function complete(): ProjectActionResult {
  revalidatePath("/");
  return { ok: true };
}

export async function createTemplateAction(formData: FormData): Promise<ProjectActionResult> {
  try {
    createTemplate(formData);
    return complete();
  } catch (error) {
    return projectActionResult(error);
  }
}

export async function updateTemplateAction(formData: FormData): Promise<ProjectActionResult> {
  try {
    const templateId = formData.get("templateId");
    if (typeof templateId !== "string" || !templateId) return { ok: false, error: "Template identifier is missing." };
    updateTemplate(templateId, formData);
    return complete();
  } catch (error) {
    return projectActionResult(error);
  }
}

export async function duplicateTemplateAction(formData: FormData): Promise<ProjectActionResult> {
  try {
    const templateId = formData.get("templateId");
    if (typeof templateId !== "string" || !templateId) return { ok: false, error: "Template identifier is missing." };
    duplicateTemplate(templateId);
    return complete();
  } catch (error) {
    return projectActionResult(error);
  }
}

export async function deleteTemplateAction(formData: FormData): Promise<ProjectActionResult> {
  try {
    const templateId = formData.get("templateId");
    if (typeof templateId !== "string" || !templateId) return { ok: false, error: "Template identifier is missing." };
    deleteTemplate(templateId);
    return complete();
  } catch (error) {
    return projectActionResult(error);
  }
}
