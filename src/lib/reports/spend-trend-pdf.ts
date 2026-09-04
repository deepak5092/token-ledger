import PDFDocument from "pdfkit";
import type { MovingAveragePoint } from "@/lib/dashboard/aggregate";

// Reuses the app's validated dataviz palette (see the dataviz skill's
// references/palette.md) rather than picking print colors ad hoc: slot 1
// (blue) for the primary series, slot 2 (orange) for the secondary one,
// same ink/gridline roles as every other chart in the app.
const COLOR = {
  ink: "#0b0b0b",
  secondaryInk: "#52514e",
  mutedInk: "#898781",
  gridline: "#e1e0d9",
  baseline: "#c3c2b7",
  pagePlane: "#f9f9f7",
  dailySpend: "#2a78d6",
  movingAvg: "#eb6834",
};

// A table row per day gets unwieldy well past a month; cap it and note the
// truncation instead of spilling onto extra pages this module doesn't
// paginate for.
const MAX_TABLE_ROWS = 31;

export type SpendTrendReportInput = {
  series: MovingAveragePoint[];
  windowDays: number;
  totalSpend: number;
  avgCostPerDay: number;
  rangeLabel: string;
  generatedAt: Date;
};

const formatDate = (dateStr: string) =>
  new Date(`${dateStr}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

const formatUsd = (n: number) => `$${n.toFixed(2)}`;

export function buildSpendTrendPdf(input: SpendTrendReportInput): Promise<Buffer> {
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

function renderReport(doc: PDFKit.PDFDocument, input: SpendTrendReportInput) {
  const { series, windowDays, totalSpend, avgCostPerDay, rangeLabel, generatedAt } = input;
  const left = doc.page.margins.left;
  const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  doc.fontSize(20).fillColor(COLOR.ink).text("Token Ledger");
  doc.fontSize(12).fillColor(COLOR.secondaryInk).text(`Spend trend report — ${rangeLabel}`);
  doc
    .fontSize(9)
    .fillColor(COLOR.mutedInk)
    .text(
      `Generated ${generatedAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}`,
    );

  doc.moveDown(1.2);

  const statY = doc.y;
  const statWidth = contentWidth / 3;
  drawStat(doc, left, statY, statWidth, "Total spend", formatUsd(totalSpend));
  drawStat(doc, left + statWidth, statY, statWidth, "Avg spend / day", formatUsd(avgCostPerDay));
  drawStat(doc, left + statWidth * 2, statY, statWidth, "Days covered", `${series.length}`);

  doc.y = statY + 56;

  const chartHeight = 220;
  const chartY = doc.y;
  drawLineChart(doc, {
    x: left,
    y: chartY,
    width: contentWidth,
    height: chartHeight,
    series,
    windowDays,
  });

  doc.y = chartY + chartHeight + 28;

  drawTable(doc, series, left, contentWidth);
}

function drawStat(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  label: string,
  value: string,
) {
  doc
    .fontSize(9)
    .fillColor(COLOR.mutedInk)
    .text(label.toUpperCase(), x, y, { width, characterSpacing: 0.3 });
  doc.fontSize(18).fillColor(COLOR.ink).text(value, x, y + 14, { width });
}

function drawLineChart(
  doc: PDFKit.PDFDocument,
  opts: {
    x: number;
    y: number;
    width: number;
    height: number;
    series: MovingAveragePoint[];
    windowDays: number;
  },
) {
  const { x, y, width, height, series, windowDays } = opts;
  const padLeft = 48;
  const padBottom = 18;
  const padTop = 22; // room for the legend row above the plot
  const plotX = x + padLeft;
  const plotWidth = width - padLeft;
  const plotHeight = height - padBottom - padTop;
  const plotY = y + padTop;

  doc.rect(x, y, width, height).fill(COLOR.pagePlane);

  // Legend: a colored swatch carries identity, the label text stays in ink
  // (never colored text) per the dataviz skill's mark rules.
  drawLegendEntry(doc, x + 4, y + 6, COLOR.dailySpend, "Daily spend");
  drawLegendEntry(doc, x + 4 + 100, y + 6, COLOR.movingAvg, `${windowDays}-day moving average`);

  const costs = series.map((p) => p.cost);
  const avgs = series.map((p) => p.movingAvg ?? 0);
  const yMax = Math.max(...costs, ...avgs, 0.01) * 1.15;

  const gridLines = 4;
  doc.fontSize(8).fillColor(COLOR.mutedInk);
  for (let i = 0; i <= gridLines; i++) {
    const gy = plotY + (plotHeight * i) / gridLines;
    const val = yMax * (1 - i / gridLines);
    doc.strokeColor(COLOR.gridline).lineWidth(0.5).moveTo(plotX, gy).lineTo(x + width, gy).stroke();
    doc.fillColor(COLOR.mutedInk).text(formatUsd(val), x, gy - 4, { width: padLeft - 6, align: "right" });
  }

  doc
    .strokeColor(COLOR.baseline)
    .lineWidth(1)
    .moveTo(plotX, plotY + plotHeight)
    .lineTo(x + width, plotY + plotHeight)
    .stroke();

  const n = series.length;
  const stepX = n > 1 ? plotWidth / (n - 1) : 0;
  const xAt = (i: number) => plotX + stepX * i;
  const yAt = (v: number) => plotY + plotHeight - (v / yMax) * plotHeight;

  drawSeries(doc, series.map((p, i) => ({ x: xAt(i), y: yAt(p.cost) })), COLOR.dailySpend);
  drawSeries(
    doc,
    series
      .map((p, i) => (p.movingAvg == null ? null : { x: xAt(i), y: yAt(p.movingAvg) }))
      .filter((pt): pt is { x: number; y: number } => pt !== null),
    COLOR.movingAvg,
  );

  doc.fontSize(8).fillColor(COLOR.mutedInk);
  const labelIdxs = n > 1 ? [0, Math.floor((n - 1) / 2), n - 1] : [0];
  for (const i of labelIdxs) {
    doc.text(formatDate(series[i].date), xAt(i) - 20, plotY + plotHeight + 4, {
      width: 40,
      align: "center",
    });
  }
}

function drawLegendEntry(doc: PDFKit.PDFDocument, x: number, y: number, color: string, label: string) {
  doc.rect(x, y + 2, 8, 8).fill(color);
  doc.fontSize(8).fillColor(COLOR.secondaryInk).text(label, x + 12, y, { width: 160 });
}

function drawSeries(doc: PDFKit.PDFDocument, points: { x: number; y: number }[], color: string) {
  if (points.length === 0) return;
  doc.strokeColor(color).lineWidth(2);
  points.forEach((p, i) => {
    if (i === 0) doc.moveTo(p.x, p.y);
    else doc.lineTo(p.x, p.y);
  });
  doc.stroke();
}

function drawTable(doc: PDFKit.PDFDocument, series: MovingAveragePoint[], x: number, width: number) {
  const rows = series.slice(-MAX_TABLE_ROWS);
  const colWidths = [width * 0.34, width * 0.33, width * 0.33];
  const rowHeight = 18;

  doc.fontSize(9).fillColor(COLOR.mutedInk);
  const headerY = doc.y;
  doc.text("DATE", x, headerY, { width: colWidths[0] });
  doc.text("DAILY SPEND", x + colWidths[0], headerY, { width: colWidths[1], align: "right" });
  doc.text("MOVING AVG", x + colWidths[0] + colWidths[1], headerY, {
    width: colWidths[2],
    align: "right",
  });
  doc
    .strokeColor(COLOR.baseline)
    .lineWidth(1)
    .moveTo(x, headerY + 14)
    .lineTo(x + width, headerY + 14)
    .stroke();

  let rowY = headerY + 20;
  doc.fontSize(9);
  for (const row of rows) {
    if (rowY > doc.page.height - doc.page.margins.bottom - rowHeight) break;
    doc.fillColor(COLOR.ink).text(formatDate(row.date), x, rowY, { width: colWidths[0] });
    doc.fillColor(COLOR.secondaryInk).text(formatUsd(row.cost), x + colWidths[0], rowY, {
      width: colWidths[1],
      align: "right",
    });
    doc.text(
      row.movingAvg == null ? "—" : formatUsd(row.movingAvg),
      x + colWidths[0] + colWidths[1],
      rowY,
      { width: colWidths[2], align: "right" },
    );
    rowY += rowHeight;
  }

  if (series.length > rows.length) {
    doc
      .fontSize(8)
      .fillColor(COLOR.mutedInk)
      .text(`Showing the most recent ${rows.length} of ${series.length} days.`, x, rowY + 4);
  }
}
