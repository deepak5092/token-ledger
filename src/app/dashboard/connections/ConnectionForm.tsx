"use client";

import { useState } from "react";
import { PROVIDERS, type Provider } from "@/lib/providers/types";
import { addConnection } from "./actions";
import { Card } from "@/components/ui/Card";
import { Label, Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export function ConnectionForm() {
  const [provider, setProvider] = useState<Provider>("anthropic");

  return (
    <Card>
      <form action={addConnection} className="space-y-4">
        <div>
          <Label htmlFor="provider">Provider</Label>
          <Select
            id="provider"
            name="provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value as Provider)}
          >
            {PROVIDERS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="label">Label (optional)</Label>
          <Input id="label" name="label" type="text" placeholder="e.g. Production key" />
        </div>

        {provider !== "bedrock_synthetic" && (
          <div>
            <Label htmlFor="apiKey">
              {provider === "anthropic" ? "Anthropic Admin API key" : "OpenAI Admin API key"}
            </Label>
            <Input
              id="apiKey"
              name="apiKey"
              type="password"
              required
              autoComplete="off"
              className="font-mono text-sm"
            />
            <p className="mt-1 text-xs text-zinc-500">
              Needs usage-reporting access — an org/Admin-level key, not a
              regular per-project API key.
            </p>
          </div>
        )}

        <Button type="submit" variant="primary" className="w-full">
          Connect
        </Button>
      </form>
    </Card>
  );
}
