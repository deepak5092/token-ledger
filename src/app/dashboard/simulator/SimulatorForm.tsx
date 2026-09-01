"use client";

import { useMemo, useState } from "react";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { PRICING_TABLE, estimateCost } from "@/lib/pricing/models";
import type { Workload } from "@/lib/dashboard/simulator";
import { Button } from "@/components/ui/Button";
import { Label, Select, Input } from "@/components/ui/Field";
import { Card } from "@/components/ui/Card";

const currency = (n: number) =>
  n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });

const truncate = (s: string, max = 40) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

export function SimulatorForm({ workloads }: { workloads: Workload[] }) {
  const [mode, setMode] = useState<"usage" | "manual">(workloads.length ? "usage" : "manual");
  const [selectedModel, setSelectedModel] = useState(workloads[0]?.model ?? "");
  const [manualModel, setManualModel] = useState(PRICING_TABLE[0].model);
  const [manualInput, setManualInput] = useState(1_000_000);
  const [manualOutput, setManualOutput] = useState(200_000);
  const [targetModel, setTargetModel] = useState(
    PRICING_TABLE.find((p) => p.model !== (workloads[0]?.model ?? PRICING_TABLE[0].model))
      ?.model ?? PRICING_TABLE[0].model,
  );

  const workload = workloads.find((w) => w.model === selectedModel);

  const { inputTokens, outputTokens, currentCost, currentModel } = useMemo(() => {
    if (mode === "usage" && workload) {
      return {
        inputTokens: workload.monthlyInputTokens,
        outputTokens: workload.monthlyOutputTokens,
        currentCost: workload.monthlyCost,
        currentModel: workload.model,
      };
    }
    return {
      inputTokens: manualInput,
      outputTokens: manualOutput,
      currentCost: estimateCost(manualModel, manualInput, manualOutput),
      currentModel: manualModel,
    };
  }, [mode, workload, manualModel, manualInput, manualOutput]);

  const projectedCost = estimateCost(targetModel, inputTokens, outputTokens);
  const delta =
    currentCost !== null && projectedCost !== null
      ? Math.round((currentCost - projectedCost) * 100) / 100
      : null;
  const pctChange =
    delta !== null && currentCost !== null && currentCost > 0
      ? Math.round((delta / currentCost) * 1000) / 10
      : null;

  const targetLabel = PRICING_TABLE.find((p) => p.model === targetModel)?.label ?? targetModel;
  const DeltaIcon = delta === null || delta === 0 ? Minus : delta > 0 ? TrendingDown : TrendingUp;

  return (
    <div className="space-y-6">
      <div className="flex gap-2 text-sm">
        <Button
          type="button"
          variant={mode === "usage" ? "primary" : "outline"}
          size="sm"
          onClick={() => setMode("usage")}
          disabled={!workloads.length}
        >
          From my usage
        </Button>
        <Button
          type="button"
          variant={mode === "manual" ? "primary" : "outline"}
          size="sm"
          onClick={() => setMode("manual")}
        >
          Manual entry
        </Button>
      </div>

      {mode === "usage" ? (
        workloads.length ? (
          <div className="max-w-md">
            <Label htmlFor="workload">
              Workload (scaled to a 30-day month from your synced data)
            </Label>
            <Select
              id="workload"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
            >
              {workloads.map((w) => (
                <option key={w.model} value={w.model}>
                  {truncate(w.model)} — {currency(w.monthlyCost)}/mo
                </option>
              ))}
            </Select>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">No synced usage yet — use manual entry instead.</p>
        )
      ) : (
        <div className="grid max-w-md grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="manualModel">Current model</Label>
            <Select
              id="manualModel"
              value={manualModel}
              onChange={(e) => setManualModel(e.target.value)}
            >
              {PRICING_TABLE.map((p) => (
                <option key={p.model} value={p.model}>
                  {p.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="manualInput">Input tokens / month</Label>
            <Input
              id="manualInput"
              type="number"
              min={0}
              value={manualInput}
              onChange={(e) => setManualInput(Number(e.target.value) || 0)}
            />
          </div>
          <div>
            <Label htmlFor="manualOutput">Output tokens / month</Label>
            <Input
              id="manualOutput"
              type="number"
              min={0}
              value={manualOutput}
              onChange={(e) => setManualOutput(Number(e.target.value) || 0)}
            />
          </div>
        </div>
      )}

      <div className="max-w-md">
        <Label htmlFor="targetModel">Switch to</Label>
        <Select id="targetModel" value={targetModel} onChange={(e) => setTargetModel(e.target.value)}>
          {PRICING_TABLE.map((p) => (
            <option key={p.model} value={p.model}>
              {p.label}
            </option>
          ))}
        </Select>
      </div>

      <Card className="max-w-md">
        {currentCost === null ? (
          <p className="text-sm text-zinc-500">
            No pricing data for {truncate(currentModel)} — can&apos;t estimate a comparison.
          </p>
        ) : projectedCost === null ? (
          <p className="text-sm text-zinc-500">
            No pricing data for {targetLabel} — can&apos;t estimate a comparison.
          </p>
        ) : (
          <>
            <p className="text-sm text-zinc-500">
              {currency(currentCost)}/mo on {truncate(currentModel)} → {currency(projectedCost)}/mo on{" "}
              {targetLabel}
            </p>
            <p
              className={`mt-1 flex items-center gap-2 text-2xl font-semibold ${
                delta !== null && delta > 0
                  ? "text-green-600 dark:text-green-400"
                  : delta !== null && delta < 0
                    ? "text-red-600 dark:text-red-400"
                    : "text-foreground"
              }`}
            >
              <DeltaIcon className="h-5 w-5 shrink-0" aria-hidden />
              {delta === null
                ? "—"
                : delta > 0
                  ? `Save ${currency(delta)}/mo`
                  : delta < 0
                    ? `Costs ${currency(Math.abs(delta))}/mo more`
                    : "No change"}
              {pctChange !== null && delta !== 0 && (
                <span className="text-base font-normal text-zinc-400">
                  ({Math.abs(pctChange)}%)
                </span>
              )}
            </p>
          </>
        )}
      </Card>
    </div>
  );
}
