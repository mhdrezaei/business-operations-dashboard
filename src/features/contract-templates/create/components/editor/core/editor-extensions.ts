import { Extension } from "@tiptap/core";
import Color from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import Highlight from "@tiptap/extension-highlight";
import Strike from "@tiptap/extension-strike";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
// src/features/contract-templates/create/components/editor/core/editor-extensions.ts
import StarterKit from "@tiptap/starter-kit";

// ۱. معرفی دستورات کاستوم به تایپ‌اسکریپت برای جلوگیری از خطای Property does not exist
declare module "@tiptap/core" {
	interface Commands<ReturnType> {
		fontSize: {
			setFontSize: (size: string) => ReturnType
			unsetFontSize: () => ReturnType
		}
		direction: {
			setDirection: (dir: "ltr" | "rtl") => ReturnType
		}
	}
}

// ۲. افزونه اختصاصی برای اندازه فونت (متصل به TextStyle)
export const FontSize = Extension.create({
	name: "fontSize",
	addOptions() { return { types: ["textStyle"] }; },
	addGlobalAttributes() {
		return [
			{
				types: this.options.types,
				attributes: {
					fontSize: {
						default: null,
						parseHTML: element => element.style.fontSize?.replace(/['"]+/g, ""),
						renderHTML: (attributes) => {
							if (!attributes.fontSize)
								return {};
							return { style: `font-size: ${attributes.fontSize}` };
						},
					},
				},
			},
		];
	},
	addCommands() {
		return {
			setFontSize: fontSize => ({ chain }) => chain().setMark("textStyle", { fontSize }).run(),
			unsetFontSize: () => ({ chain }) => chain().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run(),
		};
	},
});

// ۳. افزونه اختصاصی برای تغییر جهت متن (RTL / LTR)
export const Direction = Extension.create({
	name: "direction",
	addGlobalAttributes() {
		return [
			{
				types: ["paragraph", "heading"],
				attributes: {
					dir: {
						default: null,
						parseHTML: element => element.getAttribute("dir"),
						renderHTML: attributes => (attributes.dir ? { dir: attributes.dir } : {}),
					},
				},
			},
		];
	},
	addCommands() {
		return {
			setDirection: dir => ({ commands }) =>
				["paragraph", "heading"]
					.map(type => commands.updateAttributes(type, { dir }))
					.some(Boolean),
		};
	},
});

// ۴. تجمیع و خروجی تمام افزونه‌ها
export function getEditorExtensions() {
	return [
		StarterKit,
		Underline,
		Strike,
		Subscript,
		Superscript,
		TextStyle, // حیاتی برای رنگ، فونت و سایز
		FontFamily,
		Color,
		FontSize,
		Direction,
		Highlight.configure({ multicolor: true }),
		TextAlign.configure({
			types: ["heading", "paragraph"],
			defaultAlignment: "right",
		}),
		Table.configure({
			resizable: true,
			HTMLAttributes: { class: "custom-table" },
		}),
		TableRow,
		TableHeader,
		TableCell,
	];
}
