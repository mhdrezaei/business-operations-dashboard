// src/features/contract-templates/create/TemplateCreateLayout.tsx
import { Card, theme } from "antd";
import React, { useEffect, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useTemplateStore } from "../store/useTemplateStore";
import ProEditor from "./components/editor/ProEditor";
import { useTemplateEditor } from "./components/editor/ui/TemplateEditorCanvas";
import TemplateCreateHeader from "./components/header/TemplateCreateHeader";
import { exportEditorToWord } from "./components/header/word-exporter";
import TemplateCreateSidebar from "./components/sidebar/TemplateCreateSidebar";
import TemplateCreateForm from "./components/TemplateCreateForm";
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

	const [editorContent, setEditorContent] = useState("");
	const [isPreviewOpen, setIsPreviewOpen] = useState(false);

	const editor = useTemplateEditor({ initialContent: editorContent });

	// 🔴 خواندن فونت‌ها و تابع دریافت آن‌ها از استور (دیگر نیازی به useState لوکال نیست)
	const { customFonts, fetchFonts } = useTemplateStore();

	const handleExportWord = () => {
		if (!editor)
			return;

		// گرفتن HTML فعلی داخل ادیتور
		const currentHtml = editor.getHTML();

		// دریافت نام تمپلیت از فرم (اگر اسمی نداشت یک اسم پیش‌فرض می‌گذارد)
		const templateName = methods.getValues("name") || "قالب-قرارداد";

		// صدا زدن سرویس دانلود
		exportEditorToWord(currentHtml, templateName);
	};

	// 🔴 دریافت فونت‌ها در هنگام لود شدن کامپوننت
	useEffect(() => {
		fetchFonts();
	}, [fetchFonts]);

	return (
		<FormProvider {...methods}>
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
                
                ${customFonts.map(f => `
                    @font-face {
                        font-family: '${f.family}';
                        src: url('${f.file_url}') format('${f.format || "truetype"}');
                        font-weight: normal;
                        font-style: normal;
                    }
                `).join("\n")}
            `}
			</style>
			<Card
				className="flex flex-col h-full w-full rounded-xl overflow-y-auto custom-modal-scroll"
				style={{ backgroundColor: token.colorBgLayout, color: token.colorText }}
			>
				<div className="flex-shrink-0">
					<TemplateCreateHeader onClose={onClose} onOpenPrintPreview={() => setIsPreviewOpen(true)} onExportWord={handleExportWord} />
				</div>

				<div className="flex flex-col flex-1 p-4 gap-4 min-h-0">
					<div className="flex-shrink-0">
						<TemplateCreateForm />
					</div>

					<div className="flex flex-1 gap-4 min-h-0 items-start">
						<div
							className="w-80 flex-shrink-0 flex flex-col sticky top-4"
							style={{ height: "calc(100vh)" }}
						>
							{/* 🔴 ارور برطرف شد: چون سایدبار به استور متصل است، فقط ادیتور را به آن پاس می‌دهیم */}
							<TemplateCreateSidebar editor={editor} />
						</div>

						<div className="flex-1 h-full min-w-0 flex flex-col relative">
							{/* 🔴 نیازی به پاس دادن customFonts به ProEditor نیست، تولبار از استور می‌خواند */}
							<ProEditor editor={editor} onChange={setEditorContent} />
						</div>
					</div>
				</div>
			</Card>

			{/* 🔴 نیازی به پاس دادن headerData و customFonts به مودال نیست، مودال از استور می‌خواند */}
			<TemplatePrintPreviewModal
				isOpen={isPreviewOpen}
				onClose={() => setIsPreviewOpen(false)}
				editor={editor}
			/>
		</FormProvider>
	);
}
