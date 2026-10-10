import type { ProEditorProps } from "../../../types";
import { theme } from "antd";
import { useState } from "react";
import EditorToolbar from "./ui/EditorToolbar";
import TemplateEditorCanvas from "./ui/TemplateEditorCanvas";
import "./core/editor-styles.css";

export default function ProEditor({ editor, onChange }: ProEditorProps) {
	const { token } = theme.useToken();
	const [pageData, setPageData] = useState({ current: 1, total: 1 });

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
				<EditorToolbar editor={editor} pageData={pageData} />
			</div>

			<div className="flex-1 p-2 min-h-0 flex flex-col">
				<TemplateEditorCanvas
					editor={editor}
					onPageChange={(current, total) => {
						setPageData((prev) => {
							if (prev.current === current && prev.total === total)
								return prev;
							return { current, total };
						});
					}}
				/>
			</div>
		</div>
	);
}
