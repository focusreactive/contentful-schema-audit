import type { ValidationResult } from "../../core/result.js";
import { buildReportData } from "./data.js";
import { renderReport as renderFromData } from "./render.js";

export type { ReportData, ReportCheck, ReportDimension, PriorityRow, ScoreboardRow } from "./data.js";
export { buildReportData };

export function renderReport(result: ValidationResult): string {
  return renderFromData(buildReportData(result));
}
