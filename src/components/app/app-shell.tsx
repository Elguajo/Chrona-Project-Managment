"use client";

import { Database, LayoutDashboard, List, PanelTop, Settings2, SquaresUnite } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { KanbanBoard } from "@/components/projects/kanban-board";
import { ProjectDashboard } from "@/components/projects/dashboard";
import { ProjectList } from "@/components/projects/project-list";
import { Timeline } from "@/components/projects/timeline";
import type { ProjectRecord } from "@/lib/projects/types";

type AppShellProps = {
  projects: ProjectRecord[];
};

const navigationItems = [
  { label: "Dashboard", icon: SquaresUnite, view: "dashboard" },
  { label: "Kanban", icon: PanelTop, view: "kanban" },
  { label: "Timeline", icon: LayoutDashboard, view: "timeline" },
  { label: "List", icon: List, view: "list" },
] as const;

export function AppShell({ projects }: AppShellProps) {
  const [view, setView] = useState<(typeof navigationItems)[number]["view"]>("dashboard");
  return (
    <div className="min-h-svh bg-[var(--background)]">
      <header className="flex min-h-16 items-center justify-between border-b px-5 sm:px-8">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="grid size-8 place-items-center bg-[var(--accent)] text-sm font-black text-[var(--accent-foreground)]"
          >
            LO
          </span>
          <div>
            <p className="text-sm font-semibold tracking-tight">Local Project OS</p>
            <p className="text-xs text-[var(--muted-foreground)]">Single-owner workspace</p>
          </div>
        </div>
        <Button variant="outline" size="sm" disabled aria-label="Settings arrive in a later phase">
          <Settings2 className="size-4" aria-hidden="true" />
          Settings
        </Button>
      </header>

      <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8">
        <div className="flex flex-col gap-6 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--accent)]">Local-first portfolio</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">Your local project space</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">
              Move local projects through their lifecycle, inspect their timing, and keep lightweight work inside each project.
            </p>
          </div>
          <div
            className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]"
            role="status"
          >
            <Database className="size-4 text-[var(--accent)]" aria-hidden="true" />
            Local storage initialized
          </div>
        </div>

        <nav aria-label="Project views" className="mt-6 flex flex-wrap gap-2">
          {navigationItems.map(({ label, icon: Icon, view: itemView }) => (
            <Button
              aria-current={view === itemView ? "page" : undefined}
              key={label}
              size="sm"
              variant={view === itemView ? "default" : "outline"}
              onClick={() => setView(itemView)}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </Button>
          ))}
        </nav>

        {view === "dashboard" ? <ProjectDashboard projects={projects} /> : view === "kanban" ? <KanbanBoard projects={projects} /> : view === "timeline" ? <Timeline projects={projects} /> : <ProjectList projects={projects} />}
      </main>
    </div>
  );
}
