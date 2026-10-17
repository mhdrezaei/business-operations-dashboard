// src/features/contract-templates/create/components/editor/core/pagination.ts
//
// Word-like pagination for the template editor.
//
// ProseMirror stays one continuous flow; this plugin measures the rendered
// blocks (core/pagination-measure.ts) and inserts *widget decorations*
// (invisible spacers, repeated table header rows) so that every block/line/
// table-row that would cross a page's content-bottom starts at the next page's
// content-top instead. Decorations are never serialized, so editor.getHTML() /
// content_html stays clean.
//
// Measurement is always done on the "natural" layout (widgets hidden), so the
// result depends only on content and fonts. Re-measurement is triggered by doc
// changes and by anything that can change the layout on its own (resize, font
// loads, becoming visible); a bounded retry budget plus a post-render
// self-check keep the decorations from going stale without oscillating.
//
// Manual page breaks: `<hr>` (StarterKit horizontalRule, also `hr.page-break`
// in saved HTML) forces the following content onto the next page.
import type { Node as PMNode } from "@tiptap/pm/model";
import type { EditorState } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import type { FrameSpec, PaginationResult, RepeatedHeader, SpacerSpec } from "./pagination-measure";
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { contentBottom, contentTop } from "./page-layout";
import { countMisplaced, PageMeasurer } from "./pagination-measure";

/** Re-measure passes allowed between two external triggers (doc change, resize, fonts, visibility). */
const MAX_RETRY_PASSES = 4;
/** Measure anyway when a composition never reports its end (lost compositionend). */
const STUCK_COMPOSITION_MS = 3000;
const RAF_FALLBACK_MS = 150;

export interface PaginationStorage {
	pageCount: number
	/** Placed elements still crossing a page edge after the last pass (content hidden by the margin masks). */
	misplaced: number
}

declare module "@tiptap/core" {
	interface Storage {
		pagination: PaginationStorage
	}
}

export const paginationPluginKey = new PluginKey<DecorationSet>("templatePagination");

type WidgetKind = SpacerSpec["kind"] | "header";

/** Distance from a page's content-bottom to the next page's content-top. */
const BREAK_SPAN_PX = contentTop(1) - contentBottom(0);

function spacerDOM(spec: SpacerSpec) {
	if (spec.kind === "row") {
		const tr = document.createElement("tr");
		tr.className = "pg-spacer pg-spacer-row";
		const td = document.createElement("td");
		td.colSpan = Math.max(1, spec.cols || 1);
		td.style.height = `${spec.h}px`;
		tr.appendChild(td);
		return tr;
	}
	if (spec.kind === "inline") {
		const span = document.createElement("span");
		span.className = "pg-spacer pg-spacer-inline";
		span.style.height = `${spec.h}px`;
		return span;
	}
	// Empty block with a margin: collapses with (replaces) the margins around it.
	const div = document.createElement("div");
	div.className = "pg-spacer pg-spacer-block";
	div.style.marginTop = `${spec.h}px`;
	return div;
}

/** The <table> element of the innermost table around position `pos`. */
function tableAt(view: EditorView, pos: number | undefined) {
	if (pos === undefined)
		return null;
	const $pos = view.state.doc.resolve(pos);
	for (let d = $pos.depth; d > 0; d--) {
		if ($pos.node(d).type.spec.tableRole === "table") {
			const wrapper = view.nodeDOM($pos.before(d));
			return wrapper instanceof HTMLElement ? wrapper.querySelector("table") : null;
		}
	}
	return null;
}

/** The first `rows` rows of `table` (pagination widgets excluded). */
function headerRows(table: HTMLTableElement, rows: number) {
	return Array.from(table.tBodies[0]?.rows ?? [])
		.filter(r => !r.classList.contains("pg-spacer"))
		.slice(0, rows);
}

/** Visual copies of the first `rows` rows of `table` (without editor chrome). */
function cloneHeaderRows(table: HTMLTableElement, rows: number) {
	const clones = headerRows(table, rows).map(row => row.cloneNode(true) as HTMLTableRowElement);
	clones.forEach((clone) => {
		clone.querySelectorAll(".column-resize-handle, .pg-spacer").forEach(h => h.remove());
		clone.querySelectorAll(".selectedCell").forEach(c => c.classList.remove("selectedCell"));
	});
	return clones;
}

