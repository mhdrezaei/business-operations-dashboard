import type { TemplateTagMeta, TemplateTagTable } from "../../api/contracts.api";

const CELL_STYLE = "border:1px solid currentColor;padding:2px 6px;text-align:center;";
const TABLE_STYLE = "border-collapse:collapse;width:100%;";

function isTable(value: unknown): value is TemplateTagTable & { render_mode: string } {
	return typeof value === "object" && value !== null && Array.isArray((value as TemplateTagTable).columns) && Array.isArray((value as TemplateTagTable).rows);
}

function renderCell(cell: unknown): string {
	if (isTable(cell))
		return renderTable(cell);
	return cell === null || cell === undefined || cell === "" ? "-" : String(cell);
}

function renderTable({ columns, rows }: TemplateTagTable): string {
	const head = columns.map(column => `<th style="${CELL_STYLE}">${column.label}</th>`).join("");
	const body = rows
		.map(row => `<tr>${columns.map(column => `<td style="${CELL_STYLE}">${renderCell(row[column.key])}</td>`).join("")}</tr>`)
		.join("");
	return `<table style="${TABLE_STYLE}"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

/** Backend `meta` → printable HTML: tiers/tables as real tables, everything else its Persian `display` text. */
export function formatTagValueHtml(value: unknown, meta?: TemplateTagMeta): string {
	if (isTable(meta))
		return renderTable(meta);
	return String(meta?.display ?? value).replace(/\n/g, "<br/>");
}
