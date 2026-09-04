import ExcelJS from "exceljs";
import type { MovingAveragePoint, ModelSpendPoint, ProviderSpendPoint } from "@/lib/dashboard/aggregate";

export type SpendTrendWorkbookInput = {
  series: MovingAveragePoint[];
  byModel: ModelSpendPoint[];
  byProvider: ProviderSpendPoint[];
  windowDays: number;
  totalSpend: number;
  avgCostPerDay: number;
  rangeLabel: string;
  generatedAt: Date;
};

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFE1E0D9" }, // dataviz palette's gridline/hairline gray
};

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

export async function buildSpendTrendWorkbook(input: SpendTrendWorkbookInput): Promise<Buffer> {
  const { series, byModel, byProvider, windowDays, totalSpend, avgCostPerDay, rangeLabel, generatedAt } =
    input;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Token Ledger";
  workbook.created = generatedAt;

  const summary = workbook.addWorksheet("Summary");
  summary.addRow(["Token Ledger — Spend trend export"]).font = { bold: true, size: 14 };
  summary.addRow([rangeLabel]);
  summary.addRow([`Generated ${generatedAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}`]);
  summary.addRow([]);
  const summaryHeader = summary.addRow(["Metric", "Value"]);
  styleHeaderRow(summaryHeader);
  summary.addRow(["Total spend", totalSpend]).getCell(2).numFmt = "$#,##0.00";
  summary.addRow(["Average spend per day", avgCostPerDay]).getCell(2).numFmt = "$#,##0.00";
  summary.addRow(["Days covered", series.length]);
  summary.addRow(["Moving-average window (days)", windowDays]);
  autoSizeColumns(summary);

  const daily = workbook.addWorksheet("Daily spend");
  const dailyHeader = daily.addRow(["Date", "Daily spend", `${windowDays}-day moving average`]);
  styleHeaderRow(dailyHeader);
  for (const point of series) {
    const row = daily.addRow([point.date, point.cost, point.movingAvg]);
    row.getCell(2).numFmt = "$#,##0.00";
    if (point.movingAvg != null) row.getCell(3).numFmt = "$#,##0.00";
  }
  autoSizeColumns(daily);

  const byModelSheet = workbook.addWorksheet("By model");
  styleHeaderRow(byModelSheet.addRow(["Model", "Total spend"]));
  for (const point of byModel) {
    byModelSheet.addRow([point.model, point.cost]).getCell(2).numFmt = "$#,##0.00";
  }
  autoSizeColumns(byModelSheet);

  const byProviderSheet = workbook.addWorksheet("By provider");
  styleHeaderRow(byProviderSheet.addRow(["Provider", "Total spend"]));
  for (const point of byProvider) {
    byProviderSheet.addRow([point.provider, point.cost]).getCell(2).numFmt = "$#,##0.00";
  }
  autoSizeColumns(byProviderSheet);

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
