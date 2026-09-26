import { CheckCircleFilled, ExclamationCircleFilled } from "@ant-design/icons";
import { Button, Card, message, Spin, theme } from "antd";
import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useRef, useState } from "react";
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
	const [currentTemplateId, setCurrentTemplateId] = useState<number | null>(templateId || null);

	const [isDirty, setIsDirty] = useState(false);
	const [showExitConfirm, setShowExitConfirm] = useState(false);
	const [showSavedToast, setShowSavedToast] = useState(false);
	const savedToastTimerRef = useRef<NodeJS.Timeout | null>(null);
	const isReadyRef = useRef(false);
	const initialHeaderRef = useRef<string | null>(null);

	const editor = useTemplateEditor({ initialContent: editorContent });
	const { customFonts, headerData, fetchFonts } = useTemplateStore();

	const { data: servicesData } = useServicesListQuery();

	const handleExportWord = () => {
		if (!editor)
			return;
		exportEditorToWord(editor.getHTML(), methods.getValues("name") || "قالب-قرارداد");
	};

	useEffect(() => {
		if (!templateId) {
			const t = setTimeout(() => {
				isReadyRef.current = true;
				initialHeaderRef.current = JSON.stringify(headerData);
			}, 400);
			return () => clearTimeout(t);
		}
		else if (isInitialDataLoaded) {
			const t = setTimeout(() => {
				isReadyRef.current = true;
				initialHeaderRef.current = JSON.stringify(headerData);
			}, 400);
			return () => clearTimeout(t);
		}
	}, [templateId, isInitialDataLoaded]);

	useEffect(() => {
		if (!editor)
			return;
		const onUpdate = () => {
			if (isReadyRef.current) {
				setIsDirty(true);
			}
		};
		editor.on("update", onUpdate);
		return () => {
			editor.off("update", onUpdate);
		};
	}, [editor]);

	useEffect(() => {
		const subscription = methods.watch(() => {
			if (isReadyRef.current) {
				setIsDirty(true);
			}
		});
		return () => subscription.unsubscribe();
	}, [methods]);

	useEffect(() => {
		if (isReadyRef.current && initialHeaderRef.current !== null) {
			if (JSON.stringify(headerData) !== initialHeaderRef.current) {
				setIsDirty(true);
			}
		}
	}, [headerData]);

	useEffect(() => {
		const handleBeforeUnload = (e: BeforeUnloadEvent) => {
			if (isDirty) {
				e.preventDefault();
				e.returnValue = "";
				return "";
			}
		};
		window.addEventListener("beforeunload", handleBeforeUnload);
		return () => {
			window.removeEventListener("beforeunload", handleBeforeUnload);
		};
	}, [isDirty]);

	useEffect(() => {
		return () => {
			if (savedToastTimerRef.current) {
				clearTimeout(savedToastTimerRef.current);
			}
		};
	}, []);

	const saveTemplateRef = useRef<(closeAfterSave?: boolean) => void>(() => { });

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// میانبر Ctrl + S یا Cmd + S برای کیبوردهای فارسی و انگلیسی
			if ((e.ctrlKey || e.metaKey) && (e.code === "KeyS" || e.key === "s" || e.key === "S" || e.key === "س")) {
				e.preventDefault();
				e.stopPropagation();
				if (!isSaving) {
					saveTemplateRef.current(false);
				}
				return;
			}

			if (isPreviewOpen)
				return;
			if (e.key === "Escape") {
				if (showExitConfirm) {
					setShowExitConfirm(false);
				}
				else if (isDirty) {
					setShowExitConfirm(true);
				}
				else {
					onClose();
				}
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isDirty, showExitConfirm, isPreviewOpen, isSaving, onClose]);

	const handleRequestClose = () => {
		if (isDirty) {
			setShowExitConfirm(true);
		}
		else {
			onClose();
		}
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

	const handleSaveTemplate = (closeAfterSave = true) => methods.handleSubmit(async (formValues) => {
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

			const targetId = currentTemplateId || templateId;
			if (targetId) {
				await TemplateCreateApi.updateTemplate(targetId, payload);
			}
			else {
				const res = await TemplateCreateApi.createTemplate(payload) as any;
				const createdId = res?.id || res?.data?.id;
				if (createdId) {
					setCurrentTemplateId(createdId);
				}
			}

			if (savedToastTimerRef.current) {
				clearTimeout(savedToastTimerRef.current);
			}
			setShowSavedToast(true);
			savedToastTimerRef.current = setTimeout(() => {
				setShowSavedToast(false);
			}, 2400);

			setIsDirty(false);
			setShowExitConfirm(false);

			if (onSuccess)
				onSuccess();

			if (closeAfterSave) {
				setTimeout(() => onClose(), 1500);
			}
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
	})();

	saveTemplateRef.current = handleSaveTemplate;

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
                
                /* 🔴 نمایش پیام‌های نوتیفیکیشن روی مودال فول‌اسکرین */
                .ant-message {
                    z-index: 100005 !important;
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
							editor={editor}
							onClose={handleRequestClose}
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

			<AnimatePresence>
				{showExitConfirm && (
					<div className="fixed inset-0 z-[100001] flex items-center justify-center p-4">
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={{ duration: 0.2 }}
							className="absolute inset-0 bg-black/50 backdrop-blur-sm"
							onClick={() => setShowExitConfirm(false)}
						/>

						<motion.div
							initial={{ scale: 0.92, opacity: 0, y: 15 }}
							animate={{ scale: 1, opacity: 1, y: 0 }}
							exit={{ scale: 0.95, opacity: 0, y: 10 }}
							transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
							className="relative z-10 w-full max-w-md rounded-2xl p-6 shadow-2xl border"
							style={{
								backgroundColor: token.colorBgElevated,
								borderColor: token.colorBorderSecondary,
								color: token.colorText,
							}}
							dir="rtl"
						>
							<div className="flex items-start gap-4">
								<div
									className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
									style={{
										backgroundColor: token.colorWarningBg,
										border: `1px solid ${token.colorWarningBorder}`,
									}}
								>
									<ExclamationCircleFilled style={{ fontSize: 24, color: token.colorWarning }} />
								</div>

								<div className="flex-1 min-w-0">
									<h3 className="text-base font-bold m-0" style={{ color: token.colorText }}>
										تغییرات ذخیره نشده است
									</h3>
									<p className="mt-2 mb-0 text-xs leading-relaxed" style={{ color: token.colorTextSecondary }}>
										شما تغییراتی در قالب قرارداد ایجاد کرده‌اید که هنوز ذخیره نشده‌اند. آیا اطمینان دارید که می‌خواهید صفحه را ببندید؟ در صورت خروج، تغییرات اعمال‌شده ذخیره نخواهند شد.
									</p>
								</div>
							</div>

							<div className="mt-6 flex justify-end gap-3">
								<Button
									size="middle"
									onClick={() => setShowExitConfirm(false)}
									className="rounded-lg text-xs font-medium px-4"
								>
									انصراف و ادامه ویرایش
								</Button>
								<Button
									danger
									type="primary"
									size="middle"
									onClick={() => {
										setIsDirty(false);
										setShowExitConfirm(false);
										onClose();
									}}
									className="rounded-lg text-xs font-medium px-4 shadow-sm"
								>
									بستن صفحه بدون ذخیره
								</Button>
							</div>
						</motion.div>
					</div>
				)}
			</AnimatePresence>

			{/* 🔴 پیام شخصی‌سازی‌شده و شیک ذخیره در وسط صفحه و سینک با Ant Design */}
			<AnimatePresence>
				{showSavedToast && (
					<div className="fixed inset-0 pointer-events-none flex items-center justify-center z-[100005]">
						<motion.div
							initial={{ opacity: 0, scale: 0.85, y: 15 }}
							animate={{ opacity: 1, scale: 1, y: 0 }}
							exit={{ opacity: 0, scale: 0.9, y: -10 }}
							transition={{ type: "spring", stiffness: 450, damping: 28 }}
							className="flex items-center gap-4 px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-md"
							style={{
								backgroundColor: token.colorBgElevated,
								borderColor: token.colorSuccessBorder,
								boxShadow: `0 20px 45px -10px rgba(0, 0, 0, 0.25), 0 0 0 1px ${token.colorSuccessBorder}`,
							}}
							dir="rtl"
						>
							<div
								className="flex items-center justify-center w-11 h-11 rounded-full shrink-0 shadow-inner"
								style={{
									backgroundColor: token.colorSuccessBg,
									border: `1px solid ${token.colorSuccessBorder}`,
								}}
							>
								<CheckCircleFilled style={{ fontSize: 24, color: token.colorSuccess }} />
							</div>
							<div className="flex flex-col select-none">
								<span className="text-sm font-bold leading-tight" style={{ color: token.colorText }}>
									قالب با موفقیت ذخیره شد
								</span>
								<span className="text-xs mt-1 leading-normal" style={{ color: token.colorTextSecondary }}>
									تمام تغییرات با موفقیت در سیستم ثبت گردید.
								</span>
							</div>
						</motion.div>
					</div>
				)}
			</AnimatePresence>
		</FormProvider>
	);
}
