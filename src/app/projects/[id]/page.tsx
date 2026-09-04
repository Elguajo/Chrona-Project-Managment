export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";

import { ProjectDetail } from "@/components/projects/project-detail";
import { getProjectWorkspace } from "@/lib/projects/server";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workspace = getProjectWorkspace(id);
  if (!workspace) notFound();

  return <ProjectDetail project={workspace.project} activity={workspace.activity} />;
}
