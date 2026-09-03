export type Provider = "anthropic" | "openai";

export const PROVIDERS: { value: Provider; label: string }[] = [
  { value: "anthropic", label: "Anthropic" },
  { value: "openai", label: "OpenAI" },
];

export function isProvider(value: string): value is Provider {
  return PROVIDERS.some((p) => p.value === value);
}
