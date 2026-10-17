// src/features/contract-templates/create/components/editor/core/pagination-measure.ts
//
// Pure layout measurement for the pagination plugin (core/pagination.ts).
//
// The measurer walks the document on its "natural" layout (all pagination
// widgets hidden via the `pg-measuring` class for one synchronous read) and
// returns the spacers that move every block / table row / text line crossing a
// page's content-bottom to the next page's content-top.
import type { Node as PMNode } from "@tiptap/pm/model";
import type { EditorView } from "@tiptap/pm/view";
import { TableMap } from "@tiptap/pm/tables";
import { contentBottom, contentTop, PAGE_CONTENT_HEIGHT_PX, pageIndexAt } from "./page-layout";

const EPS = 0.5;
/** Self-check tolerance (rounding of spacer heights, collapsed table borders). */
const CHECK_TOLERANCE_PX = 2;
/** Paragraphs with at least this many lines may be split between pages… */
const MIN_SPLIT_LINES = 4;
/** …keeping at least this many lines on each side (widow/orphan control). */
const KEEP_LINES = 2;

export type SpacerKind = "block" | "row" | "inline" | "frame";

/** Table header rows repeated at the top of a table segment on a new page. */
export interface RepeatedHeader { rows: number, h: number, sig: string }

/**
 * Page breaks inside a table row split across pages (kind "frame", one per cell):
 * `breaks` are the continuation pages' content tops relative to the cell's padding
 * box; `left`/`width` place a repeated header (first cell only) across the table.
 */
export interface FrameSpec { breaks: number[], left: number, width: number }

export interface SpacerSpec {
	kind: SpacerKind
	pos: number
	h: number
	cols?: number
	header?: RepeatedHeader
	frame?: FrameSpec
}

export interface PaginationResult {
	specs: SpacerSpec[]
	pageCount: number
	/** Elements placed whole on one page; used for the post-render self-check. */
	checks: HTMLElement[]
}

interface Prev { node: PMNode, pos: number, el: HTMLElement, prevEl: HTMLElement | null }
interface RowRef { pos: number, el: HTMLElement, prevEl: HTMLElement | null }
interface TableInfo {
	cols: number
	/** Index of the first row of the rowspan group each row belongs to. */
	groupStart: number[]
	/** Per row: positions of the cells from earlier rows that span into it. */
	spanning: number[][]
	headerRows: number
	header?: RepeatedHeader
	atTop: boolean
	rows: RowRef[]
}
interface Parent {
	/** The first child may get a spacer before it (top level / table cell) instead of bubbling. */
	leading: boolean
	table?: TableInfo
}
type Placement = "ok" | "bubble";

const CONTAINER_TYPES = new Set(["bulletList", "orderedList", "listItem", "blockquote", "table"]);

/** Headings and short all-bold paragraphs ("ماده ۱ – ...") stay with the next block. */
function isKeepWithNext(node: PMNode) {
	if (node.type.name === "heading")
		return true;
	if (node.type.name !== "paragraph" || node.childCount === 0 || node.textContent.length > 120)
		return false;
	let allBold = true;
	node.forEach((child) => {
		if (!child.isText || !child.marks.some(m => m.type.name === "bold"))
			allBold = false;
	});
	return allBold;
}

/** Whether `node` holds a manual page break (`<hr>`) below it. */
function containsPageBreak(node: PMNode) {
	let found = false;
	node.descendants((child) => {
		found ||= child.type.name === "horizontalRule";
		return !found && !child.isTextblock;
	});
	return found;
}

const isHeaderRow = (row: PMNode) => row.childCount > 0 && Array.from({ length: row.childCount }, (_, i) => row.child(i)).every(c => c.type.name === "tableHeader");

function hashString(s: string) {
	let h = 5381;
	for (let i = 0; i < s.length; i++)
		h = ((h << 5) + h + s.charCodeAt(i)) | 0;
	return (h >>> 0).toString(36);
}

const px = (value: string) => Number.parseFloat(value) || 0;

/**
 * Room to leave above table row / table `el` at a content top: its collapsed top
 * border straddles the row edge, and spacer heights are rounded, so without it the
 * border may land under the margin mask (a split table loses its top line).
 */
function borderOverhang(el: HTMLElement) {
	const row = el instanceof HTMLTableRowElement ? el : el.querySelector<HTMLTableElement>(":scope > table")?.rows[0];
	const cell = row?.cells[0];
	return cell ? Math.ceil(px(getComputedStyle(cell).borderTopWidth)) : 0;
}

