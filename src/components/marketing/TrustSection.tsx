import { ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";

export function TrustSection() {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-12 space-y-4">
      <Card className="flex items-start gap-4 sm:p-6">
        <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-accent" aria-hidden />
        <div>
          <h2 className="font-medium text-foreground">A note on trust</h2>
          <p className="mt-1 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
            This is a demo project, not a security-audited product; it
            hasn&apos;t been through a professional audit or penetration
            test. What is actually in place: every table is scoped to its
            owner by Postgres row-level security, not just app-level checks;
            provider keys are encrypted via Supabase Vault and decrypted
            only server-side, never sent to your browser; key-validation,
            sync, and agent requests are rate-limited; the app ships with a
            Content-Security-Policy and other security headers; and
            dependencies are kept audit-clean. Still, use a scoped,
            rotatable, low-spend key wherever your provider supports one,
            since none of this has been independently reviewed.
          </p>
        </div>
      </Card>
    </section>
  );
}
