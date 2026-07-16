// Zustand store for open editor tabs, active file per group, dirty state, and
// split-view (two editor groups). Persists which tabs are open (not their
// content — that's always re-fetched fresh) to localStorage per project, so
// reloading the IDE restores the same tab layout.
import { create } from "zustand";

import { api } from "@/lib/api";
import { getLanguageForPath } from "@/lib/language";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import type { FileNode } from "@/types";

export type TabGroup = "primary" | "secondary";

interface OpenFile {
  path: string;
  content: string;
  originalContent: string;
  language: string;
}

interface PersistedLayout {
  primaryTabs: string[];
  secondaryTabs: string[];
  activePrimaryPath: string | null;
  activeSecondaryPath: string | null;
  isSplit: boolean;
}

interface EditorState {
  projectId: string | null;
  openFiles: Record<string, OpenFile>;
  primaryTabs: string[];
  secondaryTabs: string[];
  activePrimaryPath: string | null;
  activeSecondaryPath: string | null;
  isSplit: boolean;
  savingPaths: Record<string, boolean>;

  setProject: (projectId: string) => Promise<void>;
  openFile: (
    projectId: string,
    path: string,
    group?: TabGroup,
  ) => Promise<void>;
  closeTab: (path: string, group: TabGroup) => void;
  closeSplit: () => void;
  renamePath: (oldPath: string, newPath: string) => void;
  setActiveTab: (path: string, group: TabGroup) => void;
  updateContent: (path: string, content: string) => void;
  saveFile: (projectId: string, path: string) => Promise<void>;
  saveAllDirty: (projectId: string) => Promise<void>;
  isDirty: (path: string) => boolean;
}

function storageKey(projectId: string): string {
  return `anku:editor-layout:${projectId}`;
}

function readLayout(projectId: string): PersistedLayout | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(projectId));
    if (!raw) return null;
    return JSON.parse(raw) as PersistedLayout;
  } catch {
    return null;
  }
}

function writeLayout(projectId: string, layout: PersistedLayout): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(projectId), JSON.stringify(layout));
  } catch {
    // localStorage can throw (quota, private browsing) — losing the tab
    // layout across reloads isn't worth surfacing an error for.
  }
}

