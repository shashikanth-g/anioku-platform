// TODO(follow-up milestone): lazy-loaded from GET /api/v1/projects/{id}/files,
// create/rename/delete via context menu, drag-and-drop move, .gitignore-aware
// dimming. Layout-only placeholder for now (Milestone 3).

export default function FileTree() {
  return (
    <div className="px-2 py-4 text-center text-xs text-muted-foreground">
      File tree will appear here once a project&apos;s files are loaded.
    </div>
  );
}
