import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "@/lib/api";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import type { FileNode, Project, Workspace, WorkspaceMember } from "@/types";

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
  email: "member@example.com",
  name: "Member",
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
      currentProject: null,
      currentProjectStatus: "idle",
      fileTree: [],
      fileTreeStatus: "idle",
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

  it("fetchProject() loads the current project on success", async () => {
    vi.spyOn(api.projects, "get").mockResolvedValue(project);

    await useWorkspaceStore.getState().fetchProject("proj-1");

    expect(useWorkspaceStore.getState().currentProject).toEqual(project);
    expect(useWorkspaceStore.getState().currentProjectStatus).toBe("loaded");
  });

  it("fetchProject() clears the current project and rethrows on failure", async () => {
    vi.spyOn(api.projects, "get").mockRejectedValue(new Error("not found"));

    await expect(
      useWorkspaceStore.getState().fetchProject("missing"),
    ).rejects.toThrow("not found");

    expect(useWorkspaceStore.getState().currentProject).toBeNull();
    expect(useWorkspaceStore.getState().currentProjectStatus).toBe("error");
  });

  it("fetchFileTree() loads the flat file list", async () => {
    const tree: FileNode[] = [
      {
        path: "a.txt",
        is_dir: false,
        size: 5,
        updated_at: "2026-01-01T00:00:00Z",
      },
    ];
    vi.spyOn(api.files, "tree").mockResolvedValue(tree);

    await useWorkspaceStore.getState().fetchFileTree("proj-1");

    expect(useWorkspaceStore.getState().fileTree).toEqual(tree);
    expect(useWorkspaceStore.getState().fileTreeStatus).toBe("loaded");
  });

  it("createFileEntry() creates then refetches the tree", async () => {
    const newNode: FileNode = {
      path: "b.txt",
      is_dir: false,
      size: 0,
      updated_at: "2026-01-01T00:00:00Z",
    };
    const createSpy = vi.spyOn(api.files, "create").mockResolvedValue(newNode);
    const treeSpy = vi.spyOn(api.files, "tree").mockResolvedValue([newNode]);

    const result = await useWorkspaceStore
      .getState()
      .createFileEntry("proj-1", "b.txt", false);

    expect(createSpy).toHaveBeenCalledWith("proj-1", "b.txt", false);
    expect(treeSpy).toHaveBeenCalledWith("proj-1");
    expect(result).toEqual(newNode);
    expect(useWorkspaceStore.getState().fileTree).toEqual([newNode]);
  });

  it("deleteFileEntry() removes then refetches the tree", async () => {
    const removeSpy = vi
      .spyOn(api.files, "remove")
      .mockResolvedValue(undefined);
    vi.spyOn(api.files, "tree").mockResolvedValue([]);

    await useWorkspaceStore.getState().deleteFileEntry("proj-1", "b.txt");

    expect(removeSpy).toHaveBeenCalledWith("proj-1", "b.txt");
    expect(useWorkspaceStore.getState().fileTree).toEqual([]);
  });

  it("renameFileEntry() renames then refetches the tree", async () => {
    const renamed: FileNode = {
      path: "c.txt",
      is_dir: false,
      size: 5,
      updated_at: "2026-01-01T00:00:00Z",
    };
    const renameSpy = vi.spyOn(api.files, "rename").mockResolvedValue(renamed);
    vi.spyOn(api.files, "tree").mockResolvedValue([renamed]);

    const result = await useWorkspaceStore
      .getState()
      .renameFileEntry("proj-1", "b.txt", "c.txt");

    expect(renameSpy).toHaveBeenCalledWith("proj-1", "b.txt", "c.txt");
    expect(result).toEqual(renamed);
    expect(useWorkspaceStore.getState().fileTree).toEqual([renamed]);
  });

  it("patchFileNode() upserts a single node without refetching", () => {
    const original: FileNode = {
      path: "a.txt",
      is_dir: false,
      size: 5,
      updated_at: "2026-01-01T00:00:00Z",
    };
    useWorkspaceStore.setState({ fileTree: [original] });

    const updated: FileNode = {
      ...original,
      size: 99,
      updated_at: "2026-02-01T00:00:00Z",
    };
    useWorkspaceStore.getState().patchFileNode(updated);

    expect(useWorkspaceStore.getState().fileTree).toEqual([updated]);
  });
});
