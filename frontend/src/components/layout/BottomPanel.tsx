// Terminal/Problems tab strip for the IDE shell's bottom panel. Real
// xterm.js wiring lands in components/terminal/TerminalPanel.tsx (Phase 3);
// this only owns the tab chrome so the layout has somewhere to put it.
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function BottomPanel() {
  return (
    <Tabs defaultValue="terminal" className="flex h-full flex-col">
      <div className="border-b px-2 py-1">
        <TabsList className="h-7">
          <TabsTrigger value="terminal" className="text-xs">
            Terminal
          </TabsTrigger>
          <TabsTrigger value="problems" className="text-xs">
            Problems
          </TabsTrigger>
        </TabsList>
      </div>
      <TabsContent
        value="terminal"
        className="mt-0 flex-1 overflow-y-auto p-3 text-xs text-muted-foreground"
      >
        The integrated terminal arrives in Phase 3.
      </TabsContent>
      <TabsContent
        value="problems"
        className="mt-0 flex-1 overflow-y-auto p-3 text-xs text-muted-foreground"
      >
        No problems detected.
      </TabsContent>
    </Tabs>
  );
}
