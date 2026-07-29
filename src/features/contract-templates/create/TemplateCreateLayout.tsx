// src/features/contract-templates/create/TemplateCreateLayout.tsx
import type { HeaderData } from "./components/editor/ui/HeaderEditor";
import { Card, theme } from "antd";
import React, { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import ProEditor from "./components/editor/ProEditor";
import { useTemplateEditor } from "./components/editor/ui/TemplateEditorCanvas";
import TemplateCreateForm from "./components/TemplateCreateForm";
import TemplateCreateHeader from "./components/TemplateCreateHeader";
import TemplateCreateSidebar from "./components/TemplateCreateSidebar";
import TemplatePrintPreviewModal from "./components/TemplatePrintPreviewModal";

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
	const [isPreviewOpen, setIsPreviewOpen] = useState(false);
	const editor = useTemplateEditor({ initialContent: editorContent });

	return (
		<FormProvider {...methods}>
			{/* 🔴 اضافه شدن تگ style برای کاستوم کردن اسکرول‌بار مودال */}
			<style>
				{`
                .custom-modal-scroll::-webkit-scrollbar {
                    width: 6px;
                    height: 6px;
                }
                .custom-modal-scroll::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-modal-scroll::-webkit-scrollbar-thumb {
                    background-color: rgba(136, 136, 136, 0.35);
                    border-radius: 10px;
                }
                .custom-modal-scroll::-webkit-scrollbar-thumb:hover {
                    background-color: rgba(136, 136, 136, 0.55);
                }
                .custom-modal-scroll {
                    scrollbar-width: thin;
                    scrollbar-color: rgba(136, 136, 136, 0.35) transparent;
                }
            `}
			</style>
			<Card
				className="flex flex-col h-full w-full rounded-xl overflow-y-auto custom-modal-scroll"
				style={{ backgroundColor: token.colorBgLayout, color: token.colorText }}
			>
				<div className="flex-shrink-0">
					<TemplateCreateHeader onClose={onClose} onOpenPrintPreview={() => setIsPreviewOpen(true)} />
				</div>

				<div className="flex flex-col flex-1 p-4 gap-4 min-h-0">

					{/* فرم بالایی (ثابت) */}
					<div className="flex-shrink-0">
						<TemplateCreateForm />
					</div>

					{/* کانتینر ادیتور و سایدبار */}
					<div className="flex flex-1 gap-4 min-h-0 items-start">

						{/* سایدبار */}
						<div
							className="w-80 flex-shrink-0 flex flex-col sticky top-4"
							style={{ height: "calc(100vh)" }}
						>
							<TemplateCreateSidebar
								editor={editor}
								headerData={headerData}
								setHeaderData={setHeaderData}
							/>
						</div>

						{/* ادیتور */}
						<div className="flex-1 h-full min-w-0 flex flex-col relative">
							<ProEditor editor={editor} onChange={setEditorContent} />
						</div>

					</div>
				</div>
			</Card>
			<TemplatePrintPreviewModal
				isOpen={isPreviewOpen}
				onClose={() => setIsPreviewOpen(false)}
				editor={editor}
				headerData={headerData}
			/>
		</FormProvider>
	);
}
