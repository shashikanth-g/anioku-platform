"use client";

import { useEffect, useRef, useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import type { ImperativePanelHandle } from "react-resizable-panels";

import EditorPane from "@/components/editor/EditorPane";
import QuickOpenDialog from "@/components/editor/QuickOpenDialog";
import BottomPanel from "@/components/layout/BottomPanel";
import RightPanel from "@/components/layout/RightPanel";
import Sidebar from "@/components/layout/Sidebar";
import StatusBar from "@/components/layout/StatusBar";
import { useEditorStore } from "@/stores/useEditorStore";
import type { ContainerStatus } from "@/types";

const HANDLE_CLASSNAME =
  "w-px bg-border transition-colors hover:bg-primary data-[resize-handle-active]:bg-primary";
const HORIZONTAL_HANDLE_CLASSNAME =
  "h-px bg-border transition-colors hover:bg-primary data-[resize-handle-active]:bg-primary";

export default function WorkspaceShell({
  projectId,
  containerStatus,
}: {
  projectId: string;
  containerStatus?: ContainerStatus;
}) {
  const sidebarRef = useRef<ImperativePanelHandle>(null);
  const isSplit = useEditorStore((s) => s.isSplit);
  const setProject = useEditorStore((s) => s.setProject);
  const saveAllDirty = useEditorStore((s) => s.saveAllDirty);
  const [quickOpenOpen, setQuickOpenOpen] = useState(false);

  useEffect(() => {
    void setProject(projectId);
  }, [projectId, setProject]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const isModifierPressed = e.metaKey || e.ctrlKey;
      if (!isModifierPressed) return;
      const key = e.key.toLowerCase();

      if (key === "b") {
        e.preventDefault();
        const panel = sidebarRef.current;
        if (!panel) return;
        if (panel.isCollapsed()) panel.expand();
        else panel.collapse();
        return;
      }

      if (key === "p") {
        e.preventDefault();
        setQuickOpenOpen((v) => !v);
        return;
      }

      if (key === "s") {
        e.preventDefault();
        void saveAllDirty(projectId);
        return;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [projectId, saveAllDirty]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="horizontal">
          <Panel
            ref={sidebarRef}
            id="sidebar"
            order={1}
            collapsible
            collapsedSize={0}
            defaultSize={18}
            minSize={12}
            maxSize={30}
          >
            <Sidebar projectId={projectId} />
          </Panel>
          <PanelResizeHandle className={HANDLE_CLASSNAME} />

          <Panel id="main" order={2} defaultSize={82 - 22} minSize={30}>
            <PanelGroup direction="vertical">
              <Panel id="editor" order={1} defaultSize={70} minSize={20}>
                {isSplit ? (
                  <PanelGroup direction="horizontal">
                    <Panel
                      id="editor-primary"
                      order={1}
                      defaultSize={50}
                      minSize={20}
                    >
                      <EditorPane projectId={projectId} group="primary" />
                    </Panel>
                    <PanelResizeHandle className={HANDLE_CLASSNAME} />
                    <Panel
                      id="editor-secondary"
                      order={2}
                      defaultSize={50}
                      minSize={20}
                    >
                      <EditorPane projectId={projectId} group="secondary" />
                    </Panel>
                  </PanelGroup>
                ) : (
                  <EditorPane projectId={projectId} group="primary" />
                )}
              </Panel>
              <PanelResizeHandle className={HORIZONTAL_HANDLE_CLASSNAME} />
              <Panel
                id="bottom"
                order={2}
                collapsible
                collapsedSize={0}
                defaultSize={30}
                minSize={10}
                maxSize={70}
              >
                <BottomPanel />
              </Panel>
            </PanelGroup>
          </Panel>

          <PanelResizeHandle className={HANDLE_CLASSNAME} />
          <Panel
            id="right"
            order={3}
            collapsible
            collapsedSize={0}
            defaultSize={22}
            minSize={15}
            maxSize={40}
          >
            <RightPanel />
          </Panel>
        </PanelGroup>
      </div>
      <StatusBar containerStatus={containerStatus} />
      <QuickOpenDialog
        projectId={projectId}
        open={quickOpenOpen}
        onOpenChange={setQuickOpenOpen}
      />
    </div>
  );
}
