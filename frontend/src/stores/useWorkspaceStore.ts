// Zustand store for the dashboard's workspace/project/member data. The
// current-project + file-tree cache fields the original TODO mentions land
// in Milestone 3 once the IDE shell actually consumes them.
import { create } from "zustand";

import { api } from "@/lib/api";
import type {
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
