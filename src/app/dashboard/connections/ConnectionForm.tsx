"use client";

import { useState } from "react";
import { PROVIDERS, type Provider } from "@/lib/providers/types";
import { addConnection } from "./actions";

export function ConnectionForm() {
  const [provider, setProvider] = useState<Provider>("anthropic");

  return (
    <form
      action={addConnection}
      className="space-y-4 rounded border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <div>
        <label
          htmlFor="provider"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Provider
        </label>
        <select
          id="provider"
          name="provider"
          value={provider}
          onChange={(e) => setProvider(e.target.value as Provider)}
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        >
          {PROVIDERS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="label"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Label (optional)
        </label>
        <input
          id="label"
          name="label"
          type="text"
          placeholder="e.g. Production key"
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      {provider !== "bedrock_synthetic" && (
        <div>
          <label
            htmlFor="apiKey"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            {provider === "anthropic"
              ? "Anthropic Admin API key"
              : "OpenAI Admin API key"}
          </label>
          <input
            id="apiKey"
            name="apiKey"
            type="password"
            required
            autoComplete="off"
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <p className="mt-1 text-xs text-zinc-500">
            Needs usage-reporting access — an org/Admin-level key, not a
            regular per-project API key.
          </p>
        </div>
      )}

      <button
        type="submit"
        className="w-full rounded bg-black px-4 py-2 text-white dark:bg-white dark:text-black"
      >
        Connect
      </button>
    </form>
  );
}
