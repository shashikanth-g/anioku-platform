"use client";

import {
  CommandDialog,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useEditorStore } from "@/stores/useEditorStore";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";

export default function QuickOpenDialog({
  projectId,
  open,
  onOpenChange,
}: {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const fileTree = useWorkspaceStore((s) => s.fileTree);
  const openFile = useEditorStore((s) => s.openFile);

  const files = fileTree.filter((n) => !n.is_dir);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search files by name..." />
      <CommandList>
        <CommandEmpty>No matching files.</CommandEmpty>
        {files.map((file) => (
          <CommandItem
            key={file.path}
            value={file.path}
            onSelect={() => {
              void openFile(projectId, file.path);
              onOpenChange(false);
            }}
          >
            {file.path}
          </CommandItem>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