/** Used line height of `el` in px (`normal` ≈ 1.2 × font size). */
function lineHeightOf(el: HTMLElement) {
	const style = getComputedStyle(el);
	return px(style.lineHeight) || px(style.fontSize) * 1.2;
}

/** CSS-px → client-px factor of the paged root (CSS transforms/zoom); 0 while it is not laid out. */
export function layoutScale(root: HTMLElement) {
	if (!root.isConnected || !root.offsetWidth || !root.offsetHeight || !root.getClientRects().length)
		return 0;
	return root.getBoundingClientRect().width / root.offsetWidth;
}

/** Number of `els` that (in the rendered layout) cross a content-bottom or sit in a header/margin area. */
export function countMisplaced(root: HTMLElement, els: HTMLElement[]) {
	const scale = layoutScale(root);
	if (!scale)
		return 0;
	const rootTop = root.getBoundingClientRect().top;
	let bad = 0;
	for (const el of els) {
		const r = el.getBoundingClientRect();
		if (!el.isConnected || !r.height)
			continue;
		const top = (r.top - rootTop) / scale;
		const bottom = (r.bottom - rootTop) / scale;
		const page = pageIndexAt(top);
		if (top < contentTop(page) - CHECK_TOLERANCE_PX || bottom > contentBottom(page) + CHECK_TOLERANCE_PX)
			bad++;
	}
	return bad;
}

export class PageMeasurer {
	private readonly specs: SpacerSpec[] = [];
	private readonly checks: HTMLElement[] = [];
	private shift = 0; // total spacer height inserted before the current flow point
	private page = 0; // page the flow is currently on
	private flowBottom = contentTop(0);
	private pendingBreak: HTMLElement | null = null; // hr element awaiting a forced break
	private reserve = 0; // space kept free below each content top (repeated header of a split row)
	private rootTop = 0;
	private scale = 1;

	constructor(private readonly view: EditorView) {}

	/** Returns null when the editor is not laid out (hidden, detached, zero size). */
	measure(): PaginationResult | null {
		const root = this.view.dom as HTMLElement;
		this.scale = layoutScale(root);
		if (!this.scale)
			return null;
		root.classList.add("pg-measuring");
		try {
			this.rootTop = root.getBoundingClientRect().top;
			this.placeChildren(this.view.state.doc, -1, { leading: true });
			let pageCount = Math.max(1, pageIndexAt(this.flowBottom - EPS) + 1);
			if (this.pendingBreak)
				pageCount = Math.max(pageCount, pageIndexAt(this.rectOf(this.pendingBreak).top) + 2);
			return { specs: this.specs, pageCount, checks: this.checks };
		}
		finally {
			root.classList.remove("pg-measuring");
		}
	}

	// ─── geometry (natural layout + inserted spacers) ─────────────────────

	/** Where pushed content starts on `page`. */
	private top(page: number) {
		return contentTop(page) + this.reserve;
	}

	private y(clientY: number) {
		return (clientY - this.rootTop) / this.scale;
	}

	private rectOf(el: HTMLElement) {
		const r = el.getBoundingClientRect();
		return { top: this.y(r.top) + this.shift, bottom: this.y(r.bottom) + this.shift };
	}

	/** Natural coordinates of the line box at `pos`. */
	private coordsAt(pos: number, side: 1 | -1 = 1) {
		const c = this.view.coordsAtPos(pos, side);
		return { top: this.y(c.top), bottom: this.y(c.bottom) };
	}

	private domOf(pos: number) {
		const el = this.view.nodeDOM(pos);
		return el instanceof HTMLElement ? el : null;
	}

	/** Insert a spacer starting at `fromY` that ends at the content top of `targetPage`. */
	private push(spec: Omit<SpacerSpec, "h">, fromY: number, targetPage: number, movedBy?: number) {
		const exact = this.top(targetPage) - fromY;
		const h = Math.round(exact);
		this.page = targetPage;
		if (h <= 0 && !spec.header)
			return;
		this.specs.push({ ...spec, h: Math.max(0, h) });
		// Keep the rounding of `h` in the model so it cannot accumulate over many pages.
		this.shift += Math.max(0, (movedBy ?? exact) + h - exact) + (spec.header?.h ?? 0);
	}

