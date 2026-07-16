// Minimal .gitignore pattern matcher — enough for FileTree's dimming feature,
// not a spec-complete implementation (no negation `!` support, no `**`
// edge cases beyond the common "match any depth" case).
interface GitignoreRule {
  regex: RegExp;
  dirOnly: boolean;
  anchored: boolean;
}

function patternToRegex(pattern: string): RegExp {
  let re = "";
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === undefined) continue;
    if (c === "*") {
      if (pattern[i + 1] === "*") {
        re += ".*";
        i++;
        if (pattern[i + 1] === "/") i++;
      } else {
        re += "[^/]*";
      }
    } else if (c === "?") {
      re += "[^/]";
    } else if (".+^${}()|[]\\".includes(c)) {
      re += `\\${c}`;
    } else {
      re += c;
    }
  }
  return new RegExp(`^${re}$`);
}

export function parseGitignore(
  content: string,
): (path: string, isDir: boolean) => boolean {
  const rules: GitignoreRule[] = [];

  for (const rawLine of content.split("\n")) {
    let line = rawLine.trim();
    if (!line || line.startsWith("#") || line.startsWith("!")) continue;

    let dirOnly = false;
    if (line.endsWith("/")) {
      dirOnly = true;
      line = line.slice(0, -1);
    }

    let anchored = line.includes("/");
    if (line.startsWith("/")) {
      line = line.slice(1);
    }
    // A pattern with no interior slash matches at any depth (unanchored);
    // one that does contain a slash is anchored to the gitignore's location
    // (the project root, since we only support a single root .gitignore).
    anchored = line.includes("/") || anchored;

    if (!line) continue;
    rules.push({ regex: patternToRegex(line), dirOnly, anchored });
  }

  return function isIgnored(path: string, isDir: boolean): boolean {
    if (rules.length === 0) return false;
    const segments = path.split("/");

    for (let end = 1; end <= segments.length; end++) {
      const prefix = segments.slice(0, end).join("/");
      const isLastSegment = end === segments.length;
      const prefixIsDir = !isLastSegment || isDir;
      const lastPart = segments[end - 1] ?? "";

      for (const rule of rules) {
        if (rule.dirOnly && !prefixIsDir) continue;
        if (
          rule.anchored ? rule.regex.test(prefix) : rule.regex.test(lastPart)
        ) {
          return true;
        }
      }
    }
    return false;
  };
}
