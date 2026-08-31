export type NormalizedUsageRecord = {
  date: string; // YYYY-MM-DD
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
};
