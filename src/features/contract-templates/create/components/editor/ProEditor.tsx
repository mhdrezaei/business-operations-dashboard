import type { Editor } from "@tiptap/react";
import { theme } from "antd";
// src/features/contract-templates/create/components/editor/ProEditor.tsx
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

	// همگام‌سازی استیت در صورت تغییر متن توسط کاربر
	editor?.on("update", () => {
		onChange?.(editor.getHTML());
	});

	return (
		<div
			className="flex flex-col rounded-xl border transition-colors shadow-sm"
			style={{ backgroundColor: token.colorBgLayout, borderColor: token.colorBorderSecondary }}
		>
			<div className="sticky top-0 z-10 rounded-t-xl bg-white">
				<EditorToolbar editor={editor} />
			</div>

			<div className="flex-1 p-6">
				<TemplateEditorCanvas editor={editor} />
				{/* <EditorContent editor={editor} className="prose-editor-canvas shadow-md" /> */}
			</div>
		</div>
	);
}
