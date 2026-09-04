import { ChatPanel } from "./ChatPanel";
import { ThemeToggle } from "@/components/ThemeToggle";

// Cancels dashboard/layout.tsx's <main> wrapper padding (-m-6/-m-8) so this
// page can fill the real viewport edge to edge -- a chat UI needs the input
// box flush against the bottom and its own internal scroll regions
// (message list, conversation sidebar), not the whole page scrolling with
// dead space below the input. Height is the mobile sticky top bar's own
// height (see SidebarNav.tsx) subtracted from the viewport on small
// screens, where that bar sits in normal flow above <main>; lg+ hides that
// bar and fixes the real sidebar out of flow, so <main> starts at the
// viewport's true top there and 100dvh fits exactly.
export default function AgentPage() {
  return (
    <div className="relative -m-6 flex h-[calc(100dvh-3.75rem)] flex-col lg:-m-8 lg:h-dvh">
      <div className="absolute top-2 right-2 z-10 lg:top-4 lg:right-4">
        <ThemeToggle />
      </div>
      <ChatPanel />
    </div>
  );
}
