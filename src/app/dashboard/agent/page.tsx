import { ChatPanel } from "./ChatPanel";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function AgentPage() {
  return (
    <div className="relative h-[calc(100dvh-8rem)]">
      <div className="absolute top-0 right-0 z-10">
        <ThemeToggle />
      </div>
      <ChatPanel />
    </div>
  );
}
