import FileTree from "@/components/editor/FileTree";

export default function Sidebar({ projectId }: { projectId: string }) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Explorer
      </div>
      <div className="flex-1 overflow-y-auto">
        <FileTree projectId={projectId} />
      </div>
    </div>
  );
}