export const useEditorStore = create<EditorState>((set, get) => {
  function persist() {
    const {
      projectId,
      primaryTabs,
      secondaryTabs,
      activePrimaryPath,
      activeSecondaryPath,
      isSplit,
    } = get();
    if (!projectId) return;
    writeLayout(projectId, {
      primaryTabs,
      secondaryTabs,
      activePrimaryPath,
      activeSecondaryPath,
      isSplit,
    });
  }

  return {
    projectId: null,
    openFiles: {},
    primaryTabs: [],
    secondaryTabs: [],
    activePrimaryPath: null,
    activeSecondaryPath: null,
    isSplit: false,
    savingPaths: {},

    setProject: async (projectId) => {
      if (get().projectId === projectId) return;
      set({
        projectId,
        openFiles: {},
        primaryTabs: [],
        secondaryTabs: [],
        activePrimaryPath: null,
        activeSecondaryPath: null,
        isSplit: false,
      });
      const layout = readLayout(projectId);
      if (!layout) return;

      await Promise.allSettled(
        layout.primaryTabs.map((path) =>
          get().openFile(projectId, path, "primary"),
        ),
      );
      await Promise.allSettled(
        layout.secondaryTabs.map((path) =>
          get().openFile(projectId, path, "secondary"),
        ),
      );

      set((state) => ({
        isSplit: layout.isSplit && state.secondaryTabs.length > 0,
        activePrimaryPath:
          layout.activePrimaryPath &&
          state.primaryTabs.includes(layout.activePrimaryPath)
            ? layout.activePrimaryPath
            : (state.primaryTabs[state.primaryTabs.length - 1] ?? null),
        activeSecondaryPath:
          layout.activeSecondaryPath &&
          state.secondaryTabs.includes(layout.activeSecondaryPath)
            ? layout.activeSecondaryPath
            : (state.secondaryTabs[state.secondaryTabs.length - 1] ?? null),
      }));
    },

    openFile: async (projectId, path, group = "primary") => {
      // Defensive: persist() below is keyed off state.projectId, not the
      // projectId argument. Callers are expected to call setProject() first
      // (WorkspaceShell does, on mount), but if that's ever skipped, opening
      // a file would otherwise silently fail to persist the tab layout.
      if (get().projectId !== projectId) {
        set({ projectId });
      }
      if (!get().openFiles[path]) {
        const file = await api.files.read(projectId, path);
        set((state) => ({
          openFiles: {
            ...state.openFiles,
            [path]: {
              path,
              content: file.content,
              originalContent: file.content,
              language: getLanguageForPath(path),
            },
          },
        }));
      }
      set((state) => {
        if (group === "primary") {
          const primaryTabs = state.primaryTabs.includes(path)
            ? state.primaryTabs
            : [...state.primaryTabs, path];
          return { primaryTabs, activePrimaryPath: path };
        }
        const secondaryTabs = state.secondaryTabs.includes(path)
          ? state.secondaryTabs
          : [...state.secondaryTabs, path];
        return { secondaryTabs, activeSecondaryPath: path, isSplit: true };
      });
      persist();
    },

    closeTab: (path, group) => {
      set((state) => {
        const otherTabs =
          group === "primary" ? state.secondaryTabs : state.primaryTabs;
        const openFiles = { ...state.openFiles };
        if (!otherTabs.includes(path)) delete openFiles[path];

        if (group === "primary") {
          const primaryTabs = state.primaryTabs.filter((p) => p !== path);
          const activePrimaryPath =
            state.activePrimaryPath === path
              ? (primaryTabs[primaryTabs.length - 1] ?? null)
              : state.activePrimaryPath;
          return { primaryTabs, activePrimaryPath, openFiles };
        }
        const secondaryTabs = state.secondaryTabs.filter((p) => p !== path);
        const activeSecondaryPath =
          state.activeSecondaryPath === path
            ? (secondaryTabs[secondaryTabs.length - 1] ?? null)
            : state.activeSecondaryPath;
        return { secondaryTabs, activeSecondaryPath, openFiles };
      });
      persist();
    },

    closeSplit: () => {
      set((state) => {
        const openFiles = { ...state.openFiles };
        for (const path of state.secondaryTabs) {
          if (!state.primaryTabs.includes(path)) delete openFiles[path];
        }
        return {
          isSplit: false,
          secondaryTabs: [],
          activeSecondaryPath: null,
          openFiles,
        };
      });
      persist();
    },

    renamePath: (oldPath, newPath) => {
      set((state) => {
        const file = state.openFiles[oldPath];
        if (!file) return state;
        const openFiles = { ...state.openFiles };
        delete openFiles[oldPath];
        openFiles[newPath] = { ...file, path: newPath };
        return {
          openFiles,
          primaryTabs: state.primaryTabs.map((p) =>
            p === oldPath ? newPath : p,
          ),
          secondaryTabs: state.secondaryTabs.map((p) =>
            p === oldPath ? newPath : p,
          ),
          activePrimaryPath:
            state.activePrimaryPath === oldPath
              ? newPath
              : state.activePrimaryPath,
          activeSecondaryPath:
            state.activeSecondaryPath === oldPath
              ? newPath
              : state.activeSecondaryPath,
        };
      });
      persist();
    },

    setActiveTab: (path, group) => {
      if (group === "primary") set({ activePrimaryPath: path });
      else set({ activeSecondaryPath: path });
      persist();
    },

    updateContent: (path, content) => {
      set((state) => {
        const file = state.openFiles[path];
        if (!file) return state;
        return {
          openFiles: { ...state.openFiles, [path]: { ...file, content } },
        };
      });
    },

    saveFile: async (projectId, path) => {
      const file = get().openFiles[path];
      if (!file) return;
      set((state) => ({ savingPaths: { ...state.savingPaths, [path]: true } }));
      try {
        const node: FileNode = await api.files.write(
          projectId,
          path,
          file.content,
        );
        set((state) => {
          const current = state.openFiles[path];
          if (!current) return state;
          return {
            openFiles: {
              ...state.openFiles,
              [path]: { ...current, originalContent: current.content },
            },
          };
        });
        useWorkspaceStore.getState().patchFileNode(node);
      } finally {
        set((state) => {
          const savingPaths = { ...state.savingPaths };
          delete savingPaths[path];
          return { savingPaths };
        });
      }
    },

    saveAllDirty: async (projectId) => {
      const dirtyPaths = Object.values(get().openFiles)
        .filter((f) => f.content !== f.originalContent)
        .map((f) => f.path);
      await Promise.all(
        dirtyPaths.map((path) => get().saveFile(projectId, path)),
      );
    },

    isDirty: (path) => {
      const file = get().openFiles[path];
      return !!file && file.content !== file.originalContent;
    },
  };
});
