import type { FileNode } from "@/types";

export interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  size: number;
  updatedAt: string;
  children: TreeNode[];
}

// Builds a nested tree from the flat FileNode[] the backend returns. Every
// directory is expected to already have its own explicit FileNode row (the
// backend's file_service maintains ancestor directory rows on every write),
// but this defensively synthesizes any missing intermediate directory nodes
// rather than assuming that invariant always holds.
export function buildFileTree(nodes: FileNode[]): TreeNode[] {
  const byPath = new Map<string, TreeNode>();

  function getOrCreate(path: string): TreeNode {
    let node = byPath.get(path);
    if (!node) {
      node = {
        name: path.split("/").pop() ?? path,
        path,
        isDir: true,
        size: 0,
        updatedAt: "",
        children: [],
      };
      byPath.set(path, node);
    }
    return node;
  }

  for (const n of nodes) {
    const node = getOrCreate(n.path);
    node.isDir = n.is_dir;
    node.size = n.size;
    node.updatedAt = n.updated_at;
  }

  const roots: TreeNode[] = [];
  const linked = new Set<string>();

  function link(node: TreeNode) {
    if (linked.has(node.path)) return;
    linked.add(node.path);
    const idx = node.path.lastIndexOf("/");
    if (idx === -1) {
      roots.push(node);
      return;
    }
    const parent = getOrCreate(node.path.slice(0, idx));
    parent.children.push(node);
    link(parent);
  }

  for (const node of Array.from(byPath.values())) {
    link(node);
  }

  sortTree(roots);
  return roots;
}

function sortTree(nodes: TreeNode[]): void {
  nodes.sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  for (const node of nodes) {
    if (node.children.length > 0) sortTree(node.children);
  }
}

export function flattenFiles(nodes: FileNode[]): FileNode[] {
  return nodes.filter((n) => !n.is_dir);
}
