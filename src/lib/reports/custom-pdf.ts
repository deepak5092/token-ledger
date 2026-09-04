import PDFDocument from "pdfkit";
import {
  METRIC_LABEL,
  formatMetricValue,
  indexToBase,
  type Metric,
  type DayPoint,
  type GroupPoint,
} from "@/lib/reports/metrics";

// Fixed categorical assignment by metric identity (not by order of
// appearance): "spend" is always this blue, "output tokens" is always
// this aqua, in every report -- a stronger, more recognizable version of
// the dataviz rule "color follows the entity, never its rank." Values are
// the app's validated palette slots 1-4.
const METRIC_COLOR: Record<Metric, string> = {
  cost: "#2a78d6",
  input_tokens: "#eb6834",
  output_tokens: "#1baf7a",
  total_tokens: "#eda100",
};
const MOVING_AVG_COLOR = "#52514e"; // secondary ink -- an overlay, not a fifth categorical series

const COLOR = {
  ink: "#0b0b0b",
  secondaryInk: "#52514e",
  mutedInk: "#898781",
  gridline: "#e1e0d9",
  baseline: "#c3c2b7",
  pagePlane: "#f9f9f7",
};

const MAX_TABLE_ROWS = 90; // paginated, so this is a hard ceiling not a soft cap
const CHART_HEIGHT = 200;

export type CustomReportInput = {
  title: string;
  rangeLabel: string;
  generatedAt: Date;
  metrics: Metric[];
  groupBy: "day" | "model" | "provider";
  movingAverageWindow: number | null;
  compare: boolean;
  dayData: Partial<Record<Metric, DayPoint[]>>;
  groupData: Partial<Record<Metric, GroupPoint[]>>;
};

