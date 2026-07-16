"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import WorkspaceShell from "@/components/layout/WorkspaceShell";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";

export default function WorkspacePage({ params }: { params: { id: string } }) {
  const currentProject = useWorkspaceStore((s) => s.currentProject);
  const currentProjectStatus = useWorkspaceStore((s) => s.currentProjectStatus);
  const fetchProject = useWorkspaceStore((s) => s.fetchProject);

  useEffect(() => {
    void fetchProject(params.id);
  }, [params.id, fetchProject]);

  if (currentProjectStatus === "loading" || currentProjectStatus === "idle") {
    return (
      <main className="flex h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading project...</p>
      </main>
    );
  }

  if (currentProjectStatus === "error" || !currentProject) {
    return (
      <main className="flex h-screen flex-col items-center justify-center gap-3">
        <p className="text-sm text-destructive">
          Couldn&apos;t load this project.
        </p>
        <Link
          href="/dashboard"
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          Back to dashboard
        </Link>
      </main>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b px-3 text-sm">
        <Link
          href="/dashboard"
          className="text-muted-foreground hover:text-foreground"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <span className="font-medium">{currentProject.name}</span>
      </div>
      <div className="flex-1 overflow-hidden">
        <WorkspaceShell
          projectId={currentProject.id}
          containerStatus={currentProject.container_status}
        />
      </div>
    </div>
  );
}
