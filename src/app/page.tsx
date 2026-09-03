export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { AppShell } from "@/components/app/app-shell";
import { getProjects } from "@/lib/projects/server";

export default function Home() {
  const projects = getProjects();

  const projectRevision = projects.map((project) => `${project.id}:${project.updatedAt}`).join("|");
  return <AppShell key={projectRevision} projects={projects} />;
}
