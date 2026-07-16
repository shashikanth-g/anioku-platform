import Breadcrumbs from "@/components/editor/Breadcrumbs";
import EditorTabs from "@/components/editor/EditorTabs";
import MonacoWrapper from "@/components/editor/MonacoWrapper";
import type { TabGroup } from "@/stores/useEditorStore";

export default function EditorPane({
  projectId,
  group,
}: {
  projectId: string;
  group: TabGroup;
}) {
  return (
    <div className="flex h-full flex-col">
      <EditorTabs projectId={projectId} group={group} />
      <Breadcrumbs group={group} />
      <MonacoWrapper projectId={projectId} group={group} />
    </div>
  );
}
