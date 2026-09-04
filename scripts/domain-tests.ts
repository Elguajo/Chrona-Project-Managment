import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const testDirectory = mkdtempSync(path.join(tmpdir(), "local-project-os-domain-test-"));
process.env.PROJECT_OS_DATA_DIR = testDirectory;

function projectForm(overrides: Record<string, string> = {}) {
  const form = new FormData();
  const values = {
    name: "Website refresh",
    status: "active",
    type: "client",
    startDate: "2026-01-10",
    deadline: "2026-02-10",
    workProgress: "45",
    priority: "high",
    clientName: "Acme",
    description: "A local persisted project.",
    tags: "client, website",
    linkTitle: "Design file",
    linkUrl: "https://example.com/design",
    linkType: "figma",
    color: "#3b82f6",
    coverMode: "none",
    ...overrides,
  };
  for (const [key, value] of Object.entries(values)) form.set(key, value);
  return form;
}

async function expectValidation(operation: () => Promise<unknown>) {
  await assert.rejects(operation, { name: "ProjectValidationError" });
}

async function main() {
  try {
    const { getDatabase } = await import("../src/lib/db/connection");
    const { projectActivity, projectDocuments, projectLinks, projectMilestones, projectStatusHistory, projectTags, projectTasks, projectTemplates, projects } = await import(
      "../src/lib/db/schema"
    );
    const {
      ProjectValidationError,
      archiveProject,
      createProject,
      getProjectWorkspace,
      getProjects,
      getKanbanProjects,
      moveProject,
      permanentlyDeleteProject,
      restoreProject,
      updateProject,
    } = await import("../src/lib/projects/server");
    const { eq } = await import("drizzle-orm");
    const { PROJECT_STATUSES } = await import("../src/lib/projects/types");
    const { createDocument, createMilestone, createTask, deleteDocument, deleteMilestone, deleteTask, toggleMilestone, updateDocument, updateTask } = await import("../src/lib/workspace/server");
    const { createProjectFromTemplate, createTemplate, deleteTemplate, getProjectTemplates, updateTemplate } = await import("../src/lib/templates/server");
    const { clippedRange, dateRange, periodFor, shiftPeriod, timelineProject } = await import("../src/lib/timeline/date");
    const { calendarDates, calendarItems, calendarPeriod, filterCalendarItems, shiftCalendarPeriod } = await import("../src/lib/calendar/calendar");

    await createProject(projectForm());
    const created = getProjects();
    assert.equal(created.length, 1);
    assert.deepEqual(created[0].tags, ["client", "website"]);
    assert.equal(created[0].links[0]?.url, "https://example.com/design");
    assert.equal(created[0].status, "active");

    const taskForm = new FormData();
    taskForm.set("title", "Publish project");
    taskForm.set("detail", "Check the local release notes.");
    taskForm.set("status", "todo");
    taskForm.set("dueDate", "2026-02-09");
    createTask(created[0].id, taskForm);
    let workspaceProject = getProjects().find((project) => project.id === created[0].id);
    assert.equal(workspaceProject?.tasks.length, 1);
    assert.equal(workspaceProject?.tasks[0]?.dueDate, "2026-02-09");

    const updateTaskForm = new FormData();
    updateTaskForm.set("title", "Publish project");
    updateTaskForm.set("detail", "Ready to publish.");
    updateTaskForm.set("status", "done");
    updateTaskForm.set("dueDate", "2026-02-09");
    updateTask(created[0].id, workspaceProject!.tasks[0]!.id, updateTaskForm);
    workspaceProject = getProjects().find((project) => project.id === created[0].id);
    assert.equal(workspaceProject?.tasks[0]?.status, "done");
    assert.ok(workspaceProject?.tasks[0]?.completedAt);

    const milestoneForm = new FormData();
    milestoneForm.set("title", "Approve launch");
    milestoneForm.set("targetDate", "2026-02-10");
    createMilestone(created[0].id, milestoneForm);
    workspaceProject = getProjects().find((project) => project.id === created[0].id);
    assert.equal(workspaceProject?.milestones[0]?.targetDate, "2026-02-10");
    toggleMilestone(created[0].id, workspaceProject!.milestones[0]!.id, true);
    workspaceProject = getProjects().find((project) => project.id === created[0].id);
    assert.ok(workspaceProject?.milestones[0]?.completedAt);

    const documentForm = new FormData();
    documentForm.set("title", "Launch notes");
    documentForm.set("content", "Keep this note local.");
    createDocument(created[0].id, documentForm);
    workspaceProject = getProjects().find((project) => project.id === created[0].id);
    assert.equal(workspaceProject?.documents[0]?.content, "Keep this note local.");
    documentForm.set("content", "Updated local note.");
    updateDocument(created[0].id, workspaceProject!.documents[0]!.id, documentForm);
    assert.equal(getProjects().find((project) => project.id === created[0].id)?.documents[0]?.content, "Updated local note.");
    const standaloneWorkspace = getProjectWorkspace(created[0].id);
    assert.ok(standaloneWorkspace);
    assert.equal(standaloneWorkspace.project.id, created[0].id);
    assert.equal(standaloneWorkspace.project.tasks[0]?.projectId, created[0].id);
    assert.equal(standaloneWorkspace.project.milestones[0]?.projectId, created[0].id);
    assert.equal(standaloneWorkspace.project.documents[0]?.projectId, created[0].id);
    assert.ok(standaloneWorkspace.activity.some((event) => event.type === "document_updated"));
    assert.equal(getProjectWorkspace("missing-project"), null);

    const month = periodFor("2026-02-18", "month");
    assert.deepEqual(month, { start: "2026-02-01", end: "2026-02-28" });
    assert.deepEqual(periodFor("2026-02-18", "quarter"), { start: "2026-01-01", end: "2026-03-31" });
    assert.equal(shiftPeriod("2026-02-18", "month", 1), "2026-03-18");
    assert.equal(dateRange(month.start, month.end).length, 28);
    const projectTiming = timelineProject(getProjects().find((project) => project.id === created[0].id)!, "2026-02-20");
    assert.equal(projectTiming?.displayStart, "2026-01-10");
    assert.equal(projectTiming?.displayEnd, "2026-02-20");
    assert.equal(projectTiming?.metrics.overdueDays, 10);
    assert.deepEqual(clippedRange("2026-02-01", "2026-02-28", month.start, month.end), { left: 0, width: 100 });
    const calendarMonth = calendarPeriod("2026-02-18", "month");
    assert.deepEqual(calendarMonth, { start: "2026-01-26", end: "2026-03-01" });
    assert.equal(calendarDates(calendarMonth).length, 35);
    assert.deepEqual(calendarPeriod("2026-02-18", "week"), { start: "2026-02-16", end: "2026-02-22" });
    assert.equal(shiftCalendarPeriod("2026-01-31", "month", 1), "2026-02-28");

    for (const status of PROJECT_STATUSES) {
      await createProject(projectForm({ name: `Status ${status}`, status }));
    }
    const initialKanbanProjects = getKanbanProjects();
    assert.equal(initialKanbanProjects.length, getProjects().filter((project) => !project.archivedAt).length);
    for (const status of PROJECT_STATUSES) {
      assert.ok(initialKanbanProjects.some((project) => project.status === status));
    }

    await createProject(projectForm({ name: "Ordered active project" }));
    const orderedProject = getProjects().find((project) => project.name === "Ordered active project");
    assert.ok(orderedProject);
    assert.throws(() => updateTask(orderedProject.id, workspaceProject!.tasks[0]!.id, updateTaskForm), ProjectValidationError);
    moveProject(orderedProject.id, "active", created[0].id);
    const activeKanbanProjects = getKanbanProjects().filter((project) => project.status === "active");
    assert.deepEqual(activeKanbanProjects.slice(0, 2).map((project) => project.id), [orderedProject.id, created[0].id]);
    assert.ok(activeKanbanProjects[0].sortOrder !== null);

    const calendarProject = getProjects().find((project) => project.id === orderedProject.id)!;
    const calendarTask = new FormData();
    calendarTask.set("title", "Calendar task"); calendarTask.set("status", "in_progress"); calendarTask.set("dueDate", "2026-02-11");
    createTask(calendarProject.id, calendarTask);
    const completedCalendarTask = new FormData();
    completedCalendarTask.set("title", "Finished calendar task"); completedCalendarTask.set("status", "done"); completedCalendarTask.set("dueDate", "2026-02-11");
    createTask(calendarProject.id, completedCalendarTask);
    const calendarMilestone = new FormData();
    calendarMilestone.set("title", "Calendar milestone"); calendarMilestone.set("targetDate", "2026-02-12");
    createMilestone(calendarProject.id, calendarMilestone);
    const calendarAggregate = calendarItems(getProjects());
    assert.ok(calendarAggregate.some((item) => item.kind === "project" && item.projectId === calendarProject.id && item.date === "2026-02-10"));
    assert.ok(calendarAggregate.some((item) => item.kind === "task" && item.title === "Calendar task"));
    assert.equal(calendarAggregate.some((item) => item.title === "Finished calendar task"), false);
    assert.ok(calendarAggregate.some((item) => item.kind === "milestone" && item.title === "Calendar milestone"));
    assert.deepEqual(filterCalendarItems(calendarAggregate, { kind: "task", projectStatus: "", query: "calendar" }).map((item) => item.title), ["Calendar task"]);
    assert.deepEqual(filterCalendarItems(calendarAggregate, { kind: "", projectStatus: "active", query: "milestone" }).map((item) => item.title), ["Calendar milestone"]);

    moveProject(created[0].id, "completed", null);
    let movedProject = getProjects().find((project) => project.id === created[0].id);
    assert.equal(movedProject?.status, "completed");
    assert.ok(movedProject?.completedAt);
    moveProject(created[0].id, "active", null);
    movedProject = getProjects().find((project) => project.id === created[0].id);
    assert.equal(movedProject?.status, "active");
    assert.equal(movedProject?.completedAt, null);

    const imageForm = projectForm({ name: "Cover asset", coverMode: "image" });
    imageForm.set(
      "coverImage",
      new File([Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10)], "cover.png", {
        type: "image/png",
      }),
    );
    await createProject(imageForm);
    const coveredProject = getProjects().find((project) => project.name === "Cover asset");
    assert.ok(coveredProject?.coverImagePath);
    assert.ok(existsSync(path.join(testDirectory, coveredProject.coverImagePath)));
    await updateProject(coveredProject.id, projectForm({ name: "Cover asset", coverMode: "image" }));
    assert.equal(getProjects().find((project) => project.id === coveredProject.id)?.coverImagePath, coveredProject.coverImagePath);
    await updateProject(coveredProject.id, projectForm({ name: "Cover asset", coverMode: "none" }));
    assert.equal(getProjects().find((project) => project.id === coveredProject.id)?.coverImagePath, null);

    await expectValidation(() => createProject(projectForm({ deadline: "2026-01-09" })));
    await expectValidation(() => createProject(projectForm({ workProgress: "101" })));
    await expectValidation(() => createProject(projectForm({ linkUrl: "file:///private" })));

    await updateProject(created[0].id, projectForm({ status: "completed", workProgress: "100" }));
    let updated = getProjects().find((project) => project.id === created[0].id);
    assert.ok(updated);
    assert.equal(updated.status, "completed");
    assert.ok(updated.completedAt);
    assert.equal(updated.cancelledAt, null);

    await updateProject(updated.id, projectForm({ status: "active", workProgress: "80" }));
    updated = getProjects().find((project) => project.id === created[0].id);
    assert.ok(updated);
    assert.equal(updated.status, "active");
    assert.equal(updated.completedAt, null);

    archiveProject(updated.id);
    assert.ok(getProjects().find((project) => project.id === updated.id)?.archivedAt);
    assert.equal(getKanbanProjects().some((project) => project.id === updated.id), false);
    restoreProject(updated.id);
    assert.equal(getProjects().find((project) => project.id === updated.id)?.archivedAt, null);

    assert.throws(() => permanentlyDeleteProject(updated.id, "no"), ProjectValidationError);
    const database = getDatabase();
    const statusHistory = database.select().from(projectStatusHistory).where(eq(projectStatusHistory.projectId, updated.id)).all();
    const activity = database.select().from(projectActivity).where(eq(projectActivity.projectId, updated.id)).all();
    const orderingActivity = database.select().from(projectActivity).where(eq(projectActivity.projectId, orderedProject.id)).all();
    assert.ok(statusHistory.length >= 5);
    assert.ok(orderingActivity.some((event) => event.type === "reordered"));
    assert.ok(activity.some((event) => event.type === "reopened"));

    const childTaskId = getProjects().find((project) => project.id === updated.id)!.tasks[0]!.id;
    const childMilestoneId = getProjects().find((project) => project.id === updated.id)!.milestones[0]!.id;
    const childDocumentId = getProjects().find((project) => project.id === updated.id)!.documents[0]!.id;

    permanentlyDeleteProject(updated.id, "DELETE");
    assert.equal(database.select().from(projects).all().length, 9);
    assert.equal(database.select().from(projectStatusHistory).where(eq(projectStatusHistory.projectId, updated.id)).all().length, 0);
    assert.equal(database.select().from(projectLinks).where(eq(projectLinks.projectId, updated.id)).all().length, 0);
    assert.equal(database.select().from(projectTags).where(eq(projectTags.projectId, updated.id)).all().length, 0);
    assert.equal(database.select().from(projectActivity).where(eq(projectActivity.projectId, updated.id)).all().length, 0);
    assert.equal(database.select().from(projectTasks).where(eq(projectTasks.id, childTaskId)).all().length, 0);
    assert.equal(database.select().from(projectMilestones).where(eq(projectMilestones.id, childMilestoneId)).all().length, 0);
    assert.equal(database.select().from(projectDocuments).where(eq(projectDocuments.id, childDocumentId)).all().length, 0);

    // Exercise standalone delete paths after ownership/cascade coverage above.
    const surviving = getProjects().find((project) => !project.archivedAt)!;
    const disposableTask = new FormData();
    disposableTask.set("title", "Disposable task"); disposableTask.set("status", "todo");
    createTask(surviving.id, disposableTask);
    const disposableMilestone = new FormData();
    disposableMilestone.set("title", "Disposable milestone"); disposableMilestone.set("targetDate", "2026-03-01");
    createMilestone(surviving.id, disposableMilestone);
    const disposableDocument = new FormData();
    disposableDocument.set("title", "Disposable document");
    createDocument(surviving.id, disposableDocument);
    const refreshed = getProjects().find((project) => project.id === surviving.id)!;
    deleteTask(surviving.id, refreshed.tasks.find((task) => task.title === "Disposable task")!.id);
    deleteMilestone(surviving.id, refreshed.milestones.find((milestone) => milestone.title === "Disposable milestone")!.id);
    deleteDocument(surviving.id, refreshed.documents.find((document) => document.title === "Disposable document")!.id);

    const starterTemplates = getProjectTemplates();
    assert.equal(starterTemplates.filter((template) => template.isStarter).length, 3);
    const clientTemplate = starterTemplates.find((template) => template.id === "starter-client-delivery");
    assert.ok(clientTemplate);
    assert.equal(clientTemplate.tasks.length, 4);
    assert.equal(clientTemplate.milestones.length, 3);
    assert.equal(clientTemplate.documents.length, 1);
    assert.equal(clientTemplate.requiresStartDate, true);

    const templateForm = new FormData();
    templateForm.set("templatePayload", JSON.stringify({
      name: "Personal planning", description: "My reusable local plan", type: "personal", status: "planning", priority: "normal", color: "#2563eb", tags: "personal, plan",
      tasks: [{ title: "Write outline", detail: "Start small", status: "todo", dueOffsetDays: 2 }],
      milestones: [{ title: "Outline agreed", targetOffsetDays: 3 }],
      documents: [{ title: "Notes", content: "# Notes" }],
    }));
    const personalTemplateId = createTemplate(templateForm);
    assert.equal(getProjectTemplates().some((template) => template.id === personalTemplateId && !template.isStarter), true);
    assert.throws(() => updateTemplate(clientTemplate.id, templateForm), ProjectValidationError);
    assert.throws(() => deleteTemplate(clientTemplate.id), ProjectValidationError);

    templateForm.set("templatePayload", JSON.stringify({
      name: "Personal planning updated", description: "My reusable local plan", type: "personal", status: "planning", priority: "normal", color: "#2563eb", tags: "personal, plan",
      tasks: [{ title: "Write outline", detail: "Start small", status: "todo", dueOffsetDays: 2 }],
      milestones: [{ title: "Outline agreed", targetOffsetDays: 3 }],
      documents: [{ title: "Notes", content: "# Notes" }],
    }));
    updateTemplate(personalTemplateId, templateForm);
    assert.equal(getProjectTemplates().find((template) => template.id === personalTemplateId)?.name, "Personal planning updated");

    const beforeTemplateProjectCount = database.select().from(projects).all().length;
    const cloneForm = projectForm({ name: "Acme delivery", startDate: "2026-04-01", deadline: "" });
    const cloneId = await createProjectFromTemplate(clientTemplate.id, cloneForm);
    const clonedProject = getProjects().find((project) => project.id === cloneId);
    assert.ok(clonedProject);
    assert.equal(clonedProject.tasks.length, clientTemplate.tasks.length);
    assert.equal(clonedProject.milestones.length, clientTemplate.milestones.length);
    assert.equal(clonedProject.documents.length, clientTemplate.documents.length);
    assert.equal(clonedProject.tasks.find((task) => task.title === "Prepare delivery plan")?.dueDate, "2026-04-03");
    assert.equal(clonedProject.milestones.find((milestone) => milestone.title === "Final handoff")?.targetDate, "2026-04-22");
    assert.equal(clonedProject.deadline, "2026-04-22");
    assert.ok(getProjectWorkspace(cloneId)?.activity.some((event) => event.type === "created_from_template"));

    await expectValidation(() => createProjectFromTemplate(clientTemplate.id, projectForm({ name: "Invalid delivery", startDate: "2026-04-01", deadline: "2026-04-10" })));
    assert.equal(database.select().from(projects).all().length, beforeTemplateProjectCount + 1);
    deleteTemplate(personalTemplateId);
    assert.equal(database.select().from(projectTemplates).where(eq(projectTemplates.id, personalTemplateId)).all().length, 0);

    console.info("Project domain tests passed.");
  } finally {
    rmSync(testDirectory, { recursive: true, force: true });
  }
}

void main();
