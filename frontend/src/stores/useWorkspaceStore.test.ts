import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "@/lib/api";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import type { Project, Workspace, WorkspaceMember } from "@/types";

const workspace: Workspace = {
  id: "ws-1",
  name: "Acme",
  owner_id: "user-1",
  settings: {},
  created_at: "2026-01-01T00:00:00Z",
};

const project: Project = {
  id: "proj-1",
  workspace_id: "ws-1",
  name: "Demo",
  description: null,
  template: "blank",
  language: null,
  framework: null,
  container_id: null,
  container_status: "stopped",
  preview_port: null,
  git_remote: null,
  created_at: "2026-01-01T00:00:00Z",
};

const member: WorkspaceMember = {
  workspace_id: "ws-1",
  user_id: "user-2",
  role: "viewer",
};

describe("useWorkspaceStore", () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      workspaces: [],
      workspacesStatus: "idle",
      projectsByWorkspace: {},
      projectsStatus: {},
      membersByWorkspace: {},
      membersStatus: {},
      currentWorkspaceId: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetchWorkspaces() loads the list on success", async () => {
    vi.spyOn(api.workspaces, "list").mockResolvedValue({
      items: [workspace],
      total: 1,
      limit: 100,
      offset: 0,
    });

    await useWorkspaceStore.getState().fetchWorkspaces();

    expect(useWorkspaceStore.getState().workspaces).toEqual([workspace]);
    expect(useWorkspaceStore.getState().workspacesStatus).toBe("loaded");
  });

  it("fetchWorkspaces() marks error status and rethrows on failure", async () => {
    vi.spyOn(api.workspaces, "list").mockRejectedValue(new Error("boom"));

    await expect(
      useWorkspaceStore.getState().fetchWorkspaces(),
    ).rejects.toThrow("boom");
    expect(useWorkspaceStore.getState().workspacesStatus).toBe("error");
  });

  it("createWorkspace() prepends the new workspace", async () => {
    vi.spyOn(api.workspaces, "create").mockResolvedValue(workspace);

    const created = await useWorkspaceStore.getState().createWorkspace("Acme");

    expect(created).toEqual(workspace);
    expect(useWorkspaceStore.getState().workspaces).toEqual([workspace]);
  });

  it("fetchProjects() scopes status/results per workspace id", async () => {
    vi.spyOn(api.projects, "list").mockResolvedValue({
      items: [project],
      total: 1,
      limit: 100,
      offset: 0,
    });

    await useWorkspaceStore.getState().fetchProjects("ws-1");

    expect(useWorkspaceStore.getState().projectsByWorkspace["ws-1"]).toEqual([
      project,
    ]);
    expect(useWorkspaceStore.getState().projectsStatus["ws-1"]).toBe("loaded");
  });

  it("createProject() prepends into the right workspace's project list", async () => {
    vi.spyOn(api.projects, "create").mockResolvedValue(project);

    await useWorkspaceStore
      .getState()
      .createProject("ws-1", { name: "Demo", template: "blank" });

    expect(useWorkspaceStore.getState().projectsByWorkspace["ws-1"]).toEqual([
      project,
    ]);
  });

  it("fetchMembers() loads members for a workspace", async () => {
    vi.spyOn(api.workspaces, "listMembers").mockResolvedValue([member]);

    await useWorkspaceStore.getState().fetchMembers("ws-1");

    expect(useWorkspaceStore.getState().membersByWorkspace["ws-1"]).toEqual([
      member,
    ]);
  });

  it("inviteMember() invites then refetches the member list", async () => {
    const inviteSpy = vi
      .spyOn(api.workspaces, "inviteMember")
      .mockResolvedValue(member);
    const listSpy = vi
      .spyOn(api.workspaces, "listMembers")
      .mockResolvedValue([member]);

    await useWorkspaceStore
      .getState()
      .inviteMember("ws-1", "a@b.com", "viewer");

    expect(inviteSpy).toHaveBeenCalledWith("ws-1", {
      email: "a@b.com",
      role: "viewer",
    });
    expect(listSpy).toHaveBeenCalledWith("ws-1");
    expect(useWorkspaceStore.getState().membersByWorkspace["ws-1"]).toEqual([
      member,
    ]);
  });

  it("updateMemberRole() updates then refetches the member list", async () => {
    const updateSpy = vi
      .spyOn(api.workspaces, "updateMemberRole")
      .mockResolvedValue({
        ...member,
        role: "editor",
      });
    vi.spyOn(api.workspaces, "listMembers").mockResolvedValue([
      { ...member, role: "editor" },
    ]);

    await useWorkspaceStore
      .getState()
      .updateMemberRole("ws-1", "user-2", "editor");

    expect(updateSpy).toHaveBeenCalledWith("ws-1", "user-2", {
      role: "editor",
    });
    expect(
      useWorkspaceStore.getState().membersByWorkspace["ws-1"]?.[0]?.role,
    ).toBe("editor");
  });

  it("removeMember() removes then refetches the member list", async () => {
    const removeSpy = vi
      .spyOn(api.workspaces, "removeMember")
      .mockResolvedValue(undefined);
    vi.spyOn(api.workspaces, "listMembers").mockResolvedValue([]);

    await useWorkspaceStore.getState().removeMember("ws-1", "user-2");

    expect(removeSpy).toHaveBeenCalledWith("ws-1", "user-2");
    expect(useWorkspaceStore.getState().membersByWorkspace["ws-1"]).toEqual([]);
  });
});