/** A table holding `clones` with the same column widths as `table`. */
function headerTableDOM(table: HTMLTableElement, clones: HTMLTableRowElement[]) {
	const inner = document.createElement("table");
	inner.className = table.className;
	const colgroup = table.querySelector("colgroup");
	if (colgroup)
		inner.appendChild(colgroup.cloneNode(true));
	inner.append(...clones);
	return inner;
}

/** Visual copy of the first `rows` rows of the table containing widget position `pos`. */
function headerRepeatDOM(view: EditorView, pos: number | undefined, { rows, h }: RepeatedHeader, cols: number) {
	const tr = document.createElement("tr");
	tr.className = "pg-spacer pg-spacer-row pg-header-repeat";
	tr.contentEditable = "false";
	const table = tableAt(view, pos);
	if (!table)
		return tr;
	const clones = cloneHeaderRows(table, rows);
	if (clones.length === 1) {
		tr.append(...Array.from(clones[0].cells));
		return tr;
	}
	// Several header rows: a nested table with the same column widths, kept at the
	// measured height. The next row's collapsed top border adds half its width to
	// this row (inside the table it was shared with the last header row).
	const td = document.createElement("td");
	td.colSpan = Math.max(1, cols);
	const lastCell = headerRows(table, rows).at(-1)?.cells[0];
	const border = lastCell ? Number.parseFloat(getComputedStyle(lastCell).borderBottomWidth) || 0 : 0;
	const box = document.createElement("div");
	Object.assign(box.style, { height: `${h - border / 2}px`, overflow: "hidden" });
	box.appendChild(headerTableDOM(table, clones));
	td.appendChild(box);
	tr.appendChild(td);
	return tr;
}

/**
 * Borders of a cell split across pages: a line at the content-bottom of each page
 * and at the next content-top, plus (first cell) the table's repeated header rows.
 */
function frameDOM(view: EditorView, pos: number | undefined, { breaks, left, width }: FrameSpec, header?: RepeatedHeader) {
	const div = document.createElement("div");
	div.className = "pg-spacer pg-frame";
	div.contentEditable = "false";
	const table = header ? tableAt(view, pos) : null;
	for (const top of breaks) {
		for (const y of [top - BREAK_SPAN_PX - 1, top]) {
			const line = document.createElement("div");
			line.className = "pg-frame-line";
			line.style.top = `${y}px`;
			div.appendChild(line);
		}
		if (table && header) {
			const inner = headerTableDOM(table, cloneHeaderRows(table, header.rows));
			Object.assign(inner.style, { top: `${top}px`, left: `${left}px`, width: `${width}px` });
			div.appendChild(inner);
		}
	}
	return div;
}

function widget(pos: number, kind: WidgetKind, key: string, side: number, toDOM: (view: EditorView, getPos: () => number | undefined) => HTMLElement) {
	return Decoration.widget(pos, (view, getPos) => {
		const el = toDOM(view, getPos);
		el.setAttribute("aria-hidden", "true");
		return el;
	}, { side, key, kind, ignoreSelection: true });
}

function buildDecorations(specs: SpacerSpec[]) {
	const decos: Decoration[] = [];
	for (const spec of specs) {
		const { header, frame } = spec;
		if (frame) {
			const key = `pg-frame-${frame.breaks.join(",")}-${frame.left}-${frame.width}-${header ? `${header.sig}-${header.rows}` : ""}`;
			decos.push(widget(spec.pos, "frame", key, -3, (view, getPos) => frameDOM(view, getPos(), frame, header)));
			continue;
		}
		decos.push(widget(spec.pos, spec.kind, `pg-${spec.kind}-${spec.h}-${spec.cols || 0}`, -2, () => spacerDOM(spec)));
		if (header) {
			decos.push(widget(spec.pos, "header", `pg-header-${header.sig}-${header.rows}-${Math.round(header.h)}`, -1, (view, getPos) => headerRepeatDOM(view, getPos(), header, spec.cols || 1)));
		}
	}
	return decos;
}

