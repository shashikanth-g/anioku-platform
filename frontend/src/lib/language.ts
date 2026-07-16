// Maps a file path's extension to a Monaco editor language id. Monaco ships
// full IntelliSense (via its bundled TypeScript language service) for
// "typescript"/"javascript" automatically once a model is tagged with that
// language — no extra wiring needed beyond getting this mapping right.
const EXTENSION_LANGUAGE: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  mts: "typescript",
  cts: "typescript",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  json: "json",
  css: "css",
  scss: "scss",
  less: "less",
  html: "html",
  htm: "html",
  md: "markdown",
  mdx: "markdown",
  py: "python",
  yml: "yaml",
  yaml: "yaml",
  toml: "ini",
  sql: "sql",
  sh: "shell",
  bash: "shell",
  dockerfile: "dockerfile",
  xml: "xml",
  go: "go",
  rs: "rust",
  java: "java",
  c: "c",
  h: "c",
  cpp: "cpp",
  hpp: "cpp",
  rb: "ruby",
  php: "php",
  txt: "plaintext",
};

export function getLanguageForPath(path: string): string {
  const filename = path.split("/").pop() ?? path;
  if (filename.toLowerCase() === "dockerfile") return "dockerfile";
  const ext = filename.includes(".")
    ? filename.split(".").pop()!.toLowerCase()
    : "";
  return EXTENSION_LANGUAGE[ext] ?? "plaintext";
}
