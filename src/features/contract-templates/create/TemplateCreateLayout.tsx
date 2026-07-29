// src/features/contract-templates/create/TemplateCreateLayout.tsx
import type { HeaderData } from "./components/editor/ui/HeaderEditor";
import { Card, theme } from "antd"; // 🔴 اضافه شدن تم آنت‌دیزاین برای رنگ‌بندی داینامیک
import React, { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import ProEditor from "./components/editor/ProEditor";
import { useTemplateEditor } from "./components/editor/ui/TemplateEditorCanvas";
import TemplateCreateForm from "./components/TemplateCreateForm";
import TemplateCreateHeader from "./components/TemplateCreateHeader";
import TemplateCreateSidebar from "./components/TemplateCreateSidebar";

interface TemplateCreateLayoutProps {
	onClose: () => void
}

export interface TemplateFormValues {
	name: string
	service_id: number | null
	document_kind: string | null
	company_type: string | null
}

export default function TemplateCreateLayout({ onClose }: TemplateCreateLayoutProps) {
	const { token } = theme.useToken();

	const methods = useForm<TemplateFormValues>({
		defaultValues: {
			name: "",
			service_id: null,
			document_kind: null,
			company_type: null,
		},
		mode: "onChange",
	});
	const [headerData, setHeaderData] = useState<HeaderData>({});
	const [editorContent, setEditorContent] = useState("");

	const editor = useTemplateEditor({ initialContent: editorContent });

	return (
		<FormProvider {...methods}>
			<Card
				className="flex flex-col h-full w-full rounded-xl overflow-y-scroll"
				style={{ backgroundColor: token.colorBgLayout, color: token.colorText }}
			>
				<div className="flex-shrink-0">
					<TemplateCreateHeader onClose={onClose} />
				</div>

				{/* 🔴 حذف overflow-scroll و اضافه کردن overflow-hidden */}
				<div className="flex flex-col flex-1 p-4 gap-4 min-h-0">

					{/* فرم بالایی (ثابت) */}
					<div className="flex-shrink-0">
						<TemplateCreateForm />
					</div>

					{/* کانتینر ادیتور و سایدبار */}
					<div className="flex flex-1 gap-4 min-h-0 ">

						{/* 🔴 سایدبار (حالا به درستی اسکرول داخلی خواهد داشت) */}
						<div className="w-80 flex-shrink-0 h-full min-h-0 flex flex-col">
							<TemplateCreateSidebar
								editor={editor}
								headerData={headerData}
								setHeaderData={setHeaderData}
							/>
						</div>

						{/* 🔴 ادیتور */}
						<div className="flex-1 h-full min-w-0 flex flex-col relative">
							<ProEditor editor={editor} onChange={setEditorContent} />
						</div>

					</div>
				</div>
			</Card>
		</FormProvider>
	);
}
