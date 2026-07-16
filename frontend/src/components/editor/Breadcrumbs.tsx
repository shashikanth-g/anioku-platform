"use client";

import { ChevronRight } from "lucide-react";

import { useEditorStore, type TabGroup } from "@/stores/useEditorStore";

export default function Breadcrumbs({ group }: { group: TabGroup }) {
  const activePrimaryPath = useEditorStore((s) => s.activePrimaryPath);
  const activeSecondaryPath = useEditorStore((s) => s.activeSecondaryPath);
  const activePath =
    group === "primary" ? activePrimaryPath : activeSecondaryPath;

  if (!activePath) return null;

  const segments = activePath.split("/");

  return (
    <div className="flex h-6 shrink-0 items-center gap-1 border-b px-3 text-xs text-muted-foreground">
      {segments.map((segment, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 ? <ChevronRight className="h-3 w-3" /> : null}
          <span
            className={
              i === segments.length - 1 ? "text-foreground" : undefined
            }
          >
            {segment}
          </span>
        </span>
      ))}
    </div>
  );
}
