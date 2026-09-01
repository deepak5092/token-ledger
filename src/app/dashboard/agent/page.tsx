import Link from "next/link";
import { ChatPanel } from "./ChatPanel";

export default function AgentPage() {
  return (
    <div className="min-h-screen bg-zinc-50 p-8 dark:bg-black">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
          Ask about your spend
        </h1>
        <Link href="/dashboard" className="text-sm font-medium underline">
          Back to dashboard
        </Link>
      </div>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
        A tool-using Claude agent answers questions grounded in your own
        synced usage data — it queries <code className="font-mono">usage_records</code>{" "}
        for every answer rather than guessing.
      </p>

      <div className="mt-8">
        <ChatPanel />
      </div>
    </div>
  );
}
