import type { ProEditorProps } from "../../../types";
import { theme } from "antd";
import EditorToolbar from "./ui/EditorToolbar";
import TemplateEditorCanvas from "./ui/TemplateEditorCanvas";
import "./core/editor-styles.css";

export default function ProEditor({ editor, onChange }: ProEditorProps) {
	const { token } = theme.useToken();

	editor?.on("update", () => {
		onChange?.(editor.getHTML());
	});

	return (
		<div
			className="flex flex-col rounded-xl border transition-colors shadow-sm w-full h-full relative"
			style={{ backgroundColor: token.colorBgLayout, borderColor: token.colorBorderSecondary }}
		>
			<div
				className="sticky top-0 z-50 rounded-t-xl border-b"
				style={{ backgroundColor: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
			>
				<EditorToolbar editor={editor} />
			</div>

			<div className="flex-1 p-2">
				<TemplateEditorCanvas editor={editor} />
			</div>
		</div>
	);
}
