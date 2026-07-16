// TODO(follow-up milestone): open-file tabs backed by useEditorStore —
// dirty-dot on unsaved, middle-click close. Layout-only placeholder for now.

export default function EditorTabs() {
  return (
    <div className="flex h-9 items-center border-b px-3 text-xs text-muted-foreground">
      No files open
    </div>
  );
}
