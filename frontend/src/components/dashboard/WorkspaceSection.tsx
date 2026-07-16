"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Folder } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateProjectDialog } from "@/components/dashboard/CreateProjectDialog";
import { MembersDialog } from "@/components/dashboard/MembersDialog";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import type { Workspace } from "@/types";

export function WorkspaceSection({ workspace }: { workspace: Workspace }) {
  const projects =
    useWorkspaceStore((s) => s.projectsByWorkspace[workspace.id]) ?? [];
  const status =
    useWorkspaceStore((s) => s.projectsStatus[workspace.id]) ?? "idle";
  const fetchProjects = useWorkspaceStore((s) => s.fetchProjects);

  useEffect(() => {
    void fetchProjects(workspace.id);
  }, [workspace.id, fetchProjects]);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{workspace.name}</h2>
        <div className="flex items-center gap-2">
          <MembersDialog workspace={workspace} />
          <CreateProjectDialog workspaceId={workspace.id} />
        </div>
      </div>

      {status === "loading" ? (
        <p className="text-sm text-muted-foreground">Loading projects...</p>
      ) : null}
      {status === "error" ? (
        <p className="text-sm text-destructive">
          Failed to load projects for this workspace.
        </p>
      ) : null}
      {status === "loaded" && projects.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No projects yet — create one to get started.
        </p>
      ) : null}

      {projects.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/workspace/${project.id}`}>
              <Card className="h-full transition-colors hover:border-primary">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Folder className="h-4 w-4 text-muted-foreground" />
                    {project.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {project.description || `Template: ${project.template}`}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}
