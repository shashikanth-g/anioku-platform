"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  File,
  Folder,
  FolderOpen,
} from "lucide-react";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { api, ApiError } from "@/lib/api";
import { buildFileTree, type TreeNode } from "@/lib/fileTree";
import { parseGitignore } from "@/lib/gitignore";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/stores/useEditorStore";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";

interface PendingCreate {
  parentPath: string;
  isDir: boolean;
}

function basename(path: string): string {
  return path.split("/").pop() ?? path;
}

function joinPath(parent: string, name: string): string {
  return parent ? `${parent}/${name}` : name;
}

export default function FileTree({ projectId }: { projectId: string }) {
  const fileTree = useWorkspaceStore((s) => s.fileTree);
  const fileTreeStatus = useWorkspaceStore((s) => s.fileTreeStatus);
  const fetchFileTree = useWorkspaceStore((s) => s.fetchFileTree);
  const createFileEntry = useWorkspaceStore((s) => s.createFileEntry);
  const deleteFileEntry = useWorkspaceStore((s) => s.deleteFileEntry);
  const renameFileEntry = useWorkspaceStore((s) => s.renameFileEntry);

  const openFile = useEditorStore((s) => s.openFile);
  const closeTab = useEditorStore((s) => s.closeTab);
  const renameOpenPath = useEditorStore((s) => s.renamePath);
  const activePrimaryPath = useEditorStore((s) => s.activePrimaryPath);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [pendingCreate, setPendingCreate] = useState<PendingCreate | null>(
    null,
  );
  const [createValue, setCreateValue] = useState("");
  const [draggedPath, setDraggedPath] = useState<string | null>(null);
  const [dragOverPath, setDragOverPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isIgnored, setIsIgnored] = useState<
    ((path: string, isDir: boolean) => boolean) | null
  >(null);

  useEffect(() => {
    void fetchFileTree(projectId);
  }, [projectId, fetchFileTree]);

  useEffect(() => {
    const gitignoreNode = fileTree.find(
      (n) => n.path === ".gitignore" && !n.is_dir,
    );
    if (!gitignoreNode) {
      setIsIgnored(null);
      return;
    }
    let cancelled = false;
    api.files
      .read(projectId, ".gitignore")
      .then((file) => {
        if (!cancelled) setIsIgnored(() => parseGitignore(file.content));
      })
      .catch(() => {
        if (!cancelled) setIsIgnored(null);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, fileTree]);

  const tree = useMemo(() => buildFileTree(fileTree), [fileTree]);

  function toggleExpanded(path: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  async function handleOpenFile(
    path: string,
    group: "primary" | "secondary" = "primary",
  ) {
    try {
      await openFile(projectId, path, group);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to open file.");
    }
  }

  function startRename(node: TreeNode) {
    setRenamingPath(node.path);
    setRenameValue(node.name);
  }

  async function commitRename(node: TreeNode) {
    const parent = node.path.includes("/")
      ? node.path.slice(0, node.path.lastIndexOf("/"))
      : "";
    const newPath = joinPath(parent, renameValue.trim());
    setRenamingPath(null);
    if (!renameValue.trim() || newPath === node.path) return;
    try {
      await renameFileEntry(projectId, node.path, newPath);
      renameOpenPath(node.path, newPath);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to rename.");
    }
  }

  function startCreate(parentPath: string, isDir: boolean) {
    setExpanded((prev) => new Set(prev).add(parentPath));
    setPendingCreate({ parentPath, isDir });
    setCreateValue("");
  }

  async function commitCreate() {
    if (!pendingCreate) return;
    const { parentPath, isDir } = pendingCreate;
    const name = createValue.trim();
    setPendingCreate(null);
    if (!name) return;
    try {
      await createFileEntry(projectId, joinPath(parentPath, name), isDir);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create.");
    }
  }

  async function handleDelete(node: TreeNode) {
    if (!window.confirm(`Delete ${node.path}?`)) return;
    try {
      await deleteFileEntry(projectId, node.path);
      closeTab(node.path, "primary");
      closeTab(node.path, "secondary");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete.");
    }
  }

  async function handleDrop(targetDirPath: string, draggedFrom: string) {
    setDragOverPath(null);
    setDraggedPath(null);
    if (!draggedFrom) return;
    const newPath = joinPath(targetDirPath, basename(draggedFrom));
    if (newPath === draggedFrom || newPath.startsWith(`${draggedFrom}/`))
      return;
    const currentParent = draggedFrom.includes("/")
      ? draggedFrom.slice(0, draggedFrom.lastIndexOf("/"))
      : "";
    if (currentParent === targetDirPath) return;
    try {
      await renameFileEntry(projectId, draggedFrom, newPath);
      renameOpenPath(draggedFrom, newPath);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to move.");
    }
  }

  function renderCreateRow(parentPath: string, depth: number) {
    if (!pendingCreate || pendingCreate.parentPath !== parentPath) return null;
    return (
      <input
        autoFocus
        className="w-full bg-transparent px-1 text-xs outline-none ring-1 ring-primary"
        style={{ paddingLeft: `${depth * 12 + 20}px` }}
        value={createValue}
        placeholder={pendingCreate.isDir ? "folder name" : "file name"}
        onChange={(e) => setCreateValue(e.target.value)}
        onBlur={commitCreate}
        onKeyDown={(e) => {
          if (e.key === "Enter") void commitCreate();
          if (e.key === "Escape") setPendingCreate(null);
        }}
      />
    );
  }

  function renderNode(node: TreeNode, depth: number) {
    const ignored = isIgnored?.(node.path, node.isDir) ?? false;
    const isRenaming = renamingPath === node.path;
    const isActive = node.path === activePrimaryPath;
    const isExpanded = expanded.has(node.path);
    const isDragOver = dragOverPath === node.path;

    const row = (
      <div
        key={node.path}
        draggable={!isRenaming}
        onDragStart={(e) => {
          e.stopPropagation();
          setDraggedPath(node.path);
        }}
        onDragOver={(e) => {
          if (!node.isDir) return;
          e.preventDefault();
          e.stopPropagation();
          setDragOverPath(node.path);
        }}
        onDragLeave={() => setDragOverPath((p) => (p === node.path ? null : p))}
        onDrop={(e) => {
          if (!node.isDir) return;
          e.preventDefault();
          e.stopPropagation();
          void handleDrop(node.path, draggedPath ?? "");
        }}
        className={cn(
          "flex cursor-pointer select-none items-center gap-1 rounded px-1 py-0.5 text-xs hover:bg-accent",
          isActive && "bg-accent font-medium",
          ignored && "opacity-40",
          isDragOver && "outline outline-1 outline-primary",
        )}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
        onClick={() =>
          node.isDir
            ? toggleExpanded(node.path)
            : void handleOpenFile(node.path)
        }
      >
        {node.isDir ? (
          <>
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            )}
            {isExpanded ? (
              <FolderOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            ) : (
              <Folder className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            )}
          </>
        ) : (
          <File className="ml-[18px] h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
        {isRenaming ? (
          <input
            autoFocus
            className="w-full bg-transparent px-1 outline-none ring-1 ring-primary"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onBlur={() => void commitRename(node)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void commitRename(node);
              if (e.key === "Escape") setRenamingPath(null);
            }}
          />
        ) : (
          <span className="truncate">{node.name}</span>
        )}
      </div>
    );

    return (
      <ContextMenu key={node.path}>
        <ContextMenuTrigger asChild>{row}</ContextMenuTrigger>
        <ContextMenuContent>
          {node.isDir ? (
            <>
              <ContextMenuItem onSelect={() => startCreate(node.path, false)}>
                New File
              </ContextMenuItem>
              <ContextMenuItem onSelect={() => startCreate(node.path, true)}>
                New Folder
              </ContextMenuItem>
            </>
          ) : (
            <ContextMenuItem
              onSelect={() => void handleOpenFile(node.path, "secondary")}
            >
              Open to the Side
            </ContextMenuItem>
          )}
          <ContextMenuItem onSelect={() => startRename(node)}>
            Rename
          </ContextMenuItem>
          <ContextMenuItem
            variant="destructive"
            onSelect={() => void handleDelete(node)}
          >
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  }

  function renderTree(nodes: TreeNode[], depth: number): React.ReactNode[] {
    const out: React.ReactNode[] = [];
    for (const node of nodes) {
      out.push(renderNode(node, depth));
      if (node.isDir && expanded.has(node.path)) {
        out.push(renderCreateRow(node.path, depth + 1));
        out.push(...renderTree(node.children, depth + 1));
      }
    }
    return out;
  }

  if (fileTreeStatus === "loading" || fileTreeStatus === "idle") {
    return (
      <div className="px-2 py-4 text-center text-xs text-muted-foreground">
        Loading files...
      </div>
    );
  }

  if (fileTreeStatus === "error") {
    return (
      <div className="px-2 py-4 text-center text-xs text-destructive">
        Failed to load files.
      </div>
    );
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className="min-h-full py-1"
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverPath("");
          }}
          onDrop={(e) => {
            e.preventDefault();
            void handleDrop("", draggedPath ?? "");
          }}
        >
          {tree.length === 0 ? (
            <p className="px-2 py-4 text-center text-xs text-muted-foreground">
              No files yet.
            </p>
          ) : (
            renderTree(tree, 0)
          )}
          {renderCreateRow("", 0)}
          {error ? (
            <p
              className="px-2 py-2 text-xs text-destructive"
              onClick={() => setError(null)}
            >
              {error}
            </p>
          ) : null}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onSelect={() => startCreate("", false)}>
          New File
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => startCreate("", true)}>
          New Folder
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
