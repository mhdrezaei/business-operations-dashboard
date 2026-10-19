// src/features/contract-templates/create/components/header/TemplateCreateHeader.tsx
import type { Editor } from "@tiptap/react";
import type { TemplateCreateHeaderProps } from "../../../types";
import { ArrowRightOutlined, FileWordOutlined, PrinterOutlined, SaveOutlined, UploadOutlined } from "@ant-design/icons";
import { Button, Checkbox, message, Modal, Popconfirm, Progress, Select, theme, Typography } from "antd";
import React, { useMemo, useRef, useState } from "react";
import { TemplateCreateApi } from "../../../api/api";
import { useTemplateStore } from "../../../store/useTemplateStore";
import { isUploadedFont } from "../editor/core/font-faces";
import { customToast } from "../editor/ui/CustomToast";
import { importWordToEditor } from "../sidebar/word-importer";

const { Title, Text } = Typography;

interface ExtendedHeaderProps extends TemplateCreateHeaderProps {
	editor: Editor | null
	onExportWord?: () => void
	onSaveTemplate?: () => void
	isSaving?: boolean
}

export default function TemplateCreateHeader({
	editor,
	onClose,
	onOpenPrintPreview,
	onExportWord,
	onSaveTemplate,
	isSaving,
}: ExtendedHeaderProps) {
	const { token } = theme.useToken();

	const wordInputRef = useRef<HTMLInputElement>(null);
	const missingFontInputRef = useRef<HTMLInputElement>(null);
	const [isImportingWord, setIsImportingWord] = useState(false);

	const missingFontsResolveRef = useRef<((mapping?: Record<string, string>) => void) | null>(null);
	const [missingFontState, setMissingFontState] = useState<{
		visible: boolean
		queue: string[]
		currentIndex: number
		isUploading: boolean
		progress: number
		mapping: Record<string, string>
		showMappingUi: boolean
		selectedMappingFont?: string
		applyMappingToRemaining: boolean
	} | null>(null);

	const { customFonts, fetchFonts } = useTemplateStore();

	const fontFamilyOptions = useMemo(() => [
		{ value: "Vazirmatn", label: <span style={{ fontFamily: "Vazirmatn" }}>وزیرمتن (پیش‌فرض)</span> },
		{ value: "Tahoma", label: <span style={{ fontFamily: "Tahoma" }}>تاهوما</span> },
		{ value: "B Nazanin", label: <span style={{ fontFamily: "B Nazanin" }}>بی نازنین</span> },
		...(customFonts || []).map((font) => {
			const familyName = font.family || font.name;
			return {
				value: familyName,
				label: <span style={{ fontFamily: familyName }}>{font.name}</span>,
			};
		}),
	], [customFonts]);

	const finishMissingFonts = (mapping: Record<string, string>) => {
		if (missingFontsResolveRef.current) {
			missingFontsResolveRef.current(mapping);
			missingFontsResolveRef.current = null;
		}
		setMissingFontState(null);
	};

	const advanceMissingFont = (newMapping?: Record<string, string>) => {
		if (!missingFontState)
			return;
		const currentMapping = newMapping || missingFontState.mapping;
		if (missingFontState.currentIndex + 1 < missingFontState.queue.length) {
			setMissingFontState(prev => prev ? { ...prev, currentIndex: prev.currentIndex + 1, isUploading: false, progress: 0, mapping: currentMapping, showMappingUi: false, selectedMappingFont: undefined, applyMappingToRemaining: false } : null);
		}
		else {
			finishMissingFonts(currentMapping);
		}
	};

	const handleConfirmMapping = () => {
		const selectedFont = missingFontState?.selectedMappingFont;
		if (!missingFontState || !selectedFont)
			return;
		const { queue, currentIndex, mapping, applyMappingToRemaining } = missingFontState;
		// Earlier fonts keep the decision already made for them (upload / ignore / own mapping).
		const targetFonts = applyMappingToRemaining ? queue.slice(currentIndex) : [queue[currentIndex]];
		const newMapping = { ...mapping, ...Object.fromEntries(targetFonts.map(font => [font, selectedFont])) };
		if (applyMappingToRemaining)
			finishMissingFonts(newMapping);
		else
			advanceMissingFont(newMapping);
	};

	const remainingMissingFontsCount = missingFontState ? missingFontState.queue.length - missingFontState.currentIndex : 0;

	const handleCancelMissingFont = () => {
		advanceMissingFont();
	};

	const handleMissingFontUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (event.target)
			event.target.value = "";
		if (!file || !missingFontState)
			return;

		const currentFont = missingFontState.queue[missingFontState.currentIndex];

		const normalizedFileName = file.name.replace(/\.[^/.]+$/, "").replace(/\s+/g, "").toLowerCase();
		const normalizedFontName = currentFont.replace(/\s+/g, "").toLowerCase();

		if (!normalizedFileName.includes(normalizedFontName)) {
			// eslint-disable-next-line no-alert
			const confirmed = window.confirm(`نام فایل انتخابی (${file.name}) با فونت درخواستی (${currentFont}) مغایرت دارد. آیا مطمئن هستید که می‌خواهید ادامه دهید؟`);
			if (!confirmed)
				return;
		}

		setMissingFontState(prev => prev ? { ...prev, isUploading: true, progress: 0 } : null);

		let progressInterval: any;
		try {
			setMissingFontState(prev => prev ? { ...prev, isUploading: true, progress: 0 } : null);
			progressInterval = setInterval(() => {
				setMissingFontState((prev) => {
					if (!prev)
						return null;
					const next = prev.progress + (90 - prev.progress) * 0.1;
					return { ...prev, progress: Math.min(90, Math.floor(next)) };
				});
			}, 200);

			await TemplateCreateApi.uploadFont(currentFont, file);
			clearInterval(progressInterval);

			setMissingFontState(prev => prev ? { ...prev, progress: 100 } : null);
			await new Promise(res => setTimeout(res, 300));

			customToast.success("فونت با موفقیت آپلود شد.");
			await fetchFonts();

			advanceMissingFont();
		}
		catch (error: any) {
			if (typeof progressInterval !== "undefined")
				clearInterval(progressInterval);
			customToast.error(error?.message || "خطا در آپلود فونت");
			setMissingFontState(prev => prev ? { ...prev, isUploading: false, progress: 0 } : null);
		}
	};

	const handleWordImportClick = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (event.target)
			event.target.value = "";
		if (!file || !editor)
			return;

		if (!file.name.toLowerCase().endsWith(".docx")) {
			customToast.error("فقط فایل‌های .docx پشتیبانی می‌شوند.");
			return;
		}

		setIsImportingWord(true);
		try {
			await importWordToEditor(file, editor, () => {}, async (fontNames: string[]) => {
				const missing = fontNames.filter(fontName => !isUploadedFont(customFonts, fontName));

				if (missing.length === 0)
					return Promise.resolve();

				customToast.destroy("import-word");

				return new Promise<Record<string, string> | void>((resolve) => {
					missingFontsResolveRef.current = resolve;
					setMissingFontState({
						visible: true,
						queue: missing,
						currentIndex: 0,
						isUploading: false,
						progress: 0,
						mapping: {},
						showMappingUi: false,
						applyMappingToRemaining: false,
					});
				});
			});
			customToast.success("فایل با موفقیت ایمپورت شد.");
		}
		catch (error: any) {
			console.error("[Sidebar] Error caught in handleWordImportClick:", error);
			if (error?.message === "EMPTY_FILE") {
				customToast.warning("فایل ورد فاقد محتوای متنی است.");
			}
			else {
				customToast.error("خطا در پردازش فایل ورد.");
			}
		}
		finally {
			customToast.destroy("import-word");
			setIsImportingWord(false);
		}
	};

	return (
		<div
			className="flex justify-between items-center p-6 pb-4 border-b"
			style={{ borderColor: token.colorBorderSecondary }}
		>
			<div>
				<Title level={4} style={{ margin: 0 }}>قالب جدید قرارداد</Title>
				<Text type="secondary" className="text-sm mt-1 mb-0 block">
					تمپلیت را مثل Word ویرایش کنید؛ جاهای خالی را با متغیرها پر کنید.
				</Text>
			</div>

			<div className="flex items-center gap-3">
				<Button type="default" icon={<ArrowRightOutlined />} onClick={onClose}>
					بازگشت به لیست
				</Button>

				{/* 🔴 Import Word Button */}
				<Button type="primary" ghost icon={<FileWordOutlined />} loading={isImportingWord} onClick={() => wordInputRef.current?.click()}>
					ایمپورت از (docx.) Word
				</Button>
				<input ref={wordInputRef} type="file" accept=".docx" className="hidden" onChange={handleWordImportClick} />

				<Popconfirm
					title={(
						<div className="flex flex-col gap-2 mt-1">
							<span className="font-bold text-sm">ذخیره به عنوان فایل Word</span>
							<span className="max-w-xs text-xs leading-relaxed" style={{ color: token.colorTextSecondary }}>
								این عملیات به معنی ذخیره در دیتابیس و استفاده در فرم‌های قرارداد نیست؛
								<br />
								<strong style={{ color: token.colorWarning }}>صرفاً برای ذخیره تمپلیت روی سیستم شماست.</strong>
								<br />
								آیا ادامه می‌دهید؟
							</span>
						</div>
					)}
					onConfirm={() => {
						if (onExportWord)
							onExportWord();
						else message.error("خطا: تابع دانلود به هدر متصل نشده است!");
					}}
					okText="بله، دانلود کن"
					cancelText="انصراف"
					placement="bottom"
					icon={<FileWordOutlined style={{ color: token.colorPrimary }} />}
					zIndex={100000}
					getPopupContainer={triggerNode => triggerNode.parentNode as HTMLElement}
				>
					<Button type="default" icon={<FileWordOutlined />}>
						خروجی (docx.)
					</Button>
				</Popconfirm>

				<Button type="default" icon={<PrinterOutlined />} onClick={onOpenPrintPreview}>
					پیش‌ نمایش چاپ
				</Button>

				{/* 🔴 اتصال تابع ذخیره و حالت لودینگ به دکمه اصلی */}
				<Button
					type="primary"
					icon={<SaveOutlined />}
					loading={isSaving}
					onClick={() => {
						if (onSaveTemplate) {
							onSaveTemplate();
						}
						else {
							message.error("تابع ذخیره به هدر متصل نیست!");
						}
					}}
				>
					ذخیره قالب
				</Button>
			</div>

			{/* Missing Font Modal */}
			<Modal
				forceRender={true}
				zIndex={99999}
				open={missingFontState?.visible}
				closable={!missingFontState?.isUploading}
				maskClosable={!missingFontState?.isUploading}
				onCancel={handleCancelMissingFont}
				footer={null}
				width={480}
				centered
			>
				{missingFontState?.isUploading
					? (
						<div className="py-8 flex flex-col items-center justify-center">
							<div className="mb-6 animate-bounce text-4xl" style={{ color: token.colorPrimary }}>🚀</div>
							<Text className="mb-6 text-lg font-medium">در حال آپلود و پردازش فونت...</Text>
							<Progress
								percent={missingFontState.progress}
								status="active"
								strokeColor={{ "0%": token.colorPrimary, "100%": token.colorSuccess }}
								strokeWidth={12}
								className="px-6"
							/>
							<Text className="mt-4 text-xs text-gray-500">لطفا شکیبا باشید</Text>
						</div>
					)
					: missingFontState
						? (
							<div className="flex flex-col items-center text-center pt-6 pb-2">
								<div
									className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-4 shadow-sm"
									style={{ backgroundColor: `${token.colorWarning}1A`, color: token.colorWarning, border: `1px solid ${token.colorWarning}33` }}
								>
									⚠️
								</div>
								<h3 className="text-xl font-bold mb-3">
									فونت اختصاصی یافت نشد! (
									{missingFontState.currentIndex + 1}
									{" "}
									از
									{" "}
									{missingFontState.queue.length}
									)
								</h3>
								<p className="mb-6 leading-relaxed px-4 opacity-90 text-sm">
									فونت
									<span
										className="px-2 py-1 rounded-md mx-2 font-mono font-bold"
										style={{ backgroundColor: token.colorBgLayout, border: `1px solid ${token.colorBorder}` }}
									>
										{missingFontState.queue[missingFontState.currentIndex]}
									</span>
									در این فایل ورد استفاده شده اما در پنل نصب نیست.
									<br />
									برای حفظ یکپارچگی ظاهری، پیشنهاد می‌کنیم آن را آپلود کنید و یا از فونت‌های موجود جایگزین کنید.
								</p>

								{missingFontState.showMappingUi
									? (
										<div className="flex flex-col w-full px-6 mb-2">
											<Text className="mb-2 text-right">جایگزینی با فونت موجود:</Text>
											<div className="flex gap-2">
												<Select
													className="flex-1 text-right"
													placeholder="انتخاب فونت..."
													options={fontFamilyOptions}
													value={missingFontState.selectedMappingFont}
													onChange={val => setMissingFontState(prev => prev ? { ...prev, selectedMappingFont: val } : null)}
												/>
												<Button
													type="primary"
													disabled={!missingFontState.selectedMappingFont}
													onClick={handleConfirmMapping}
												>
													تایید و جایگزینی
												</Button>
											</div>
											{remainingMissingFontsCount > 1 && (
												<Checkbox
													className="mt-3 text-right"
													checked={missingFontState.applyMappingToRemaining}
													onChange={e => setMissingFontState(prev => prev ? { ...prev, applyMappingToRemaining: e.target.checked } : null)}
												>
													{`اعمال همین فونت برای همه‌ی ${remainingMissingFontsCount} فونتِ یافت‌نشده‌ی باقی‌مانده`}
												</Checkbox>
											)}
											<Button type="link" className="mt-2 self-end" onClick={() => setMissingFontState(prev => prev ? { ...prev, showMappingUi: false } : null)}>
												انصراف
											</Button>
										</div>
									)
									: (
										<div className="flex w-full gap-2 px-2 mt-2">
											<Button
												className="flex-1 h-11 border-gray-400"
												onClick={handleCancelMissingFont}
											>
												نادیده گرفتن
											</Button>
											<Button
												className="flex-1 h-11"
												onClick={() => setMissingFontState(prev => prev ? { ...prev, showMappingUi: true } : null)}
											>
												جایگزینی با موجود
											</Button>
											<Button
												type="primary"
												className="flex-1 h-11 shadow-md"
												icon={<UploadOutlined />}
												onClick={() => missingFontInputRef.current?.click()}
											>
												آپلود فونت
											</Button>
										</div>
									)}
							</div>
						)
						: null}
			</Modal>
			<input ref={missingFontInputRef} type="file" accept=".ttf,.woff,.woff2,.otf" className="hidden" onChange={handleMissingFontUpload} />
		</div>
	);
}
