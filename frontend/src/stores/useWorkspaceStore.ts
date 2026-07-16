// Zustand store for the dashboard's workspace/project/member data, plus the
// current project and its file tree the IDE shell is open on.
import { create } from "zustand";

import { api } from "@/lib/api";
import type {
  FileNode,
  Project,
  ProjectCreate,
  Workspace,
  WorkspaceMember,
  WorkspaceRole,
} from "@/types";

export type FetchStatus = "idle" | "loading" | "loaded" | "error";

interface WorkspaceState {
  workspaces: Workspace[];
  workspacesStatus: FetchStatus;

  projectsByWorkspace: Record<string, Project[]>;
  projectsStatus: Record<string, FetchStatus>;

  membersByWorkspace: Record<string, WorkspaceMember[]>;
  membersStatus: Record<string, FetchStatus>;

  currentWorkspaceId: string | null;
  setCurrentWorkspace: (id: string | null) => void;

  currentProject: Project | null;
  currentProjectStatus: FetchStatus;
  fetchProject: (projectId: string) => Promise<void>;

  fileTree: FileNode[];
  fileTreeStatus: FetchStatus;
  fetchFileTree: (projectId: string) => Promise<void>;
  createFileEntry: (
    projectId: string,
    path: string,
    isDir: boolean,
  ) => Promise<FileNode>;
  deleteFileEntry: (projectId: string, path: string) => Promise<void>;
  renameFileEntry: (
    projectId: string,
    oldPath: string,
    newPath: string,
  ) => Promise<FileNode>;
  patchFileNode: (node: FileNode) => void;

  fetchWorkspaces: () => Promise<void>;
  createWorkspace: (name: string) => Promise<Workspace>;

  fetchProjects: (workspaceId: string) => Promise<void>;
  createProject: (
    workspaceId: string,
    payload: ProjectCreate,
  ) => Promise<Project>;

  fetchMembers: (workspaceId: string) => Promise<void>;
  inviteMember: (
    workspaceId: string,
    email: string,
    role: WorkspaceRole,
  ) => Promise<void>;
  updateMemberRole: (
    workspaceId: string,
    userId: string,
    role: WorkspaceRole,
  ) => Promise<void>;
  removeMember: (workspaceId: string, userId: string) => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  workspacesStatus: "idle",

  projectsByWorkspace: {},
  projectsStatus: {},

  membersByWorkspace: {},
  membersStatus: {},

  currentWorkspaceId: null,
  setCurrentWorkspace: (id) => set({ currentWorkspaceId: id }),

  currentProject: null,
  currentProjectStatus: "idle",
  fetchProject: async (projectId) => {
    set({ currentProjectStatus: "loading" });
    try {
      const project = await api.projects.get(projectId);
      set({ currentProject: project, currentProjectStatus: "loaded" });
    } catch (err) {
      set({ currentProject: null, currentProjectStatus: "error" });
      throw err;
    }
  },

  fileTree: [],
  fileTreeStatus: "idle",
  fetchFileTree: async (projectId) => {
    set({ fileTreeStatus: "loading" });
    try {
      const tree = await api.files.tree(projectId);
      set({ fileTree: tree, fileTreeStatus: "loaded" });
    } catch (err) {
      set({ fileTreeStatus: "error" });
      throw err;
    }
  },
  createFileEntry: async (projectId, path, isDir) => {
    const node = await api.files.create(projectId, path, isDir);
    await get().fetchFileTree(projectId);
    return node;
  },
  deleteFileEntry: async (projectId, path) => {
    await api.files.remove(projectId, path);
    await get().fetchFileTree(projectId);
  },
  renameFileEntry: async (projectId, oldPath, newPath) => {
    const node = await api.files.rename(projectId, oldPath, newPath);
    await get().fetchFileTree(projectId);
    return node;
  },
  patchFileNode: (node) => {
    set((state) => {
      const idx = state.fileTree.findIndex((n) => n.path === node.path);
      if (idx === -1) return { fileTree: [...state.fileTree, node] };
      const next = [...state.fileTree];
      next[idx] = node;
      return { fileTree: next };
    });
  },

  fetchWorkspaces: async () => {
    set({ workspacesStatus: "loading" });
    try {
      const page = await api.workspaces.list({ limit: 100 });
      set({ workspaces: page.items, workspacesStatus: "loaded" });
    } catch (err) {
      set({ workspacesStatus: "error" });
      throw err;
    }
  },

  createWorkspace: async (name) => {
    const workspace = await api.workspaces.create({ name });
    set((state) => ({ workspaces: [workspace, ...state.workspaces] }));
    return workspace;
  },

  fetchProjects: async (workspaceId) => {
    set((state) => ({
      projectsStatus: { ...state.projectsStatus, [workspaceId]: "loading" },
    }));
    try {
      const page = await api.projects.list(workspaceId, { limit: 100 });
      set((state) => ({
        projectsByWorkspace: {
          ...state.projectsByWorkspace,
          [workspaceId]: page.items,
        },
        projectsStatus: { ...state.projectsStatus, [workspaceId]: "loaded" },
      }));
    } catch (err) {
      set((state) => ({
        projectsStatus: { ...state.projectsStatus, [workspaceId]: "error" },
      }));
      throw err;
    }
  },

  createProject: async (workspaceId, payload) => {
    const project = await api.projects.create(workspaceId, payload);
    set((state) => ({
      projectsByWorkspace: {
        ...state.projectsByWorkspace,
        [workspaceId]: [
          project,
          ...(state.projectsByWorkspace[workspaceId] ?? []),
        ],
      },
    }));
    return project;
  },

  fetchMembers: async (workspaceId) => {
    set((state) => ({
      membersStatus: { ...state.membersStatus, [workspaceId]: "loading" },
    }));
    try {
      const members = await api.workspaces.listMembers(workspaceId);
      set((state) => ({
        membersByWorkspace: {
          ...state.membersByWorkspace,
          [workspaceId]: members,
        },
        membersStatus: { ...state.membersStatus, [workspaceId]: "loaded" },
      }));
    } catch (err) {
      set((state) => ({
        membersStatus: { ...state.membersStatus, [workspaceId]: "error" },
      }));
      throw err;
    }
  },

  inviteMember: async (workspaceId, email, role) => {
    await api.workspaces.inviteMember(workspaceId, { email, role });
    await get().fetchMembers(workspaceId);
  },

  updateMemberRole: async (workspaceId, userId, role) => {
    await api.workspaces.updateMemberRole(workspaceId, userId, { role });
    await get().fetchMembers(workspaceId);
  },

  removeMember: async (workspaceId, userId) => {
    await api.workspaces.removeMember(workspaceId, userId);
    await get().fetchMembers(workspaceId);
  },
}));
