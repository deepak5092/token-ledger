"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { ConnectionForm } from "./ConnectionForm";
import { Button } from "@/components/ui/Button";

// Same modal shell/conventions as AuthOverlay (backdrop, ESC-to-close,
// body-scroll-lock) -- a separate component rather than reusing that one
// since it's specific to auth. Opens automatically when `error` is set
// (addConnection's server action redirects back here on failure), so a
// failed attempt reopens right where the user left off instead of
// dropping them on a bare page with a banner and an empty closed modal.
export function ConnectModal({ error }: { error?: string }) {
  const [open, setOpen] = useState(!!error);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <Button type="button" variant="primary" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" aria-hidden />
        Create key
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-6 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-zinc-200 bg-zinc-50 p-6 shadow-xl dark:border-zinc-800 dark:bg-black"
            role="dialog"
            aria-modal="true"
            aria-label="Connect a provider"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Connect a provider</h2>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-300 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:border-zinc-700 dark:hover:bg-zinc-900 dark:hover:text-zinc-300"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <ConnectionForm error={error} />
          </div>
        </div>
      )}
    </>
  );
}
