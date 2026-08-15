// src/features/contract-templates/create/components/editor/core/editor-extensions.ts
import { Extension, mergeAttributes, Node } from "@tiptap/core";
import Color from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import Highlight from "@tiptap/extension-highlight";
import Strike from "@tiptap/extension-strike";
import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { ReactNodeViewRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import VariableChip from "../ui/VariableChip";

declare module "@tiptap/core" {
	interface Commands<ReturnType> {
		fontSize: { setFontSize: (size: string) => ReturnType, unsetFontSize: () => ReturnType }
		direction: { setDirection: (dir: "ltr" | "rtl") => ReturnType }
		templateVariable: { insertTemplateVariable: (key: string) => ReturnType }
	}
}

export const VariableNode = Node.create({
	name: "templateVariable",
	group: "inline",
	inline: true,
	atom: true,
	addAttributes() {
		return {
			key: { default: "", parseHTML: el => el.getAttribute("data-variable") || "", renderHTML: attrs => ({ "data-variable": attrs.key }) },
		};
	},
	parseHTML() { return [{ tag: "span[data-variable]" }]; },
	renderHTML({ HTMLAttributes }) { return ["span", mergeAttributes(HTMLAttributes, { class: "tpl-variable" })]; },
	addNodeView() { return ReactNodeViewRenderer(VariableChip); },
	addCommands() {
		return { insertTemplateVariable: key => ({ commands }) => commands.insertContent({ type: this.name, attrs: { key } }) };
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
		Highlight.configure({ multicolor: true }),
		TextAlign.configure({ types: ["heading", "paragraph"], defaultAlignment: "right" }),
		Table.configure({ resizable: true, HTMLAttributes: { class: "custom-table" } }),
		TableRow,
		TableHeader,
		TableCell,
	];
}