	/**
	 * Move block/row `el` to the content top of `targetPage` with a spacer right before it.
	 * A block spacer is an empty block with margin-top (see spacerDOM): it *replaces* the
	 * collapsed margins between `prevEl` and `el` instead of adding to them, so `el`
	 * lands exactly on the content top whatever margins the two blocks have (tables a
	 * border width lower, see borderOverhang).
	 */
	private pushBefore(spec: Omit<SpacerSpec, "h">, el: HTMLElement, prevEl: HTMLElement | null, targetPage: number) {
		const top = this.rectOf(el).top;
		const fromY = prevEl ? this.rectOf(prevEl).bottom : top - px(getComputedStyle(el).marginTop);
		const lift = borderOverhang(el);
		this.push(spec, fromY - lift, targetPage, this.top(targetPage) + lift - top);
	}

	private accept(el: HTMLElement, bottom: number) {
		this.flowBottom = bottom;
		this.checks.push(el);
	}

	/** Content does not fit on any page and cannot be split: let it run on (clipped by the canvas margin masks). */
	private overflow(bottom: number) {
		this.flowBottom = bottom;
		this.page = Math.max(this.page, pageIndexAt(bottom - EPS));
	}

	private snapshot() {
		const { shift, page, flowBottom, pendingBreak } = this;
		const nSpecs = this.specs.length;
		const nChecks = this.checks.length;
		return () => {
			Object.assign(this, { shift, page, flowBottom, pendingBreak });
			this.specs.length = nSpecs;
			this.checks.length = nChecks;
		};
	}

	// ─── placement ───────────────────────────────────────────────────────

	private placeChildren(node: PMNode, pos: number, parent: Parent): Placement {
		let prevEl: HTMLElement | null = null;
		let prev: Prev | null = null;
		let result: Placement = "ok";
		let index = 0;
		node.forEach((child, offset) => {
			const i = index++;
			if (result === "bubble")
				return;
			const childPos = pos + 1 + offset;
			const el = this.domOf(childPos);
			if (!el)
				return;
			if (parent.table)
				parent.table.rows[i] = { pos: childPos, el, prevEl };
			if (this.place(child, childPos, el, prevEl, parent, prev, i) === "bubble") {
				result = "bubble";
				return;
			}
			prev = { node: child, pos: childPos, el, prevEl };
			prevEl = el;
		});
		return result;
	}

	/** Place one block. Returns "bubble" when it must be moved together with its container. */
	private place(node: PMNode, pos: number, el: HTMLElement, prevEl: HTMLElement | null, parent: Parent, prev: Prev | null, index: number): Placement {
		const table = parent.table;
		const spacerAt = (at: number, rowIndex: number): Omit<SpacerSpec, "h"> => table
			? { kind: "row", pos: at, cols: table.cols, header: rowIndex >= table.headerRows ? table.header : undefined }
			: { kind: "block", pos: at };

		if (this.pendingBreak) {
			const brk = this.pendingBreak;
			this.pendingBreak = null;
			this.pushBefore(spacerAt(pos, index), el, prevEl || brk, pageIndexAt(this.rectOf(brk).top) + 1);
		}

		if (node.type.name === "horizontalRule") {
			const r = this.rectOf(el);
			// A page break never gets pushed itself; it may sit in the bottom margin.
			this.page = Math.max(this.page, pageIndexAt(r.top));
			this.flowBottom = r.bottom;
			this.pendingBreak = el;
			return "ok";
		}

		const name = node.type.name;
		const isContainer = CONTAINER_TYPES.has(name);
		// A page break inside a list item / quote is only honoured by walking the container.
		const hasBreak = isContainer && containsPageBreak(node);
		for (let guard = 0; guard < 4; guard++) {
			let r = this.rectOf(el);
			// Flow ended in a gap/bottom margin (e.g. after an oversized block): move to the next page top.
			if (prevEl && r.top < contentTop(this.page) - EPS && r.top > contentBottom(Math.max(0, this.page - 1))) {
				this.pushBefore(spacerAt(pos, index), el, prevEl, this.page);
				r = this.rectOf(el);
			}
			if (r.bottom <= contentBottom(this.page) + EPS && !hasBreak) {
				this.accept(el, r.bottom);
				return "ok";
			}
			const atTop = r.top <= this.top(this.page) + 2;
			if (isContainer && (hasBreak || atTop || r.top < contentBottom(this.page) - 30)) {
				const restore = this.snapshot();
				const childParent: Parent = { leading: false, table: name === "table" ? this.tableInfo(node, pos, atTop) : undefined };
				if (this.placeChildren(node, pos, childParent) === "ok") {
					this.flowBottom = Math.max(this.flowBottom, this.rectOf(el).bottom);
					this.page = Math.max(this.page, pageIndexAt(this.flowBottom - EPS));
					return "ok";
				}
				restore();
			}
			else if (name === "tableRow" && (atTop || r.bottom - r.top > PAGE_CONTENT_HEIGHT_PX - (table?.header?.h ?? 0))) {
				// Taller than a page: break the row between the lines of its cells.
				this.splitRow(node, pos, el, table, index);
				return "ok";
			}
			else if (node.isTextblock && (atTop || this.lineCount(el, r.bottom - r.top) >= MIN_SPLIT_LINES)) {
				if (this.splitLines(node, pos, el))
					return "ok";
			}
			if (atTop) {
				this.overflow(r.bottom);
				return "ok";
			}
			if (!prevEl && !parent.leading)
				return "bubble";
			if (table) {
				// A header row must not stay alone at a page bottom.
				if (index === table.headerRows && index > 0 && !table.atTop)
					return "bubble";
				// Rows joined by a rowspan move together.
				const start = table.groupStart[index] ?? index;
				if (start !== index) {
					const first = table.rows[start];
					if (!first)
						return "bubble";
					// Moving the group cannot help when it already starts a page (below a repeated
					// header) or is taller than one: split this row instead (a rowspan cell itself
					// cannot be split and stays clipped by the margin masks).
					const firstTop = this.rectOf(first.el).top;
					// The rowspan cells of the group's first row end at the group's bottom.
					const groupBottom = Math.max(r.bottom, ...Array.from(first.el.children, c => this.rectOf(c as HTMLElement).bottom));
					const headerH = table.header?.h ?? 0;
					if (firstTop <= this.top(this.page) + headerH + 2 || groupBottom - firstTop > PAGE_CONTENT_HEIGHT_PX - headerH) {
						this.splitRow(node, pos, el, table, index);
						return "ok";
					}
					if (start === 0)
						return "bubble";
					this.pushBefore(spacerAt(first.pos, start), first.el, first.prevEl, this.page + 1);
					continue;
				}
			}
			// Keep a title with the block that follows it (Word "keep with next").
			else if (prev && prev.prevEl && isKeepWithNext(prev.node)) {
				const pr = this.rectOf(prev.el);
				if (pr.top > this.top(this.page) + 2 && pageIndexAt(pr.top) === this.page) {
					this.pushBefore({ kind: "block", pos: prev.pos }, prev.el, prev.prevEl, this.page + 1);
					continue;
				}
			}
			this.pushBefore(spacerAt(pos, index), el, prevEl, this.page + 1);
		}
		return "ok";
	}

