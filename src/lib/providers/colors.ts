// Fixed hue-per-provider so a color never shifts meaning as connections are
// added/removed — never assign categorical color by array index. Shared
// between the by-provider chart and the provider badge in the connections
// list, so both stay visually consistent.
export const PROVIDER_COLOR: Record<string, string> = {
  anthropic: "var(--chart-series-1)",
  openai: "var(--chart-series-2)",
  bedrock_synthetic: "var(--chart-series-3)",
};

export const PROVIDER_LABEL: Record<string, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  bedrock_synthetic: "Bedrock (synthetic)",
};