const signature = (decos: Decoration[]) => decos.map(d => `${d.from}:${d.spec.key}`).sort().join("|");

/** Mapped widgets that ended up in a parent they cannot live in (e.g. a row spacer outside a table). */
function dropMisplaced(set: DecorationSet, doc: PMNode) {
	const bad = set.find().filter((d) => {
		const kind = d.spec.kind as WidgetKind;
		const parent = doc.resolve(d.from).parent;
		const role = parent.type.spec.tableRole;
		const inTable = role === "table";
		if (kind === "row" || kind === "header")
			return !inTable;
		if (kind === "frame")
			return role !== "cell" && role !== "header_cell";
		if (kind === "inline")
			return !parent.isTextblock;
		return inTable || parent.isTextblock;
	});
	return bad.length ? set.remove(bad) : set;
}

/** Owns scheduling for one editor view: when to measure, when to stop. */
class PaginationController {
	private frame = 0;
	private timer: ReturnType<typeof setTimeout> | undefined;
	private retries = MAX_RETRY_PASSES;
	private rootSize = { width: -1, height: -1 };
	/**
	 * Rendered height of every top-level block at the last measurement (the editor's own
	 * height is pinned by its min-height, so content changes are observed per block).
	 */
	private readonly blockHeights = new Map<Element, number>();
	private composingSince = 0;
	/** The doc changed since the last pass: moved spacers may have moved the caret off-screen. */
	private followSelection = false;
	private destroyed = false;
	private readonly resizeObserver: ResizeObserver;
	private readonly intersectionObserver: IntersectionObserver;

	constructor(private readonly view: EditorView, private readonly storage: PaginationStorage) {
		const dom = view.dom as HTMLElement;
		this.resizeObserver = new ResizeObserver(this.onResize);
		this.resizeObserver.observe(dom);
		this.intersectionObserver = new IntersectionObserver((entries) => {
			if (entries.some(e => e.isIntersecting))
				this.reset();
		});
		this.intersectionObserver.observe(dom);
		document.fonts?.addEventListener?.("loadingdone", this.reset);
		document.fonts?.ready.then(this.reset).catch(() => {});
		document.addEventListener("visibilitychange", this.onVisibility);
		dom.addEventListener("compositionend", this.schedule);
		this.reset();
	}

	update(view: EditorView, prevState: EditorState) {
		if (!view.state.doc.eq(prevState.doc)) {
			this.followSelection = true;
			this.reset();
		}
	}

	destroy() {
		this.destroyed = true;
		this.cancel();
		this.resizeObserver.disconnect();
		this.blockHeights.clear();
		this.intersectionObserver.disconnect();
		document.fonts?.removeEventListener?.("loadingdone", this.reset);
		document.removeEventListener("visibilitychange", this.onVisibility);
		this.view.dom.removeEventListener("compositionend", this.schedule);
	}

	/** Something outside the measurement changed: re-measure with a fresh retry budget. */
	private readonly reset = () => {
		this.retries = MAX_RETRY_PASSES;
		this.schedule();
	};

	/** Layout changed by itself or the self-check failed: re-measure while the budget lasts (no oscillation). */
	private retry() {
		if (this.retries <= 0)
			return;
		this.retries--;
		this.schedule();
	}

	private readonly schedule = () => {
		if (this.destroyed || this.frame)
			return;
		clearTimeout(this.timer);
		this.frame = requestAnimationFrame(this.run);
		// Fallback when rAF is throttled (hidden tab/pane).
		this.timer = setTimeout(this.run, RAF_FALLBACK_MS);
	};

	private cancel() {
		cancelAnimationFrame(this.frame);
		clearTimeout(this.timer);
		this.frame = 0;
		this.timer = undefined;
	}