	private lineCount(el: HTMLElement, height: number) {
		const lineHeight = lineHeightOf(el);
		return lineHeight > 0 ? Math.round(height / lineHeight) : 1;
	}

	/** Split a textblock between lines (widow/orphan control). Returns true when handled. */
	private splitLines(node: PMNode, pos: number, el: HTMLElement): boolean {
		const start = pos + 1;
		const end = pos + node.nodeSize - 1;
		if (end - start < 2)
			return false;
		const lineHeight = lineHeightOf(el) || 1;
		const lines = (from: number, to: number) => Math.round((to - from) / lineHeight);
		// First position whose line bottom lies below `limit` (natural coords).
		const firstBelow = (from: number, limit: number) => {
			let lo = from;
			let hi = end;
			while (lo < hi) {
				const mid = (lo + hi) >> 1;
				if (this.coordsAt(mid).bottom > limit + EPS)
					hi = mid;
				else
					lo = mid + 1;
			}
			return lo;
		};
		const lastBottom = this.coordsAt(end).bottom;
		let from = start;
		let didSplit = false;
		for (let guard = 0; guard < 50; guard++) {
			const limit = contentBottom(this.page) - this.shift;
			if (lastBottom <= limit + EPS)
				break;
			let breakPos = firstBelow(from, limit);
			// Widow: at least KEEP_LINES lines start the next page.
			if (lines(this.coordsAt(breakPos).top, lastBottom) < KEEP_LINES)
				breakPos = firstBelow(from, lastBottom - (KEEP_LINES - 0.5) * lineHeight);
			const lineTop = this.coordsAt(breakPos).top;
			const firstTop = this.coordsAt(from).top;
			// Orphan: at least KEEP_LINES lines stay on this page.
			if (breakPos <= from || lines(firstTop, lineTop) < KEEP_LINES)
				return didSplit;
			const prevBottom = this.coordsAt(breakPos - 1, -1).bottom;
			const boundary = Math.min(lineTop, (prevBottom + lineTop) / 2);
			this.push({ kind: "inline", pos: breakPos }, boundary + this.shift, this.page + 1);
			didSplit = true;
			from = breakPos;
		}
		if (didSplit)
			this.overflow(this.rectOf(el).bottom);
		return didSplit;
	}