const formatDate = (dateStr: string) =>
  new Date(`${dateStr}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

export function buildCustomPdf(input: CustomReportInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "LETTER", margin: 48 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    renderReport(doc, input);
    doc.end();
  });
}

function ensureRoom(doc: PDFKit.PDFDocument, height: number) {
  if (doc.y + height > doc.page.height - doc.page.margins.bottom) doc.addPage();
}

function renderReport(doc: PDFKit.PDFDocument, input: CustomReportInput) {
  const { title, rangeLabel, generatedAt, metrics, groupBy, movingAverageWindow, compare, dayData, groupData } =
    input;
  const left = doc.page.margins.left;
  const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  doc.fontSize(20).fillColor(COLOR.ink).text("Token Ledger");
  doc.fontSize(12).fillColor(COLOR.secondaryInk).text(title);
  doc.fontSize(10).fillColor(COLOR.mutedInk).text(rangeLabel);
  doc
    .fontSize(9)
    .fillColor(COLOR.mutedInk)
    .text(`Generated ${generatedAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}`);

  doc.moveDown(1);

  if (groupBy === "day") {
    renderDayReport(doc, left, contentWidth, metrics, movingAverageWindow, compare, dayData);
  } else {
    renderGroupReport(doc, left, contentWidth, metrics, groupBy, groupData);
  }
}

function renderDayReport(
  doc: PDFKit.PDFDocument,
  left: number,
  contentWidth: number,
  metrics: Metric[],
  movingAverageWindow: number | null,
  compare: boolean,
  dayData: Partial<Record<Metric, DayPoint[]>>,
) {
  const statWidth = contentWidth / metrics.length;
  const statY = doc.y;
  metrics.forEach((metric, i) => {
    const points = dayData[metric] ?? [];
    const total = points.reduce((sum, p) => sum + p.value, 0);
    const avgPerDay = points.length ? total / points.length : 0;
    drawMetricStat(doc, left + statWidth * i, statY, statWidth, metric, total, avgPerDay);
  });
  doc.y = statY + 56;

  const anyPoints = metrics.map((m) => dayData[m] ?? []).find((p) => p.length > 0) ?? [];

  if (compare && metrics.length >= 2) {
    ensureRoom(doc, CHART_HEIGHT + 10);
    const chartY = doc.y;
    drawComparisonChart(doc, left, chartY, contentWidth, CHART_HEIGHT, metrics, dayData);
    // Absolute, not `+=`: the chart's own internal .text() calls (legend,
    // axis labels) leave pdfkit's cursor wherever they last drew, not at
    // the chart's bottom edge -- incrementing from that would compound
    // into a growing gap before whatever comes next.
    doc.y = chartY + CHART_HEIGHT + 24;
  } else {
    for (const metric of metrics) {
      const points = dayData[metric] ?? [];
      if (points.length === 0) continue;
      ensureRoom(doc, CHART_HEIGHT + 10);
      const chartY = doc.y;
      drawMetricLineChart(doc, left, chartY, contentWidth, CHART_HEIGHT, metric, points, movingAverageWindow);
      doc.y = chartY + CHART_HEIGHT + 20;
    }
  }

  drawDayTable(doc, left, contentWidth, metrics, movingAverageWindow, anyPoints, dayData);
}

function drawMetricStat(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  metric: Metric,
  total: number,
  avgPerDay: number,
) {
  doc
    .fontSize(9)
    .fillColor(COLOR.mutedInk)
    .text(METRIC_LABEL[metric].toUpperCase(), x, y, { width, characterSpacing: 0.3 });
  doc.fontSize(15).fillColor(COLOR.ink).text(formatMetricValue(metric, total), x, y + 14, { width });
  doc
    .fontSize(8)
    .fillColor(COLOR.secondaryInk)
    .text(`${formatMetricValue(metric, avgPerDay)} / day avg`, x, y + 34, { width });
}

function drawChartFrame(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  height: number,
  yMax: number,
  formatY: (v: number) => string,
) {
  const padLeft = 48;
  const padBottom = 18;
  const padTop = 22;
  const plotX = x + padLeft;
  const plotWidth = width - padLeft;
  const plotHeight = height - padBottom - padTop;
  const plotY = y + padTop;

  doc.rect(x, y, width, height).fill(COLOR.pagePlane);

  const gridLines = 4;
  doc.fontSize(8);
  for (let i = 0; i <= gridLines; i++) {
    const gy = plotY + (plotHeight * i) / gridLines;
    const val = yMax * (1 - i / gridLines);
    doc.strokeColor(COLOR.gridline).lineWidth(0.5).moveTo(plotX, gy).lineTo(x + width, gy).stroke();
    doc.fillColor(COLOR.mutedInk).text(formatY(val), x, gy - 4, { width: padLeft - 6, align: "right" });
  }

  doc
    .strokeColor(COLOR.baseline)
    .lineWidth(1)
    .moveTo(plotX, plotY + plotHeight)
    .lineTo(x + width, plotY + plotHeight)
    .stroke();

  return { plotX, plotWidth, plotHeight, plotY };
}

function drawLegendEntry(doc: PDFKit.PDFDocument, x: number, y: number, color: string, label: string) {
  doc.rect(x, y + 2, 8, 8).fill(color);
  doc.fontSize(8).fillColor(COLOR.secondaryInk).text(label, x + 12, y, { width: 180 });
}

function drawSeries(doc: PDFKit.PDFDocument, points: { x: number; y: number }[], color: string, dashed = false) {
  if (points.length === 0) return;
  doc.strokeColor(color).lineWidth(2);
  if (dashed) doc.dash(3, { space: 2 });
  points.forEach((p, i) => {
    if (i === 0) doc.moveTo(p.x, p.y);
    else doc.lineTo(p.x, p.y);
  });
  doc.stroke();
  if (dashed) doc.undash();
}

function drawXAxisLabels(doc: PDFKit.PDFDocument, dates: string[], xAt: (i: number) => number, y: number) {
  doc.fontSize(8).fillColor(COLOR.mutedInk);
  const n = dates.length;
  const idxs = n > 1 ? [0, Math.floor((n - 1) / 2), n - 1] : [0];
  for (const i of idxs) {
    doc.text(formatDate(dates[i]), xAt(i) - 20, y, { width: 40, align: "center" });
  }
}

function drawMetricLineChart(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  height: number,
  metric: Metric,
  points: DayPoint[],
  movingAverageWindow: number | null,
) {
  const color = METRIC_COLOR[metric];
  const hasMovingAvg = movingAverageWindow != null && points.some((p) => p.movingAvg != null);

  const values = points.flatMap((p) => [p.value, p.movingAvg ?? 0]);
  const yMax = Math.max(...values, 1) * 1.15;
  // drawChartFrame fills the whole chart box's background first, so the
  // legend has to be drawn after it -- drawing it before gets the swatch
  // and label painted straight over by that fill.
  const { plotX, plotWidth, plotHeight, plotY } = drawChartFrame(doc, x, y, width, height, yMax, (v) =>
    formatMetricValue(metric, v),
  );

  drawLegendEntry(doc, x + 4, y + 6, color, METRIC_LABEL[metric]);
  if (hasMovingAvg) {
    drawLegendEntry(doc, x + 4 + 140, y + 6, MOVING_AVG_COLOR, `${movingAverageWindow}-day moving average`);
  }

  const n = points.length;
  const stepX = n > 1 ? plotWidth / (n - 1) : 0;
  const xAt = (i: number) => plotX + stepX * i;
  const yAt = (v: number) => plotY + plotHeight - (v / yMax) * plotHeight;

  drawSeries(doc, points.map((p, i) => ({ x: xAt(i), y: yAt(p.value) })), color);
  if (hasMovingAvg) {
    drawSeries(
      doc,
      points
        .map((p, i) => (p.movingAvg == null ? null : { x: xAt(i), y: yAt(p.movingAvg) }))
        .filter((pt): pt is { x: number; y: number } => pt !== null),
      MOVING_AVG_COLOR,
    );
  }

  drawXAxisLabels(
    doc,
    points.map((p) => p.date),
    xAt,
    plotY + plotHeight + 4,
  );
}

function drawComparisonChart(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  height: number,
  metrics: Metric[],
  dayData: Partial<Record<Metric, DayPoint[]>>,
) {
  const reference = metrics.map((m) => dayData[m] ?? []).find((p) => p.length > 0) ?? [];
  const indexed = metrics.map((m) => indexToBase(dayData[m] ?? []));

  const values = indexed.flatMap((series) => series.map((v) => v ?? 0));
  const yMax = Math.max(...values, 100) * 1.15;
  // See drawMetricLineChart: legend must be drawn after the frame's
  // background fill, not before it.
  const { plotX, plotWidth, plotHeight, plotY } = drawChartFrame(doc, x, y, width, height, yMax, (v) =>
    v.toFixed(0),
  );

  metrics.forEach((metric, i) => {
    drawLegendEntry(doc, x + 4 + i * 140, y + 6, METRIC_COLOR[metric], `${METRIC_LABEL[metric]} (indexed)`);
  });

  const n = reference.length;
  const stepX = n > 1 ? plotWidth / (n - 1) : 0;
  const xAt = (i: number) => plotX + stepX * i;
  const yAt = (v: number) => plotY + plotHeight - (v / yMax) * plotHeight;

  metrics.forEach((metric, mi) => {
    const series = indexed[mi];
    drawSeries(
      doc,
      series
        .map((v, i) => (v == null ? null : { x: xAt(i), y: yAt(v) }))
        .filter((pt): pt is { x: number; y: number } => pt !== null),
      METRIC_COLOR[metric],
    );
  });

  drawXAxisLabels(
    doc,
    reference.map((p) => p.date),
    xAt,
    plotY + plotHeight + 4,
  );
}

function drawDayTable(
  doc: PDFKit.PDFDocument,
  x: number,
  width: number,
  metrics: Metric[],
  movingAverageWindow: number | null,
  reference: DayPoint[],
  dayData: Partial<Record<Metric, DayPoint[]>>,
) {
  if (reference.length === 0) return;
  const rows = reference.slice(-MAX_TABLE_ROWS);
  const hasMovingAvg = movingAverageWindow != null;
  const colCount = 1 + metrics.length * (hasMovingAvg ? 2 : 1);
  const colWidth = width / colCount;

  const drawHeader = () => {
    ensureRoom(doc, 34);
    const headerY = doc.y;
    doc.fontSize(8).fillColor(COLOR.mutedInk);
    doc.text("DATE", x, headerY, { width: colWidth });
    let colX = x + colWidth;
    for (const metric of metrics) {
      doc.text(METRIC_LABEL[metric].toUpperCase(), colX, headerY, { width: colWidth, align: "right" });
      colX += colWidth;
      if (hasMovingAvg) {
        doc.text("MOV. AVG", colX, headerY, { width: colWidth, align: "right" });
        colX += colWidth;
      }
    }
    doc
      .strokeColor(COLOR.baseline)
      .lineWidth(1)
      .moveTo(x, headerY + 14)
      .lineTo(x + width, headerY + 14)
      .stroke();
    doc.y = headerY + 20;
  };

  drawHeader();
  const rowHeight = 16;
  for (const point of rows) {
    if (doc.y > doc.page.height - doc.page.margins.bottom - rowHeight) {
      doc.addPage();
      drawHeader();
    }
    const rowY = doc.y;
    doc.fontSize(9).fillColor(COLOR.ink).text(formatDate(point.date), x, rowY, { width: colWidth });
    let colX = x + colWidth;
    for (const metric of metrics) {
      const series = dayData[metric] ?? [];
      const match = series.find((p) => p.date === point.date);
      doc
        .fillColor(COLOR.secondaryInk)
        .text(match ? formatMetricValue(metric, match.value) : "—", colX, rowY, {
          width: colWidth,
          align: "right",
        });
      colX += colWidth;
      if (hasMovingAvg) {
        doc.text(match?.movingAvg == null ? "—" : formatMetricValue(metric, match.movingAvg), colX, rowY, {
          width: colWidth,
          align: "right",
        });
        colX += colWidth;
      }
    }
    doc.y = rowY + rowHeight;
  }

  if (reference.length > rows.length) {
    doc
      .fontSize(8)
      .fillColor(COLOR.mutedInk)
      .text(`Showing the most recent ${rows.length} of ${reference.length} days.`, x, doc.y + 4);
  }
}

function renderGroupReport(
  doc: PDFKit.PDFDocument,
  left: number,
  contentWidth: number,
  metrics: Metric[],
  groupBy: "model" | "provider",
  groupData: Partial<Record<Metric, GroupPoint[]>>,
) {
  const statWidth = contentWidth / metrics.length;
  const statY = doc.y;
  metrics.forEach((metric, i) => {
    const points = groupData[metric] ?? [];
    const total = points.reduce((sum, p) => sum + p.value, 0);
    doc
      .fontSize(9)
      .fillColor(COLOR.mutedInk)
      .text(METRIC_LABEL[metric].toUpperCase(), left + statWidth * i, statY, { width: statWidth });
    doc
      .fontSize(15)
      .fillColor(COLOR.ink)
      .text(formatMetricValue(metric, total), left + statWidth * i, statY + 14, { width: statWidth });
  });
  doc.y = statY + 46;

  for (const metric of metrics) {
    const points = (groupData[metric] ?? []).slice(0, 8);
    if (points.length === 0) continue;
    ensureRoom(doc, 28 * points.length + 40);
    doc.fontSize(11).fillColor(COLOR.ink).text(`${METRIC_LABEL[metric]} by ${groupBy}`, left, doc.y);
    doc.moveDown(0.3);
    drawBarList(doc, left, contentWidth, metric, points);
    doc.moveDown(1);
  }

  drawGroupTable(doc, left, contentWidth, metrics, groupBy, groupData);
}

function drawBarList(
  doc: PDFKit.PDFDocument,
  x: number,
  width: number,
  metric: Metric,
  points: GroupPoint[],
) {
  const labelWidth = Math.min(width * 0.3, 160);
  const valueWidth = 80;
  const barAreaX = x + labelWidth;
  const barAreaWidth = width - labelWidth - valueWidth;
  const barHeight = 14;
  const rowGap = 8;
  const max = Math.max(...points.map((p) => p.value), 0.01);

  for (const point of points) {
    const y = doc.y;
    doc.fontSize(9).fillColor(COLOR.secondaryInk).text(point.label, x, y + 2, { width: labelWidth - 8 });
    const barWidth = Math.max(2, (point.value / max) * barAreaWidth);
    doc.rect(barAreaX, y, barWidth, barHeight).fill(METRIC_COLOR[metric]);
    doc
      .fontSize(9)
      .fillColor(COLOR.ink)
      .text(formatMetricValue(metric, point.value), barAreaX + barAreaWidth + 6, y + 2, {
        width: valueWidth,
      });
    doc.y = y + barHeight + rowGap;
  }
}

function drawGroupTable(
  doc: PDFKit.PDFDocument,
  x: number,
  width: number,
  metrics: Metric[],
  groupBy: "model" | "provider",
  groupData: Partial<Record<Metric, GroupPoint[]>>,
) {
  const labels = Array.from(
    new Set(metrics.flatMap((m) => (groupData[m] ?? []).map((p) => p.label))),
  );
  if (labels.length === 0) return;
  // Sort by the first metric's value, descending, so the table reads in
  // the same order as the bar chart above it.
  const primary = groupData[metrics[0]] ?? [];
  labels.sort((a, b) => (primary.find((p) => p.label === b)?.value ?? 0) - (primary.find((p) => p.label === a)?.value ?? 0));

  const colCount = 1 + metrics.length;
  const colWidth = width / colCount;

  const drawHeader = () => {
    ensureRoom(doc, 34);
    const headerY = doc.y;
    doc.fontSize(8).fillColor(COLOR.mutedInk);
    doc.text(groupBy.toUpperCase(), x, headerY, { width: colWidth });
    metrics.forEach((metric, i) => {
      doc.text(METRIC_LABEL[metric].toUpperCase(), x + colWidth * (i + 1), headerY, {
        width: colWidth,
        align: "right",
      });
    });
    doc
      .strokeColor(COLOR.baseline)
      .lineWidth(1)
      .moveTo(x, headerY + 14)
      .lineTo(x + width, headerY + 14)
      .stroke();
    doc.y = headerY + 20;
  };

  drawHeader();
  const rowHeight = 16;
  for (const label of labels.slice(0, MAX_TABLE_ROWS)) {
    if (doc.y > doc.page.height - doc.page.margins.bottom - rowHeight) {
      doc.addPage();
      drawHeader();
    }
    const rowY = doc.y;
    doc.fontSize(9).fillColor(COLOR.ink).text(label, x, rowY, { width: colWidth });
    metrics.forEach((metric, i) => {
      const value = (groupData[metric] ?? []).find((p) => p.label === label)?.value ?? 0;
      doc
        .fillColor(COLOR.secondaryInk)
        .text(formatMetricValue(metric, value), x + colWidth * (i + 1), rowY, {
          width: colWidth,
          align: "right",
        });
    });
    doc.y = rowY + rowHeight;
  }
}
