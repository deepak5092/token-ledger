import { ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";

export function TrustSection() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <Card className="flex items-start gap-4 sm:p-6">
        <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-accent" aria-hidden />
        <div>
          <h2 className="font-medium text-foreground">A note on trust</h2>
          <p className="mt-1 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
            This is a demo project, not a security-audited product. Provider
            keys are encrypted via Supabase Vault and decrypted only
            server-side; never sent to your browser. Use a scoped,
            rotatable, low-spend key wherever your provider supports one.
          </p>
        </div>
      </Card>
    </section>
  );
}