	/**
	 * Break a table row across pages: each cell is paginated as its own flow, below
	 * the table's repeated header on every continuation page.
	 */
	private splitRow(row: PMNode, pos: number, el: HTMLElement, table: TableInfo | undefined, index: number) {
		const { shift, page, reserve } = this;
		const header = table?.header;
		const naturalBottom = this.rectOf(el).bottom;
		const tableRect = el.closest("table")!.getBoundingClientRect();
		// Origin of a cell's padding box (containing block of its frame widget).
		const origin = (cellPos: number, cellEl: HTMLElement) => ({
			pos: cellPos + 1,
			top: this.rectOf(cellEl).top + cellEl.clientTop,
			left: (cellEl.getBoundingClientRect().left - tableRect.left) / this.scale + cellEl.clientLeft,
		});
		const cells: ReturnType<typeof origin>[] = [];
		// Rowspan cells from earlier rows cannot be split, but their frame is closed too.
		for (const cellPos of table?.spanning[index] ?? []) {
			const cellEl = this.domOf(cellPos);
			if (cellEl)
				cells.push(origin(cellPos, cellEl));
		}
		const firstOwnCell = cells.length;
		let bottom = naturalBottom;
		this.reserve = header?.h ?? 0;
		row.forEach((cell, offset) => {
			const cellPos = pos + 1 + offset;
			const cellEl = this.domOf(cellPos);
			if (!cellEl)
				return;
			this.shift = shift;
			this.page = page;
			cells.push(origin(cellPos, cellEl));
			this.placeChildren(cell, cellPos, { leading: true });
			const last = Array.from(cellEl.children).reverse().find(c => !c.classList.contains("pg-spacer")) as HTMLElement | undefined;
			if (!last)
				return;
			const style = getComputedStyle(cellEl);
			const below = px(getComputedStyle(last).marginBottom) + px(style.paddingBottom) + px(style.borderBottomWidth);
			bottom = Math.max(bottom, this.rectOf(last).bottom + below);
		});
		this.reserve = reserve;
		this.shift = shift + Math.max(0, bottom - naturalBottom);
		this.page = page;
		// Close the cell frames at each page break (the margin masks hide the borders there).
		const tops: number[] = [];
		for (let p = page; p < pageIndexAt(bottom - EPS); p++)
			tops.push(contentTop(p + 1));
		if (tops.length) {
			const width = Math.round(tableRect.width / this.scale);
			cells.forEach((cell, i) => this.specs.push({
				kind: "frame",
				pos: cell.pos,
				h: 0,
				header: i === firstOwnCell ? header : undefined,
				frame: { breaks: tops.map(t => Math.round(t - cell.top)), left: -Math.round(cell.left), width },
			}));
		}
		this.overflow(bottom);
	}

	private tableInfo(table: PMNode, pos: number, atTop: boolean): TableInfo {
		const map = TableMap.get(table);
		const firstRow = new Map<number, number>();
		map.map.forEach((cell, i) => {
			if (!firstRow.has(cell))
				firstRow.set(cell, Math.floor(i / map.width));
		});
		const groupStart: number[] = [];
		const spanning: number[][] = [];
		for (let r = 0; r < map.height; r++) {
			let g = r;
			const covering = new Set<number>();
			for (let c = 0; c < map.width; c++) {
				const cell = map.map[r * map.width + c];
				const top = firstRow.get(cell) ?? r;
				if (top < r) {
					g = Math.min(g, groupStart[top]);
					covering.add(pos + 1 + cell);
				}
			}
			groupStart.push(g);
			spanning.push([...covering]);
		}

		let headerRows = 0;
		while (headerRows < table.childCount && isHeaderRow(table.child(headerRows)))
			headerRows++;
		let header: RepeatedHeader | undefined;
		if (headerRows > 0 && headerRows < table.childCount) {
			const firstEl = this.domOf(pos + 1);
			let lastPos = pos + 1;
			for (let i = 0; i < headerRows - 1; i++)
				lastPos += table.child(i).nodeSize;
			const lastEl = this.domOf(lastPos);
			const h = firstEl && lastEl ? this.rectOf(lastEl).bottom - this.rectOf(firstEl).top : 0;
			if (h > 0 && h < PAGE_CONTENT_HEIGHT_PX / 3) {
				const json = Array.from({ length: headerRows }, (_, i) => table.child(i).toJSON());
				header = { rows: headerRows, h, sig: hashString(JSON.stringify(json)) };
			}
		}
		return { cols: map.width, groupStart, spanning, headerRows, header, atTop, rows: [] };
	}
}
