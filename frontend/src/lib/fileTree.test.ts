import { describe, expect, it } from "vitest";

import { buildFileTree } from "@/lib/fileTree";
import type { FileNode } from "@/types";

function node(path: string, isDir: boolean, size = 0): FileNode {
  return { path, is_dir: isDir, size, updated_at: "2026-01-01T00:00:00Z" };
}

describe("buildFileTree", () => {
  it("nests files under their parent directories", () => {
    const flat: FileNode[] = [
      node("README.md", false, 10),
      node("src", true),
      node("src/index.ts", false, 20),
      node("src/components", true),
      node("src/components/App.tsx", false, 30),
    ];

    const tree = buildFileTree(flat);

    expect(tree.map((n) => n.path)).toEqual(["src", "README.md"]);
    const src = tree.find((n) => n.path === "src")!;
    expect(src.children.map((c) => c.path)).toEqual([
      "src/components",
      "src/index.ts",
    ]);
    const components = src.children.find((c) => c.path === "src/components")!;
    expect(components.children.map((c) => c.path)).toEqual([
      "src/components/App.tsx",
    ]);
  });

  it("sorts directories before files, then alphabetically", () => {
    const flat: FileNode[] = [
      node("b.txt", false),
      node("a.txt", false),
      node("zdir", true),
      node("adir", true),
    ];

    const tree = buildFileTree(flat);

    expect(tree.map((n) => n.path)).toEqual(["adir", "zdir", "a.txt", "b.txt"]);
  });

  it("synthesizes missing intermediate directories", () => {
    // "src/deep/nested.ts" implies a "src" and "src/deep" directory, even if
    // the flat list (e.g. from a stale/partial fetch) never listed them.
    const flat: FileNode[] = [node("src/deep/nested.ts", false)];

    const tree = buildFileTree(flat);

    expect(tree).toHaveLength(1);
    expect(tree[0]!.path).toBe("src");
    expect(tree[0]!.isDir).toBe(true);
    expect(tree[0]!.children[0]!.path).toBe("src/deep");
    expect(tree[0]!.children[0]!.children[0]!.path).toBe("src/deep/nested.ts");
  });

  it("returns an empty tree for an empty file list", () => {
    expect(buildFileTree([])).toEqual([]);
  });
});
