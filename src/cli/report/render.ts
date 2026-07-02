import type { ReportCheck, ReportData, ReportDimension } from "./data.js";
import { chip, distribution, gauge, renderTable, typeChips, type Column } from "./format.js";

const DASH = "—";
const RULE = "---";

function metaTable(data: ReportData): string {
  const columns: Column[] = [
    { header: "CMS", align: "none" },
    { header: "Space", align: "none" },
    { header: "Environment", align: "none" },
    { header: "Types", align: "right" },
    { header: "Fields", align: "right" },
    { header: "Generated", align: "none" },
  ];

  const { meta } = data;

  return renderTable(columns, [
    [
      meta.cmsLabel,
      chip(meta.spaceId),
      chip(meta.environment),
      meta.typeCount === null ? DASH : String(meta.typeCount),
      meta.fieldCount === null ? DASH : String(meta.fieldCount),
      meta.generatedDate,
    ],
  ]);
}

function scoreHeading(score: number | null): string {
  return score === null ? "## Score: N/A" : `## Score: ${score} / 100`;
}

function gaugeLine(overall: ReportData["overall"]): string {
  if (overall.score === null) return chip(overall.bandLabel);
  return `${chip(gauge(overall.score, 20))} ${chip(overall.bandLabel)}`;
}

function verdictBlock(overall: ReportData["overall"]): string {
  if (overall.verdict) return overall.verdict;
  const total = overall.scoredCount + overall.notAssessableCount + overall.notApplicableCount;
  return `${overall.scoredCount} of ${total} dimensions scored — band ${overall.bandLabel}.`;
}

function scoreboardTable(rows: ReportData["scoreboard"]): string {
  const columns: Column[] = [
    { header: "Dimension", align: "none" },
    { header: "Score", align: "right" },
    { header: "", align: "left" },
    { header: "Band", align: "left" },
    { header: "Tier", align: "left" },
    { header: "Passed checks", align: "right" },
  ];

  return renderTable(
    columns,
    rows.map((row) => [
      row.title,
      row.score === null ? DASH : String(row.score),
      row.score === null ? "" : chip(gauge(row.score, 10)),
      chip(row.bandLabel),
      chip(row.tierLabel),
      row.passed === null ? DASH : `${row.passed} / ${row.total}`,
    ]),
  );
}

function totalsTable(totals: ReportData["checkTotals"]): string {
  const columns: Column[] = [
    { header: "Status", align: "none" },
    { header: "Count", align: "right" },
    { header: "Distribution", align: "none" },
  ];

  const row = (label: string, count: number): string[] => [
    chip(label),
    String(count),
    count > 0 ? chip(distribution(count)) : "",
  ];

  return renderTable(columns, [
    row("Passed", totals.passed),
    row("Failed", totals.failed),
    row("Not assessable", totals.notAssessable),
  ]);
}

function prioritiesTable(priorities: ReportData["priorities"]): string {
  const columns: Column[] = [
    { header: "#", align: "right" },
    { header: "Check", align: "none" },
    { header: "Severity", align: "none" },
    { header: "Dimension", align: "none" },
  ];

  return renderTable(
    columns,
    priorities.map((p) => [String(p.rank), p.checkTitle, chip(p.severityLabel), p.dimensionTitle]),
  );
}

function dimensionMetaTable(d: ReportDimension): string {
  const columns: Column[] = [
    { header: "Score", align: "none" },
    { header: "", align: "left" },
    { header: "Band", align: "left" },
    { header: "Tier", align: "left" },
    { header: "Passed checks", align: "right" },
  ];

  return renderTable(columns, [
    [
      d.score === null ? DASH : String(d.score),
      d.score === null ? "" : chip(gauge(d.score, 10)),
      chip(d.bandLabel),
      chip(d.tierLabel),
      d.passed === null ? DASH : `${d.passed} / ${d.total}`,
    ],
  ]);
}

function checksTable(checks: ReportCheck[]): string {
  const columns: Column[] = [
    { header: "Check", align: "none" },
    { header: "Severity", align: "none" },
    { header: "Status", align: "none" },
    { header: "Evidence", align: "none" },
  ];

  return renderTable(
    columns,
    checks.map((c) => [c.title, chip(c.severityLabel), chip(c.statusLabel), c.evidence]),
  );
}

function checkCard(number: number, check: ReportCheck): string {
  const parts = [`##### ${number}. ${check.title} — ${chip(check.severityLabel)}`, `**Evidence** — ${check.evidence}`];

  if (check.affectedTypes.length > 0) parts.push(`**Affects** — ${typeChips(check.affectedTypes)}`);
  if (check.impact) parts.push(`**Impact** — ${check.impact}`);
  if (check.fix) parts.push(`**Fix** — ${check.fix}`);

  return parts.join("\n\n");
}

function dimensionBlocks(d: ReportDimension): string[] {
  const blocks = [`### ${d.index}. ${d.title}`, dimensionMetaTable(d)];

  if (d.narration) blocks.push(d.narration);
  if (d.checks) {
    blocks.push("#### Checks", checksTable(d.checks));

    const failed = d.checks.filter((c) => c.failed);

    failed.forEach((check, i) => blocks.push(checkCard(i + 1, check), RULE));

    if (failed.length === 0) blocks.push(RULE);
  } else {
    blocks.push(RULE);
  }
  return blocks;
}

export function renderReport(data: ReportData): string {
  const blocks = [
    `# CMS Schema Health · ${data.siteLabel}`,
    metaTable(data),
    scoreHeading(data.overall.score),
    gaugeLine(data.overall),
    verdictBlock(data.overall),
    RULE,
    "### Scoreboard",
    scoreboardTable(data.scoreboard),
    "### Check totals",
    totalsTable(data.checkTotals),
    ...(data.priorities.length > 0 ? ["### Priorities", prioritiesTable(data.priorities)] : []),
    RULE,
    "## Dimensions",
    ...data.dimensions.flatMap((d) => dimensionBlocks(d)),
  ];

  return `${blocks.join("\n\n")}\n`;
}
