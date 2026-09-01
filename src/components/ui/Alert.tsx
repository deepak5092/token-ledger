import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type AlertVariant = "error" | "success" | "info";

const VARIANT_CLASSES: Record<AlertVariant, string> = {
  error: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  success: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
  info: "bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300",
};

export function Alert({
  variant,
  className,
  children,
}: {
  variant: AlertVariant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <p className={cn("rounded-lg px-3 py-2 text-sm", VARIANT_CLASSES[variant], className)}>
      {children}
    </p>
  );
}
