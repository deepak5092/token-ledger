import ExcelJS from "exceljs";
import { METRIC_LABEL, METRIC_UNIT, type Metric, type DayPoint, type GroupPoint } from "@/lib/reports/metrics";
import type { CustomReportInput } from "@/lib/reports/custom-pdf";

const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE1E0D9" } };

function styleHeaderRow(row: ExcelJS.Row) {
  row.font = { bold: true };
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
  });
}

function autoSizeColumns(sheet: ExcelJS.Worksheet) {
  sheet.columns.forEach((col) => {
    let max = 10;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const len = cell.value == null ? 0 : String(cell.value).length;
      if (len > max) max = len;
    });
    col.width = Math.min(max + 2, 40);
  });
}

const numFmtFor = (metric: Metric) => (METRIC_UNIT[metric] === "usd" ? "$#,##0.00" : "#,##0");

export async function buildCustomWorkbook(input: CustomReportInput): Promise<Buffer> {
  const { title, rangeLabel, generatedAt, metrics, groupBy, movingAverageWindow, dayData, groupData } = input;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Token Ledger";
  workbook.created = generatedAt;

  const summary = workbook.addWorksheet("Summary");
  summary.addRow([title]).font = { bold: true, size: 14 };
  summary.addRow([rangeLabel]);
  summary.addRow([
    `Generated ${generatedAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}`,
  ]);
  summary.addRow([]);
  if (groupBy === "day") {
    const header = summary.addRow(["Metric", "Total", "Average / day"]);
    styleHeaderRow(header);
    for (const metric of metrics) {
      const points = dayData[metric] ?? [];
      const total = points.reduce((sum, p) => sum + p.value, 0);
      const avg = points.length ? total / points.length : 0;
      const row = summary.addRow([METRIC_LABEL[metric], total, avg]);
      row.getCell(2).numFmt = numFmtFor(metric);
      row.getCell(3).numFmt = numFmtFor(metric);
    }
  } else {
    const header = summary.addRow(["Metric", "Total"]);
    styleHeaderRow(header);
    for (const metric of metrics) {
      const total = (groupData[metric] ?? []).reduce((sum, p) => sum + p.value, 0);
      summary.addRow([METRIC_LABEL[metric], total]).getCell(2).numFmt = numFmtFor(metric);
    }
  }
  autoSizeColumns(summary);

  if (groupBy === "day") {
    const sheet = workbook.addWorksheet("Data");
    const headerLabels = ["Date"];
    for (const metric of metrics) {
      headerLabels.push(METRIC_LABEL[metric]);
      if (movingAverageWindow) headerLabels.push(`${METRIC_LABEL[metric]} (${movingAverageWindow}d avg)`);
    }
    styleHeaderRow(sheet.addRow(headerLabels));

    const reference = metrics.map((m) => dayData[m] ?? []).find((p) => p.length > 0) ?? [];
    for (const point of reference) {
      const values: (string | number | null)[] = [point.date];
      for (const metric of metrics) {
        const match = (dayData[metric] ?? []).find((p: DayPoint) => p.date === point.date);
        values.push(match?.value ?? null);
        if (movingAverageWindow) values.push(match?.movingAvg ?? null);
      }
      const row = sheet.addRow(values);
      let col = 2;
      for (const metric of metrics) {
        row.getCell(col).numFmt = numFmtFor(metric);
        col += 1;
        if (movingAverageWindow) {
          row.getCell(col).numFmt = numFmtFor(metric);
          col += 1;
        }
      }
    }
    autoSizeColumns(sheet);
  } else {
    const sheet = workbook.addWorksheet("Data");
    const headerLabels = [groupBy === "model" ? "Model" : "Provider", ...metrics.map((m) => METRIC_LABEL[m])];
    styleHeaderRow(sheet.addRow(headerLabels));

    const labels = Array.from(
      new Set(metrics.flatMap((m) => (groupData[m] ?? []).map((p: GroupPoint) => p.label))),
    );
    const primary = groupData[metrics[0]] ?? [];
    labels.sort(
      (a, b) =>
        (primary.find((p) => p.label === b)?.value ?? 0) - (primary.find((p) => p.label === a)?.value ?? 0),
    );

    for (const label of labels) {
      const values: (string | number)[] = [label];
      for (const metric of metrics) {
        values.push((groupData[metric] ?? []).find((p) => p.label === label)?.value ?? 0);
      }
      const row = sheet.addRow(values);
      metrics.forEach((metric, i) => {
        row.getCell(i + 2).numFmt = numFmtFor(metric);
      });
    }
    autoSizeColumns(sheet);
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
