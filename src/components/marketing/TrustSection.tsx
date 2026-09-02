import { ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";

export function TrustSection() {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-12">
      <h2 className="text-2xl font-semibold tracking-tight text-foreground">Before you use this</h2>
      <Card className="mt-8 flex max-w-2xl items-start gap-4 sm:p-6">
        <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-accent" aria-hidden />
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          This is a demo, not a security-audited product. Keys are encrypted
          via Supabase Vault and only decrypted server-side, and every table
          is scoped to its owner by row-level security. Still, use a scoped,
          low-spend key — none of this has been independently reviewed.
        </p>
      </Card>
    </section>
  );
}
