// src/features/contract-templates/create/components/TemplateCreateEditor.tsx
import React, { useState } from "react";
import ProEditor from "./editor/ProEditor";

export default function TemplateCreateEditor() {
	// ۱. استیت تنظیمات هدر (لوگو، متن اضافه و ...)
	// const [headerData, setHeaderData] = useState({});

	// ۲. استیت محتوای ویرایشگر (HTML خروجی قرارداد)
	const [editorContent, setEditorContent] = useState("");

	return (
		<div className="flex-1 flex flex-col gap-4 overflow-hidden h-full">
			{/* بخش تنظیمات هدر */}
			<div className="flex-shrink-0">
				{/* <HeaderEditor header={headerData} onChange={setHeaderData} /> */}
			</div>

			{/* بخش ادیتور پیشرفته Tiptap (کاملاً کپسوله و تمیز) */}
			<div className="flex-1 h-full min-h-[800px] overflow-hidden flex flex-col">
				<ProEditor
					value={editorContent}
					onChange={setEditorContent}
					// placeholder="متن قرارداد خود را اینجا بنویسید..."
				/>
			</div>
		</div>
	);
}
