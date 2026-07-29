import type { Editor } from "@tiptap/react";
import { theme } from "antd";
import React from "react";
import EditorToolbar from "./ui/EditorToolbar";
import TemplateEditorCanvas from "./ui/TemplateEditorCanvas";
import "./core/editor-styles.css";

interface ProEditorProps {
	editor: Editor | null
	onChange?: (content: string) => void
}

export default function ProEditor({ editor, onChange }: ProEditorProps) {
	const { token } = theme.useToken();

	editor?.on("update", () => {
		onChange?.(editor.getHTML());
	});

	return (
		<div
			// 🔴 تغییر: overflow-hidden و قفل ارتفاع حذف شد تا صفحه به طور طبیعی قد بکشد
			className="flex flex-col rounded-xl border transition-colors shadow-sm w-full h-full relative"
			style={{ backgroundColor: token.colorBgLayout, borderColor: token.colorBorderSecondary }}
		>
			{/* 🔴 تغییر: کلاس sticky top-0 z-50 اضافه شد تا نوار ابزار بچسبد */}
			<div
				className="sticky top-0 z-50 rounded-t-xl border-b"
				style={{ backgroundColor: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
			>
				<EditorToolbar editor={editor} />
			</div>

			{/* 🔴 تغییر: overflow-y-auto حذف شد تا اسکرول به جای ادیتور، روی کل صفحه بیفتد */}
			<div className="flex-1 p-2">
				<TemplateEditorCanvas editor={editor} />
			</div>
		</div>
	);
}
