export function gauge(score: number, length: number): string {
  const filled = Math.round((score / 100) * length);

  return "█".repeat(filled) + "░".repeat(length - filled);
}

export function distribution(count: number): string {
  return "█".repeat(count);
}

export function chip(text: string): string {
  return `\`${text}\``;
}

const MAX_TYPE_CHIPS = 8;

export function typeChips(types: string[], max = MAX_TYPE_CHIPS): string {
  const shown = types.slice(0, max).map(chip).join(" ");
  const extra = types.length - max;

  return extra > 0 ? `${shown} +${extra} more` : shown;
}

export type ColumnAlign = "none" | "left" | "right";

export interface Column {
  header: string;
  align: ColumnAlign;
}

const MIN_COLUMN_WIDTH = 3;

function padCell(text: string, width: number, align: ColumnAlign): string {
  return align === "right" ? text.padStart(width) : text.padEnd(width);
}

function separator(width: number, align: ColumnAlign): string {
  if (align === "right") return `${"-".repeat(width - 1)}:`;
  if (align === "left") return `:${"-".repeat(width - 1)}`;

  return "-".repeat(width);
}

export function renderTable(columns: Column[], rows: string[][]): string {
  const widths = columns.map((col, i) =>
    Math.max(MIN_COLUMN_WIDTH, col.header.length, ...rows.map((row) => row[i]?.length ?? 0)),
  );

  const widthOf = (i: number): number => widths[i] ?? MIN_COLUMN_WIDTH;

  const line = (cells: string[]): string => `| ${cells.join(" | ")} |`;

  const formatRow = (cells: string[]): string =>
    line(columns.map((col, i) => padCell(cells[i] ?? "", widthOf(i), col.align)));

  return [
    formatRow(columns.map((col) => col.header)),
    line(columns.map((col, i) => separator(widthOf(i), col.align))),
    ...rows.map(formatRow),
  ].join("\n");
}
