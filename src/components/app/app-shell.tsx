"use client";

import { CalendarDays, Database, LayoutDashboard, LayoutTemplate, List, PanelTop, SquaresUnite } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { KanbanBoard } from "@/components/projects/kanban-board";
import { ProjectDashboard } from "@/components/projects/dashboard";
import { ProjectList } from "@/components/projects/project-list";
import { TemplatesPanel } from "@/components/projects/templates-panel";
import { Timeline } from "@/components/projects/timeline";
import { ProjectCalendar } from "@/components/projects/calendar";
import { QuickAdd } from "@/components/app/quick-add";
import { BackupControls } from "@/components/app/backup-controls";
import { isPortfolioView, type PortfolioView } from "@/components/app/portfolio-navigation";
import type { ProjectRecord, ProjectTemplateRecord } from "@/lib/projects/types";
import { localToday } from "@/lib/timeline/date";
import { TIMELINE_DEFAULT_PIXELS_PER_DAY, type TimelineViewportState } from "@/lib/timeline/viewport";

type AppShellProps = {
  projects: ProjectRecord[];
  templates: ProjectTemplateRecord[];
  initialView: PortfolioView;
};

const navigationItems: Array<{ label: string; icon: typeof CalendarDays; view: PortfolioView }> = [
  { label: "Dashboard", icon: SquaresUnite, view: "dashboard" },
  { label: "Kanban", icon: PanelTop, view: "kanban" },
  { label: "Timeline", icon: LayoutDashboard, view: "timeline" },
  { label: "Calendar", icon: CalendarDays, view: "calendar" },
  { label: "List", icon: List, view: "list" },
  { label: "Templates", icon: LayoutTemplate, view: "templates" },
];

export function AppShell({ projects, templates, initialView }: AppShellProps) {
  const [view, setView] = useState<PortfolioView>(initialView);
  const [timelineViewport, setTimelineViewport] = useState<TimelineViewportState>(() => ({ centerDate: localToday(), pixelsPerDay: TIMELINE_DEFAULT_PIXELS_PER_DAY }));
  const projectRevision = projects.map((project) => `${project.id}:${project.updatedAt}`).join("|");

  useEffect(() => {
    function syncViewFromLocation() {
      const candidate = new URLSearchParams(window.location.search).get("view");
      setView(isPortfolioView(candidate) ? candidate : "dashboard");
    }
    window.addEventListener("popstate", syncViewFromLocation);
    return () => window.removeEventListener("popstate", syncViewFromLocation);
  }, []);

  function selectView(nextView: PortfolioView) {
    if (nextView === view) return;
    window.history.pushState(null, "", `/?view=${nextView}`);
    setView(nextView);
  }

  return (
    <div className="min-h-svh bg-[var(--background)]">
      <header className="border-b bg-[var(--card)]">
        <div className="mx-auto grid max-w-[84rem] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:px-8">
          <div className="col-start-1 row-start-1 flex min-w-0 items-center gap-3">
            <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-md bg-[var(--accent)] text-sm font-black text-[var(--accent-foreground)]">LO</span>
            <div className="min-w-0">
              <p className="text-sm font-semibold tracking-tight">Local Project OS</p>
              <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">Your personal workspace</p>
            </div>
          </div>
          <div className="col-start-2 row-start-1 sm:col-start-3"><QuickAdd projects={projects} templates={templates} onNavigate={selectView} /></div>
          <div className="col-span-2 border-t pt-3 sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:justify-self-end sm:border-0 sm:pt-0"><BackupControls /></div>
        </div>
      </header>

      <main className="w-full overflow-x-hidden px-5 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Portfolio</h1>
              <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">Your projects, work and upcoming commitments.</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]" role="status">
              <Database className="size-3.5" aria-hidden="true" /> Stored on this device
            </div>
          </div>

          <nav aria-label="Project views" className="mt-6 grid grid-cols-3 gap-1 border-b pb-2 sm:flex sm:flex-wrap sm:gap-2">
            {navigationItems.map(({ label, icon: Icon, view: itemView }) => (
              <Button
                aria-current={view === itemView ? "page" : undefined}
                key={label}
                size="sm"
                variant="ghost"
                className={view === itemView ? "view-tab bg-[var(--muted)] text-[var(--accent)] hover:text-[var(--accent)]" : "view-tab text-[var(--muted-foreground)]"}
                onClick={() => selectView(itemView)}
              >
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </Button>
            ))}
          </nav>
        </div>

        <div className={view === "timeline" ? "" : "mx-auto max-w-7xl"}>
          {view === "dashboard" ? <ProjectDashboard projects={projects} /> : view === "kanban" ? <KanbanBoard key={projectRevision} projects={projects} templates={templates} /> : view === "timeline" ? <Timeline projects={projects} viewport={timelineViewport} onViewportChange={setTimelineViewport} /> : view === "calendar" ? <ProjectCalendar projects={projects} /> : view === "list" ? <ProjectList projects={projects} /> : <TemplatesPanel templates={templates} />}
        </div>
      </main>
    </div>
  );
}
