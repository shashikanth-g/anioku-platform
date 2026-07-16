// AI Chat panel shell for the IDE's right sidebar. Real streaming chat lands
// in components/chat/AIChatPanel.tsx (Phase 4); this only owns the layout
// chrome so the panel has somewhere to live and can be collapsed/expanded now.

export default function RightPanel() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        AI Chat
      </div>
      <div className="flex flex-1 items-center justify-center p-4 text-center text-xs text-muted-foreground">
        The AI chat panel arrives in Phase 4.
      </div>
    </div>
  );
}
