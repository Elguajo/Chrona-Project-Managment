export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { AppShell } from "@/components/app/app-shell";
import { getProjects } from "@/lib/projects/server";
import { getProjectTemplates } from "@/lib/templates/server";

export default function Home() {
  const projects = getProjects();
  const templates = getProjectTemplates();

  return <AppShell projects={projects} templates={templates} />;
}
