// TODO(follow-up milestone): wraps @monaco-editor/react, wired to
// useEditorStore for the active file's content, language detection, save
// (Cmd/Ctrl+S -> PUT), and change events. Layout-only placeholder for now.

export default function MonacoWrapper() {
  return (
    <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
      Select a file to start editing.
    </div>
  );
}
