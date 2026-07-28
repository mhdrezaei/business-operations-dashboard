import { EditorContent, useEditor } from "@tiptap/react";
import { theme } from "antd";
// src/features/contract-templates/create/components/editor/ProEditor.tsx
import React, { useEffect, useRef } from "react";
import { getEditorExtensions } from "./core/editor-extensions";
import EditorToolbar from "./ui/EditorToolbar";
import "./core/editor-styles.css";

interface ProEditorProps {
	value?: string
	onChange?: (content: string) => void
	placeholder?: string
}

export default function ProEditor({ value = "", onChange }: ProEditorProps) {
	const { token } = theme.useToken();
	// این متغیر کنترل می‌کند که آیا تغییر متن توسط خود کاربر انجام شده یا از سرور آمده است
	const isInternalUpdate = useRef(false);

	const editor = useEditor({
		extensions: getEditorExtensions(),
		content: value,
		onUpdate: ({ editor }) => {
			isInternalUpdate.current = true;
			onChange?.(editor.getHTML());
		},
	});

	// همگام‌سازی امن: فقط زمانی محتوا را ست می‌کنیم که تغییر از بیرون باشد (نه تایپ خود کاربر)
	useEffect(() => {
		if (editor && value !== undefined) {
			if (!isInternalUpdate.current && value !== editor.getHTML()) {
				editor.commands.setContent(value);
			}
			isInternalUpdate.current = false;
		}
	}, [value, editor]);

	return (
		<div
			className="flex flex-col h-full rounded-xl border overflow-hidden"
			style={{ backgroundColor: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
		>
			<EditorToolbar editor={editor} />

			<div className="flex-1 overflow-y-auto bg-slate-100 custom-scrollbar p-6">
				<EditorContent editor={editor} className="prose-editor-canvas" />
			</div>
		</div>
	);
}
