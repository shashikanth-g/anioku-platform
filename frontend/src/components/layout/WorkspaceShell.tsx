"use client";

import { useEffect, useRef } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import type { ImperativePanelHandle } from "react-resizable-panels";

import Breadcrumbs from "@/components/editor/Breadcrumbs";
import EditorTabs from "@/components/editor/EditorTabs";
import MonacoWrapper from "@/components/editor/MonacoWrapper";
import BottomPanel from "@/components/layout/BottomPanel";
import RightPanel from "@/components/layout/RightPanel";
import Sidebar from "@/components/layout/Sidebar";
import StatusBar from "@/components/layout/StatusBar";
import type { ContainerStatus } from "@/types";

const HANDLE_CLASSNAME =
  "w-px bg-border transition-colors hover:bg-primary data-[resize-handle-active]:bg-primary";
const HORIZONTAL_HANDLE_CLASSNAME =
  "h-px bg-border transition-colors hover:bg-primary data-[resize-handle-active]:bg-primary";

export default function WorkspaceShell({
  containerStatus,
}: {
  containerStatus?: ContainerStatus;
}) {
  const sidebarRef = useRef<ImperativePanelHandle>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const isModifierPressed = e.metaKey || e.ctrlKey;
      if (!isModifierPressed) return;

      if (e.key.toLowerCase() === "b") {
        e.preventDefault();
        const panel = sidebarRef.current;
        if (!panel) return;
        if (panel.isCollapsed()) {
          panel.expand();
        } else {
          panel.collapse();
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

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
            <Sidebar />
          </Panel>
          <PanelResizeHandle className={HANDLE_CLASSNAME} />

          <Panel id="main" order={2} defaultSize={82 - 22} minSize={30}>
            <PanelGroup direction="vertical">
              <Panel id="editor" order={1} defaultSize={70} minSize={20}>
                <div className="flex h-full flex-col">
                  <EditorTabs />
                  <Breadcrumbs />
                  <MonacoWrapper />
                </div>
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
    </div>
  );
}
