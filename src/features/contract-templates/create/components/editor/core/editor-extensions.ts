import type { Node as PMNode } from "@tiptap/pm/model";
import type { EditorState, Transaction } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
// src/features/contract-templates/create/components/editor/core/editor-extensions.ts
import { Extension, mergeAttributes, Node } from "@tiptap/core";
import Color from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import Highlight from "@tiptap/extension-highlight";
import Strike from "@tiptap/extension-strike";
import { Table, TableView } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { Selection } from "@tiptap/extensions";
import { Plugin } from "@tiptap/pm/state";
import { columnResizingPluginKey, TableMap } from "@tiptap/pm/tables";
import { ReactNodeViewRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import VariableChip from "../ui/VariableChip";
import { PAGE_CONTENT_WIDTH_PX } from "./page-layout";

declare module "@tiptap/core" {
	interface Commands<ReturnType> {
		fontSize: { setFontSize: (size: string) => ReturnType, unsetFontSize: () => ReturnType }
		direction: { setDirection: (dir: "ltr" | "rtl") => ReturnType }
		blockLineHeight: { setBlockLineHeight: (lineHeight: string | null) => ReturnType }
		templateVariable: { insertTemplateVariable: (key: string) => ReturnType }
	}
}

export const VariableNode = Node.create({
	name: "templateVariable",
	group: "inline",
	inline: true,
	atom: true,
	marks: "",
	addAttributes() {
		return {
			key: { default: "", parseHTML: el => el.getAttribute("data-variable") || "", renderHTML: attrs => ({ "data-variable": attrs.key }) },
		};
	},
	parseHTML() { return [{ tag: "span[data-variable]" }]; },
	renderHTML({ HTMLAttributes }) { return ["span", mergeAttributes(HTMLAttributes, { class: "tpl-variable" })]; },
	addNodeView() { return ReactNodeViewRenderer(VariableChip, { as: "span" }); },
	addCommands() {
		return {
			insertTemplateVariable: key => ({ state, tr, dispatch }) => {
				const { selection } = state;
				const marks = state.storedMarks || selection.$from.marks();
				if (dispatch) {
					const node = state.schema.nodes.templateVariable.create({ key }, null, marks);
					tr.replaceSelectionWith(node, false);
				}
				return true;
			},
		};
	},
});

export const FontSize = Extension.create({
	name: "fontSize",
	addOptions() { return { types: ["textStyle"] }; },
	addGlobalAttributes() {
		return [{
			types: this.options.types,
			attributes: {
				fontSize: {
					default: null,
					parseHTML: element => element.style.fontSize?.replace(/['"]+/g, ""),
					renderHTML: attrs => (!attrs.fontSize ? {} : { style: `font-size: ${attrs.fontSize}` }),
				},
			},
		}];
	},
	addCommands() {
		return {
			setFontSize: fontSize => ({ chain }) => chain().setMark("textStyle", { fontSize }).run(),
			unsetFontSize: () => ({ chain }) => chain().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run(),
		};
	},
});

export const Direction = Extension.create({
	name: "direction",
	addGlobalAttributes() {
		return [{
			types: ["paragraph", "heading"],
			attributes: {
				dir: {
					default: null,
					parseHTML: el => el.getAttribute("dir"),
					renderHTML: attrs => (attrs.dir ? { dir: attrs.dir } : {}),
				},
			},
		}];
	},
	addCommands() {
		return { setDirection: dir => ({ commands }) => ["paragraph", "heading"].map(type => commands.updateAttributes(type, { dir })).some(Boolean) };
	},
});

/**
 * CSS line-height of Word's "single" spacing for Persian fonts (≈ (winAscent +
 * winDescent) / unitsPerEm of B Mitra / B Nazanin). Word line spacing is a multiple
 * of it, so Word's "1" is not CSS `line-height: 1` (the lines would overlap).
 */
export const WORD_SINGLE_LINE_HEIGHT = 1.4;

const isTextBlock = (el: HTMLElement) => /^(?:P|H[1-6])$/.test(el.tagName);

export const BlockLineHeight = Extension.create({
	name: "blockLineHeight",
	addGlobalAttributes() {
		return [{
			types: ["paragraph", "heading"],
			attributes: {
				lineHeight: {
					default: null,
					parseHTML: el => el.style.lineHeight || null,
					renderHTML: attrs => (attrs.lineHeight ? { style: `line-height: ${attrs.lineHeight}` } : {}),
				},
			},
		}];
	},
	addCommands() {
		return { setBlockLineHeight: lineHeight => ({ commands }) => ["paragraph", "heading"].map(type => commands.updateAttributes(type, { lineHeight })).some(Boolean) };
	},
});

export const NodeStyle = Extension.create({
	name: "nodeStyle",
	addGlobalAttributes() {
		return [{
			types: ["table", "tableRow", "tableCell", "tableHeader", "paragraph", "heading"],
			attributes: {
				style: {
					default: null,
					parseHTML: (el) => {
						if (!isTextBlock(el) || !el.style.lineHeight)
							return el.getAttribute("style");
						// Owned by BlockLineHeight (kept once, editable from the toolbar)
						const style = (el.cloneNode() as HTMLElement).style;
						style.removeProperty("line-height");
						return style.cssText || null;
					},
					renderHTML: attrs => (attrs.style ? { style: attrs.style } : {}),
				},
			},
		}];
	},
});

export const TABLE_CELL_MIN_WIDTH_PX = 56;

/** Rendered column minimum: the configured one, shrunk so `count` columns fit the content width. */
const columnMinWidth = (cellMinWidth: number, count: number) => Math.min(cellMinWidth, Math.floor(PAGE_CONTENT_WIDTH_PX / Math.max(count, 1)));

/** Saved width of every column of `table`, from its first row (0 = flexible). */
function savedColumnWidths(table: PMNode) {
	const widths: number[] = [];
	table.firstChild?.forEach(({ attrs }) => {
		for (let j = 0; j < attrs.colspan; j++)
			widths.push(attrs.colwidth?.[j] || 0);
	});
	return widths;
}

/**
 * Displayed column widths (0 = flexible): at least `min`, and when they do not fit
 * the page content width, fixed columns are scaled down proportionally; columns
 * that would drop below `min` are pinned to it and the rest re-scaled.
 */
function fitColumnWidths(widths: number[], min: number) {
	const max = PAGE_CONTENT_WIDTH_PX;
	const shown = widths.map(w => (w ? Math.max(w, min) : 0));
	const fixedSum = shown.reduce((a, b) => a + b, 0);
	const flexibleCount = widths.filter(w => !w).length;
	if (fixedSum <= 0 || fixedSum + flexibleCount * min <= max)
		return shown;
	const pinned = new Set<number>();
	let scale = 1;
	for (let pass = 0; pass < widths.length; pass++) {
		const unpinnedSum = widths.reduce((a, w, i) => (w && !pinned.has(i) ? a + w : a), 0);
		const avail = max - (flexibleCount + pinned.size) * min;
		scale = unpinnedSum > 0 ? Math.max(0, avail) / unpinnedSum : 0;
		let changed = false;
		widths.forEach((w, i) => {
			if (w && !pinned.has(i) && w * scale < min) {
				pinned.add(i);
				changed = true;
			}
		});
		if (!changed)
			break;
	}
	return widths.map((w, i) => (!w ? 0 : pinned.has(i) ? min : Math.max(min, Math.floor(w * scale))));
}

/** Write `widths` (one per column, 0 = flexible) into the cells of the table at `tablePos`. */
function setColumnWidths(tr: Transaction, table: PMNode, tablePos: number, widths: number[]) {
	const map = TableMap.get(table);
	new Set(map.map).forEach((cellPos) => {
		const { left, right } = map.findCell(cellPos);
		const cell = table.nodeAt(cellPos)!;
		const colwidth = widths.slice(left, right);
		if (colwidth.every((w, i) => w === (cell.attrs.colwidth?.[i] || 0)))
			return;
		tr.setNodeMarkup(tablePos + 1 + cellPos, null, { ...cell.attrs, colwidth: colwidth.some(Boolean) ? colwidth : null });
	});
	return tr;
}

/** Table and column of the column-resize handle under the mouse, if any. */
function resizeTarget(state: EditorState) {
	const handle = columnResizingPluginKey.getState(state)?.activeHandle ?? -1;
	if (handle < 0)
		return null;
	const $cell = state.doc.resolve(handle);
	const table = $cell.node(-1);
	const start = $cell.start(-1);
	const col = TableMap.get(table).colCount($cell.pos - start) + ($cell.nodeAfter?.attrs.colspan ?? 1) - 1;
	return { table, tablePos: start - 1, col };
}

/**
 * Keeps column resizing within the page. prosemirror-tables drags from the saved
 * colwidths, which PageTableView may display scaled down: the displayed widths are
 * written back when a drag starts, and the dragged column is clamped on release.
 */
function pageColumnResizing(cellMinWidth: number) {
	return new Plugin({
		props: {
			handleDOMEvents: {
				mousedown: (view) => {
					const target = view.editable && !columnResizingPluginKey.getState(view.state)?.dragging && resizeTarget(view.state);
					if (!target)
						return false;
					const widths = savedColumnWidths(target.table);
					const fitted = fitColumnWidths(widths, columnMinWidth(cellMinWidth, widths.length));
					const tr = setColumnWidths(view.state.tr, target.table, target.tablePos, fitted);
					if (tr.docChanged)
						view.dispatch(tr.setMeta("addToHistory", false));
					return false;
				},
			},
		},
		appendTransaction(trs, oldState, newState) {
			if (!columnResizingPluginKey.getState(oldState)?.dragging || !trs.some(tr => tr.docChanged))
				return null;
			const target = resizeTarget(newState);
			if (!target)
				return null;
			const widths = savedColumnWidths(target.table);
			const min = columnMinWidth(cellMinWidth, widths.length);
			const others = widths.reduce((a, w, i) => (i === target.col ? a : a + Math.max(w, min)), 0);
			const limit = Math.max(min, PAGE_CONTENT_WIDTH_PX - others);
			if (widths[target.col] <= limit)
				return null;
			widths[target.col] = limit;
			return setColumnWidths(newState.tr, target.table, target.tablePos, widths);
		},
	});
}

/**
 * Table node view that (a) never lets the rendered table exceed the page
 * content width (saved colwidths are scaled down proportionally at render
 * time, the document is not modified) and (b) reflects the optional
 * `borderless` attribute as `data-borderless` on the <table>.
 */
export class PageTableView extends TableView {
	constructor(node: PMNode, cellMinWidth: number, view?: EditorView, HTMLAttributes?: Record<string, any>) {
		super(node, cellMinWidth, view, HTMLAttributes);
		this.applyPageConstraints();
	}

	update(node: PMNode) {
		if (!super.update(node))
			return false;
		this.applyPageConstraints();
		return true;
	}

	private applyPageConstraints() {
		const table = this.table;
		table.classList.add("custom-table");
		if (this.node.attrs.borderless)
			table.setAttribute("data-borderless", "true");
		else
			table.removeAttribute("data-borderless");

		const cols = Array.from(this.colgroup.children) as HTMLElement[];
		const max = PAGE_CONTENT_WIDTH_PX;
		// With many columns the configured minimum would push the table past the
		// page; shrink the minimum so all columns fit the content width.
		const min = columnMinWidth(this.cellMinWidth, cols.length);
		// Saved widths come from the node: updateColumns never clears a stale
		// `width` when a column becomes flexible (column deleted, view reused).
		const widths = savedColumnWidths(this.node);
		cols.forEach((col, i) => {
			if (widths[i])
				return;
			col.style.width = "";
			col.style.minWidth = `${min}px`;
		});
		const fitted = fitColumnWidths(widths, min);
		cols.forEach((col, i) => {
			if (fitted[i])
				col.style.width = `${fitted[i]}px`;
		});
		// updateColumns sets either a px width (all columns fixed) or a min-width.
		const total = `${Math.min(fitted.reduce((a, w) => a + (w || min), 0), max)}px`;
		if (table.style.minWidth)
			table.style.minWidth = total;
		else
			table.style.width = total;
	}
}

/** Table with an optional, backward compatible `borderless` attribute. */
export const PageTable = Table.extend({
	addAttributes() {
		return {
			...this.parent?.(),
			borderless: {
				default: false,
				parseHTML: (el: HTMLElement) => el.getAttribute("data-borderless") === "true" || el.classList.contains("borderless"),
				renderHTML: (attrs: Record<string, any>) => (attrs.borderless ? { "data-borderless": "true" } : {}),
			},
		};
	},
	addProseMirrorPlugins() {
		// Before columnResizing so the widths are fitted before it reads them on mousedown.
		return [pageColumnResizing(this.options.cellMinWidth), ...(this.parent?.() ?? [])];
	},
});

export function getEditorExtensions() {
	return [
		StarterKit,
		Underline,
		Strike,
		TextStyle,
		FontFamily,
		Color,
		FontSize,
		Direction,
		VariableNode,
		NodeStyle,
		BlockLineHeight,
		// Keeps the selection visible while a toolbar dropdown has the focus
		Selection.configure({ className: "kept-selection" }),
		Highlight.configure({ multicolor: true }),
		TextAlign.configure({ types: ["heading", "paragraph"], defaultAlignment: "right" }),
		PageTable.configure({
			resizable: true,
			cellMinWidth: TABLE_CELL_MIN_WIDTH_PX,
			View: PageTableView,
			HTMLAttributes: { class: "custom-table" },
		}),
		TableRow,
		TableHeader,
		TableCell,
	];
}