	private readonly onResize = (entries: ResizeObserverEntry[]) => {
		let rootChanged = false;
		let blockChanged = false;
		for (const entry of entries) {
			const width = entry.borderBoxSize?.[0]?.inlineSize ?? entry.contentRect.width;
			const height = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
			if (entry.target === this.view.dom) {
				// Width changed, or the editor was hidden/shown.
				rootChanged = Math.abs(width - this.rootSize.width) >= 1 || !height !== !this.rootSize.height;
				this.rootSize = { width, height };
				continue;
			}
			const expected = this.blockHeights.get(entry.target);
			if (expected !== undefined && Math.abs(height - expected) >= 1)
				blockChanged = true;
		}
		if (rootChanged)
			this.reset();
		else if (blockChanged)
			this.retry();
	};

	/** Observe the current top-level blocks and remember their rendered heights. */
	private trackBlocks() {
		const seen = new Set<Element>();
		for (const child of Array.from(this.view.dom.children)) {
			if (child.classList.contains("pg-spacer"))
				continue;
			seen.add(child);
			if (!this.blockHeights.has(child))
				this.resizeObserver.observe(child);
			this.blockHeights.set(child, (child as HTMLElement).offsetHeight);
		}
		for (const el of this.blockHeights.keys()) {
			if (!seen.has(el)) {
				this.resizeObserver.unobserve(el);
				this.blockHeights.delete(el);
			}
		}
	}

	private readonly onVisibility = () => {
		if (document.visibilityState === "visible")
			this.reset();
	};

	private readonly run = () => {
		this.cancel();
		const { view } = this;
		if (this.destroyed || !view.dom.isConnected)
			return;
		if (view.composing) {
			this.composingSince ||= Date.now();
			if (Date.now() - this.composingSince < STUCK_COMPOSITION_MS) {
				this.timer = setTimeout(this.schedule, 200);
				return;
			}
		}
		this.composingSince = 0;

		let result: PaginationResult | null;
		try {
			result = new PageMeasurer(view).measure();
		}
		catch (error) {
			console.error("[pagination] measurement failed", error);
			this.retry();
			return;
		}
		// Not laid out (hidden/detached): the observers call reset() once it is.
		if (!result)
			return;
		this.apply(result);
		this.followSelection = false;
		this.trackBlocks();
		this.storage.misplaced = countMisplaced(view.dom as HTMLElement, result.checks);
		if (this.storage.misplaced > 0)
			this.retry();
	};

	private apply({ specs, pageCount }: PaginationResult) {
		const { view, storage } = this;
		const pagesChanged = storage.pageCount !== pageCount;
		storage.pageCount = pageCount;
		const decos = buildDecorations(specs);
		const current = paginationPluginKey.getState(view.state) ?? DecorationSet.empty;
		if (signature(decos) !== signature(current.find())) {
			const tr = view.state.tr
				.setMeta(paginationPluginKey, DecorationSet.create(view.state.doc, decos))
				.setMeta("addToHistory", false)
				.setMeta("pagination", true);
			// Only after edits: a re-measure on resize/font load must not jump back to the caret.
			if (this.followSelection && view.hasFocus())
				tr.scrollIntoView();
			view.dispatch(tr);
		}
		else if (pagesChanged) {
			// Let listeners (canvas page count) know without changing decorations.
			view.dispatch(view.state.tr.setMeta("addToHistory", false).setMeta("pagination", true));
		}
	}
}

export const Pagination = Extension.create<Record<string, never>, PaginationStorage>({
	name: "pagination",

	addStorage() {
		return { pageCount: 1, misplaced: 0 };
	},

	addProseMirrorPlugins() {
		const storage = this.storage;

		return [
			new Plugin<DecorationSet>({
				key: paginationPluginKey,
				state: {
					init: () => DecorationSet.empty,
					apply(tr, set) {
						const meta = tr.getMeta(paginationPluginKey) as DecorationSet | undefined;
						if (meta)
							return meta;
						return tr.docChanged ? dropMisplaced(set.map(tr.mapping, tr.doc), tr.doc) : set;
					},
				},
				props: {
					decorations(state) {
						return paginationPluginKey.getState(state);
					},
				},
				view: editorView => new PaginationController(editorView, storage),
			}),
		];
	},
});
