// src/features/contract-templates/create/TemplateCreateLayout.tsx
import { Card, message, Spin, theme } from "antd";
import React, { useEffect, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { TemplateCreateApi } from "../api/api";
import { useServicesListQuery } from "../queries/template-create.queries";
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
	onSuccess?: () => void
	templateId?: number | null | undefined
}

export interface TemplateFormValues {
	name: string
	service_id: string | number | null
	document_kind: string | null
	variant?: string | null
	company_type: string | null
	templateId?: number | null | undefined
}

export default function TemplateCreateLayout({ onClose, onSuccess, templateId }: TemplateCreateLayoutProps) {
	const { token } = theme.useToken();

	const methods = useForm<TemplateFormValues>({
		defaultValues: {
			name: "",
			service_id: null,
			document_kind: null,
			variant: null,
			company_type: null,
			templateId: templateId || null,
		},
		mode: "onChange",
	});

	const [editorContent, setEditorContent] = useState("");
	const [isPreviewOpen, setIsPreviewOpen] = useState(false);
	const [isSaving, setIsSaving] = useState(false);

	const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
	const [isInitialDataLoaded, setIsInitialDataLoaded] = useState(false);

	const editor = useTemplateEditor({ initialContent: editorContent });
	const { customFonts, headerData, fetchFonts } = useTemplateStore();

	const { data: servicesData } = useServicesListQuery();

	const handleExportWord = () => {
		if (!editor)
			return;
		exportEditorToWord(editor.getHTML(), methods.getValues("name") || "قالب-قرارداد");
	};

	useEffect(() => {
		const loadTemplateData = async () => {
			if (!templateId || !editor || !servicesData || isInitialDataLoaded)
				return;

			setIsLoadingTemplate(true);
			try {
				const template = await TemplateCreateApi.getTemplate(templateId);

				methods.setValue("name", template.name || "");
				methods.setValue("document_kind", template.document_kind || null);
				methods.setValue("variant", template.variant || null);
				methods.setValue("company_type", template.company_type || null);

				const payloadData = (servicesData as any)?.data ?? servicesData;
				const rawServices = Array.isArray(payloadData?.results) ? payloadData.results : [];

				const matchedService = rawServices.find(
					(s: any) => s.code === template.service || s.slug === template.service || s.key === template.service || s.id === template.service,
				);

				if (matchedService) {
					methods.setValue("service_id", matchedService.id);
				}

				if (template.content_html) {
					editor.commands.setContent(template.content_html);
					setEditorContent(template.content_html);
				}

				setIsInitialDataLoaded(true);
			}
			catch (error) {
				console.error("Error loading template details:", error);
				message.error("خطا در دریافت اطلاعات قالب.");
			}
			finally {
				setIsLoadingTemplate(false);
			}
		};

		loadTemplateData();
	}, [templateId, editor, servicesData, isInitialDataLoaded, methods]);

	const handleSaveTemplate = methods.handleSubmit(async (formValues) => {
		let hasFrontendError = false;
		methods.clearErrors();

		if (!formValues.name) {
			methods.setError("name", { type: "manual", message: "نام قالب الزامی است" });
			hasFrontendError = true;
		}
		if (!formValues.service_id) {
			methods.setError("service_id", { type: "manual", message: "انتخاب سرویس الزامی است" });
			hasFrontendError = true;
		}
		if (!formValues.document_kind) {
			methods.setError("document_kind", { type: "manual", message: "نوع سند الزامی است" });
			hasFrontendError = true;
		}

		if (hasFrontendError) {
			message.warning("لطفاً فیلدهای قرمزرنگ را تکمیل کنید.");
			return;
		}

		if (!editor) {
			message.error("ادیتور هنوز آماده نیست.");
			return;
		}

		setIsSaving(true);
		try {
			const payloadData = (servicesData as any)?.data ?? servicesData;
			const rawServices = Array.isArray(payloadData?.results) ? payloadData.results : [];
			const selectedService = rawServices.find((s: any) => s.id === formValues.service_id);

			const serviceStringValue = selectedService?.code || selectedService?.slug || selectedService?.key || formValues.service_id;

			const payload = {
				name: formValues.name,
				service: serviceStringValue,
				service_name: selectedService?.name || "سرویس",
				document_kind: formValues.document_kind,
				variant: formValues.variant || null,
				company_type: formValues.company_type || null,

				content_html: editor.getHTML(),

				header: {
					logo_asset_id: headerData?.logo_asset_id || null,
					logo_url: headerData?.logo_url || null,
					show_contract_number: headerData?.show_contract_number ?? true,
					extra_text: headerData?.extra_text || "",
				},
				font_ids: customFonts.map(font => font.id),
			};

			if (templateId) {
				await TemplateCreateApi.updateTemplate(templateId, payload);
				message.success("قالب با موفقیت ویرایش شد!");
			}
			else {
				await TemplateCreateApi.createTemplate(payload);
				message.success("قالب با موفقیت ذخیره شد!");
			}

			if (onSuccess)
				onSuccess();
			setTimeout(() => onClose(), 1500);
		}
		catch (error: any) {
			const serverErrors = error?.response?.data || error?.data || error?.json;
			if (serverErrors && typeof serverErrors === "object") {
				Object.keys(serverErrors).forEach((key) => {
					const msg = Array.isArray(serverErrors[key]) ? serverErrors[key][0] : serverErrors[key];
					methods.setError(key as any, { type: "server", message: msg });
				});
				message.error("برخی اطلاعات نامعتبر است، لطفاً ارورهای قرمز رنگ را چک کنید.");
			}
			else {
				message.error("خطا در ارتباط با سرور!");
			}
		}
		finally {
			setIsSaving(false);
		}
	});

	useEffect(() => {
		fetchFonts();
	}, [fetchFonts]);

	return (
		<FormProvider {...methods}>
			<style>
				{`
                .custom-modal-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-modal-scroll::-webkit-scrollbar-track { background: transparent; }
                .custom-modal-scroll::-webkit-scrollbar-thumb { background-color: rgba(136, 136, 136, 0.35); border-radius: 10px; }
                .custom-modal-scroll::-webkit-scrollbar-thumb:hover { background-color: rgba(136, 136, 136, 0.55); }
                .custom-modal-scroll { scrollbar-width: thin; scrollbar-color: rgba(136, 136, 136, 0.35) transparent; }
                
                /* 🔴 فیکس قطعی برای مشکل Spin و برگشتن اسکرول */
                .template-spin-wrapper {
                    height: 100vh;
                    width: 100%;
                }
                .template-spin-wrapper .ant-spin-container {
                    height: 100%;
                    display: flex;
                    flex-direction: column;
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

			{/* 🔴 استفاده از کلاس کاستوم برای اسپینر */}
			<Spin
				spinning={isLoadingTemplate}
				tip="در حال دریافت اطلاعات قالب..."
				size="large"
				wrapperClassName="template-spin-wrapper"
			>
				<Card
					className="flex flex-col h-full w-full rounded-xl overflow-y-auto custom-modal-scroll"
					style={{
						backgroundColor: token.colorBgLayout,
						color: token.colorText,
						height: "100%",
						border: "none",
					}}
				>
					<div className="flex-shrink-0">
						<TemplateCreateHeader
							onClose={onClose}
							onOpenPrintPreview={() => setIsPreviewOpen(true)}
							onExportWord={handleExportWord}
							onSaveTemplate={handleSaveTemplate}
							isSaving={isSaving}
						/>
					</div>

					<div className="flex flex-col flex-1 p-4 gap-4 min-h-0">
						<div className="flex-shrink-0">
							<TemplateCreateForm />
						</div>

						<div className="flex flex-1 gap-4 min-h-0 items-start">
							<div
								className="w-80 flex-shrink-0 flex flex-col sticky top-4"
								style={{ height: "calc(100vh - 150px)" }}
							>
								<TemplateCreateSidebar editor={editor} />
							</div>

							<div className="flex-1 h-full min-w-0 flex flex-col relative">
								<ProEditor editor={editor} onChange={setEditorContent} />
							</div>
						</div>
					</div>
				</Card>
			</Spin>

			<TemplatePrintPreviewModal
				isOpen={isPreviewOpen}
				onClose={() => setIsPreviewOpen(false)}
				editor={editor}
			/>
		</FormProvider>
	);
}
