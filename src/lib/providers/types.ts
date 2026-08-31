export type Provider = "anthropic" | "openai" | "bedrock_synthetic";

export const PROVIDERS: { value: Provider; label: string }[] = [
  { value: "anthropic", label: "Anthropic" },
  { value: "openai", label: "OpenAI" },
  { value: "bedrock_synthetic", label: "AWS Bedrock (synthetic demo data)" },
];

export function isProvider(value: string): value is Provider {
  return PROVIDERS.some((p) => p.value === value);
}
