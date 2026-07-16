"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CreateWorkspaceDialog } from "@/components/dashboard/CreateWorkspaceDialog";
import { WorkspaceSection } from "@/components/dashboard/WorkspaceSection";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const workspacesStatus = useWorkspaceStore((s) => s.workspacesStatus);
  const fetchWorkspaces = useWorkspaceStore((s) => s.fetchWorkspaces);

  useEffect(() => {
    if (workspacesStatus === "idle") {
      void fetchWorkspaces();
    }
  }, [workspacesStatus, fetchWorkspaces]);

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 py-10">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">ANKU</h1>
          {user ? (
            <p className="text-sm text-muted-foreground">{user.email}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <CreateWorkspaceDialog />
          <Button variant="ghost" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Log out
          </Button>
        </div>
      </header>

      {workspacesStatus === "loading" ? (
        <p className="text-sm text-muted-foreground">Loading workspaces...</p>
      ) : null}
      {workspacesStatus === "error" ? (
        <p className="text-sm text-destructive">
          Failed to load workspaces. Try refreshing.
        </p>
      ) : null}
      {workspacesStatus === "loaded" && workspaces.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          You&apos;re not in any workspace yet — create one to start a project.
        </p>
      ) : null}

      <div className="flex flex-col gap-10">
        {workspaces.map((workspace) => (
          <WorkspaceSection key={workspace.id} workspace={workspace} />
        ))}
      </div>
    </main>
  );
}
