"use client";

import { useEffect, useRef } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";

import { useEditorStore, type TabGroup } from "@/stores/useEditorStore";

export default function MonacoWrapper({
  projectId,
  group,
}: {
  projectId: string;
  group: TabGroup;
}) {
  const activePrimaryPath = useEditorStore((s) => s.activePrimaryPath);
  const activeSecondaryPath = useEditorStore((s) => s.activeSecondaryPath);
  const openFiles = useEditorStore((s) => s.openFiles);
  const updateContent = useEditorStore((s) => s.updateContent);
  const saveFile = useEditorStore((s) => s.saveFile);

  const activePath =
    group === "primary" ? activePrimaryPath : activeSecondaryPath;
  const file = activePath ? openFiles[activePath] : undefined;

  // The Monaco instance persists across file switches within this pane (that's
  // what the `path` prop's multi-model support gives us), so onMount only
  // fires once — a command registered there would otherwise close over a
  // stale activePath from whenever the editor first mounted. Ref it instead.
  const activePathRef = useRef(activePath);
  useEffect(() => {
    activePathRef.current = activePath;
  }, [activePath]);

  const handleMount: OnMount = (editor, monaco) => {
    const compilerOptions = {
      target: monaco.languages.typescript.ScriptTarget.ESNext,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
      allowJs: true,
      allowNonTsExtensions: true,
      esModuleInterop: true,
      strict: false,
    };
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions(
      compilerOptions,
    );
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions(
      compilerOptions,
    );

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      const path = activePathRef.current;
      if (path) void saveFile(projectId, path);
    });
  };

  if (!activePath || !file) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Select a file to start editing.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden">
      <Editor
        path={file.path}
        language={file.language}
        value={file.content}
        theme="vs-dark"
        onChange={(value) => updateContent(file.path, value ?? "")}
        onMount={handleMount}
        options={{
          minimap: { enabled: true },
          fontSize: 13,
          automaticLayout: true,
          scrollBeyondLastLine: false,
        }}
      />
    </div>
  );
}
