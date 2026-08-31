import type { DailySpendPoint } from "./aggregate";

export type AnomalyPoint = DailySpendPoint & {
  rollingAverage: number;
  ratio: number;
  isAnomaly: boolean;
};

const WINDOW_DAYS = 7;
const THRESHOLD_RATIO = 1.5; // flag when >50% above the trailing rolling average
const MIN_WINDOW_SAMPLES = 3; // need at least a few prior days before flagging anything
const MIN_BASELINE = 0.01; // avoid flagging tiny noise off a near-zero baseline as a huge ratio

// Trailing (excludes the day itself) rolling-average anomaly flag, isolated
// here so the threshold/window can be tuned without touching chart code.
export function detectAnomalies(
  points: DailySpendPoint[],
  windowSize = WINDOW_DAYS,
  thresholdRatio = THRESHOLD_RATIO,
): AnomalyPoint[] {
  return points.map((point, i) => {
    const window = points.slice(Math.max(0, i - windowSize), i);
    const rollingAverage =
      window.length > 0 ? window.reduce((sum, p) => sum + p.cost, 0) / window.length : 0;

    const ratio = rollingAverage > 0 ? point.cost / rollingAverage : 0;
    const isAnomaly =
      window.length >= MIN_WINDOW_SAMPLES &&
      rollingAverage > MIN_BASELINE &&
      ratio >= thresholdRatio;

    return {
      ...point,
      rollingAverage: Math.round(rollingAverage * 10000) / 10000,
      ratio: Math.round(ratio * 100) / 100,
      isAnomaly,
    };
  });
}
