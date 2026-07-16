"use client";

import { SplitSquareHorizontal, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useEditorStore, type TabGroup } from "@/stores/useEditorStore";

function basename(path: string): string {
  return path.split("/").pop() ?? path;
}

export default function EditorTabs({
  projectId,
  group,
}: {
  projectId: string;
  group: TabGroup;
}) {
  const primaryTabs = useEditorStore((s) => s.primaryTabs);
  const secondaryTabs = useEditorStore((s) => s.secondaryTabs);
  const activePrimaryPath = useEditorStore((s) => s.activePrimaryPath);
  const activeSecondaryPath = useEditorStore((s) => s.activeSecondaryPath);
  const isDirty = useEditorStore((s) => s.isDirty);
  const setActiveTab = useEditorStore((s) => s.setActiveTab);
  const closeTab = useEditorStore((s) => s.closeTab);
  const openFile = useEditorStore((s) => s.openFile);
  const isSplit = useEditorStore((s) => s.isSplit);
  const closeSplit = useEditorStore((s) => s.closeSplit);
  // Subscribing to openFiles keeps tab labels/dirty dots in sync with content
  // edits even though this component only reads derived values via isDirty().
  useEditorStore((s) => s.openFiles);

  const tabs = group === "primary" ? primaryTabs : secondaryTabs;
  const activePath =
    group === "primary" ? activePrimaryPath : activeSecondaryPath;

  function handleSplitToggle() {
    if (isSplit) {
      closeSplit();
    } else if (activePrimaryPath) {
      void openFile(projectId, activePrimaryPath, "secondary");
    }
  }

  if (tabs.length === 0) {
    return (
      <div className="flex h-9 items-center border-b px-3 text-xs text-muted-foreground">
        No files open
      </div>
    );
  }

  return (
    <div className="flex h-9 items-center justify-between border-b">
      <div className="flex h-full flex-1 overflow-x-auto">
        {tabs.map((path) => {
          const dirty = isDirty(path);
          return (
            <div
              key={path}
              onClick={() => setActiveTab(path, group)}
              onMouseDown={(e) => {
                if (e.button === 1) {
                  e.preventDefault();
                  closeTab(path, group);
                }
              }}
              className={cn(
                "group flex h-full shrink-0 cursor-pointer items-center gap-2 border-r px-3 text-xs",
                path === activePath
                  ? "bg-background text-foreground"
                  : "text-muted-foreground hover:bg-accent/50",
              )}
              title={path}
            >
              <span className="max-w-[160px] truncate">{basename(path)}</span>
              <span className="relative flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full bg-foreground",
                    dirty ? "group-hover:opacity-0" : "opacity-0",
                  )}
                />
                <button
                  type="button"
                  className="absolute inset-0 flex items-center justify-center rounded opacity-0 hover:bg-muted group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(path, group);
                  }}
                  aria-label={`Close ${basename(path)}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            </div>
          );
        })}
      </div>
      {group === "primary" ? (
        <button
          type="button"
          className="mx-2 flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
          onClick={handleSplitToggle}
          aria-label={isSplit ? "Close split editor" : "Split editor"}
          title={isSplit ? "Close split editor" : "Split editor"}
        >
          <SplitSquareHorizontal className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}
