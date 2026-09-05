export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { AppShell } from "@/components/app/app-shell";
import { isPortfolioView } from "@/components/app/portfolio-navigation";
import { getProjects } from "@/lib/projects/server";
import { getProjectTemplates } from "@/lib/templates/server";

export default async function Home({ searchParams }: { searchParams: Promise<{ view?: string | string[] }> }) {
  const params = await searchParams;
  const candidate = Array.isArray(params.view) ? params.view[0] : params.view;
  const projects = getProjects();
  const templates = getProjectTemplates();

  return <AppShell projects={projects} templates={templates} initialView={isPortfolioView(candidate) ? candidate : "dashboard"} />;
}
