import { describe, expect, it } from "vitest";

import { parseGitignore } from "@/lib/gitignore";

describe("parseGitignore", () => {
  it("matches an exact filename anywhere in the tree", () => {
    const isIgnored = parseGitignore(".env\n");
    expect(isIgnored(".env", false)).toBe(true);
    expect(isIgnored("nested/.env", false)).toBe(true);
    expect(isIgnored("nested/.env.example", false)).toBe(false);
  });

  it("matches a directory-only pattern and everything inside it", () => {
    const isIgnored = parseGitignore("node_modules/\n");
    expect(isIgnored("node_modules", true)).toBe(true);
    expect(isIgnored("node_modules", false)).toBe(false);
    expect(isIgnored("node_modules/some-pkg/index.js", false)).toBe(true);
    expect(isIgnored("src/node_modules/x.js", false)).toBe(true);
  });

  it("supports a single * wildcard", () => {
    const isIgnored = parseGitignore("*.log\n");
    expect(isIgnored("debug.log", false)).toBe(true);
    expect(isIgnored("nested/debug.log", false)).toBe(true);
    expect(isIgnored("debug.log.txt", false)).toBe(false);
  });

  it("anchors a pattern containing a slash to the root", () => {
    const isIgnored = parseGitignore("/dist\n");
    expect(isIgnored("dist", true)).toBe(true);
    expect(isIgnored("nested/dist", true)).toBe(false);
  });

  it("ignores comments and blank lines", () => {
    const isIgnored = parseGitignore("# comment\n\n*.log\n");
    expect(isIgnored("a.log", false)).toBe(true);
    expect(isIgnored("# comment", false)).toBe(false);
  });

  it("returns false for everything when there are no rules", () => {
    const isIgnored = parseGitignore("");
    expect(isIgnored("anything", false)).toBe(false);
  });
});
