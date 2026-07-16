import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "@/lib/api";
import { useEditorStore } from "@/stores/useEditorStore";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import type { FileContent, FileNode } from "@/types";

const PROJECT_ID = "proj-1";

function fileContent(path: string, content: string): FileContent {
  return { path, content };
}

function fileNode(path: string, size: number): FileNode {
  return { path, is_dir: false, size, updated_at: "2026-01-01T00:00:00Z" };
}

describe("useEditorStore", () => {
  beforeEach(() => {
    localStorage.clear();
    useEditorStore.setState({
      projectId: null,
      openFiles: {},
      primaryTabs: [],
      secondaryTabs: [],
      activePrimaryPath: null,
      activeSecondaryPath: null,
      isSplit: false,
      savingPaths: {},
    });
    useWorkspaceStore.setState({ fileTree: [], fileTreeStatus: "idle" });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("openFile() fetches content once and opens a primary tab", async () => {
    const readSpy = vi
      .spyOn(api.files, "read")
      .mockResolvedValue(fileContent("a.txt", "hello"));

    await useEditorStore.getState().openFile(PROJECT_ID, "a.txt");

    expect(readSpy).toHaveBeenCalledTimes(1);
    expect(useEditorStore.getState().primaryTabs).toEqual(["a.txt"]);
    expect(useEditorStore.getState().activePrimaryPath).toBe("a.txt");
    expect(useEditorStore.getState().openFiles["a.txt"]?.content).toBe("hello");

    // Re-opening the same path (e.g. clicking it again) must not re-fetch.
    await useEditorStore.getState().openFile(PROJECT_ID, "a.txt");
    expect(readSpy).toHaveBeenCalledTimes(1);
  });

  it("opening a file into the secondary group turns on split view", async () => {
    vi.spyOn(api.files, "read").mockResolvedValue(
      fileContent("a.txt", "hello"),
    );

    await useEditorStore.getState().openFile(PROJECT_ID, "a.txt", "secondary");

    expect(useEditorStore.getState().isSplit).toBe(true);
    expect(useEditorStore.getState().secondaryTabs).toEqual(["a.txt"]);
    expect(useEditorStore.getState().activeSecondaryPath).toBe("a.txt");
  });

  it("updateContent() makes a tab dirty; saving clears it and patches the file tree", async () => {
    vi.spyOn(api.files, "read").mockResolvedValue(
      fileContent("a.txt", "hello"),
    );
    const writeSpy = vi
      .spyOn(api.files, "write")
      .mockResolvedValue(fileNode("a.txt", 11));

    await useEditorStore.getState().openFile(PROJECT_ID, "a.txt");
    expect(useEditorStore.getState().isDirty("a.txt")).toBe(false);

    useEditorStore.getState().updateContent("a.txt", "hello!");
    expect(useEditorStore.getState().isDirty("a.txt")).toBe(true);

    await useEditorStore.getState().saveFile(PROJECT_ID, "a.txt");

    expect(writeSpy).toHaveBeenCalledWith(PROJECT_ID, "a.txt", "hello!");
    expect(useEditorStore.getState().isDirty("a.txt")).toBe(false);
    expect(useWorkspaceStore.getState().fileTree).toEqual([
      fileNode("a.txt", 11),
    ]);
  });

  it("closeTab() drops the cached content only if not open in the other group", async () => {
    vi.spyOn(api.files, "read").mockResolvedValue(
      fileContent("a.txt", "hello"),
    );

    await useEditorStore.getState().openFile(PROJECT_ID, "a.txt", "primary");
    await useEditorStore.getState().openFile(PROJECT_ID, "a.txt", "secondary");

    useEditorStore.getState().closeTab("a.txt", "primary");
    expect(useEditorStore.getState().primaryTabs).toEqual([]);
    expect(useEditorStore.getState().openFiles["a.txt"]).toBeDefined();

    useEditorStore.getState().closeTab("a.txt", "secondary");
    expect(useEditorStore.getState().secondaryTabs).toEqual([]);
    expect(useEditorStore.getState().openFiles["a.txt"]).toBeUndefined();
  });

  it("closeSplit() clears the secondary group and turns off split view", async () => {
    vi.spyOn(api.files, "read").mockResolvedValue(
      fileContent("a.txt", "hello"),
    );
    await useEditorStore.getState().openFile(PROJECT_ID, "a.txt", "secondary");

    useEditorStore.getState().closeSplit();

    expect(useEditorStore.getState().isSplit).toBe(false);
    expect(useEditorStore.getState().secondaryTabs).toEqual([]);
    expect(useEditorStore.getState().activeSecondaryPath).toBeNull();
  });

  it("renamePath() migrates an open tab to its new path", async () => {
    vi.spyOn(api.files, "read").mockResolvedValue(
      fileContent("old.txt", "hello"),
    );
    await useEditorStore.getState().openFile(PROJECT_ID, "old.txt");
    useEditorStore.getState().updateContent("old.txt", "edited");

    useEditorStore.getState().renamePath("old.txt", "new.txt");

    expect(useEditorStore.getState().primaryTabs).toEqual(["new.txt"]);
    expect(useEditorStore.getState().activePrimaryPath).toBe("new.txt");
    expect(useEditorStore.getState().openFiles["old.txt"]).toBeUndefined();
    expect(useEditorStore.getState().openFiles["new.txt"]?.content).toBe(
      "edited",
    );
  });

  it("persists the tab layout to localStorage and restores it for the same project", async () => {
    vi.spyOn(api.files, "read").mockResolvedValue(
      fileContent("a.txt", "hello"),
    );
    await useEditorStore.getState().openFile(PROJECT_ID, "a.txt");

    const raw = localStorage.getItem(`anku:editor-layout:${PROJECT_ID}`);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!)).toMatchObject({
      primaryTabs: ["a.txt"],
      activePrimaryPath: "a.txt",
    });

    // Simulate a reload: reset in-memory state but keep localStorage, then
    // switch back to the same project.
    useEditorStore.setState({
      projectId: null,
      openFiles: {},
      primaryTabs: [],
      secondaryTabs: [],
      activePrimaryPath: null,
      activeSecondaryPath: null,
      isSplit: false,
    });

    await useEditorStore.getState().setProject(PROJECT_ID);

    expect(useEditorStore.getState().primaryTabs).toEqual(["a.txt"]);
    expect(useEditorStore.getState().activePrimaryPath).toBe("a.txt");
    expect(useEditorStore.getState().openFiles["a.txt"]?.content).toBe("hello");
  });
});
