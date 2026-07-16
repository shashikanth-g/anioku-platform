import { CircleDot, GitBranch } from "lucide-react";

import { ThemeToggle } from "@/components/theme/ThemeToggle";
import type { ContainerStatus } from "@/types";

const STATUS_COLOR: Record<ContainerStatus, string> = {
  running: "text-green-500",
  starting: "text-yellow-500",
  stopped: "text-muted-foreground",
  error: "text-destructive",
};

export default function StatusBar({
  containerStatus,
}: {
  containerStatus?: ContainerStatus;
}) {
  return (
    <footer className="flex h-6 shrink-0 items-center justify-between border-t bg-muted/40 px-3 text-xs text-muted-foreground">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1">
          <GitBranch className="h-3.5 w-3.5" />
          main
        </span>
        {containerStatus ? (
          <span
            className={`flex items-center gap-1 ${STATUS_COLOR[containerStatus]}`}
          >
            <CircleDot className="h-3.5 w-3.5" />
            {containerStatus}
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-4">
        <span>Plain Text</span>
        <span>Ln 1, Col 1</span>
        <ThemeToggle />
      </div>
    </footer>
  );
}
