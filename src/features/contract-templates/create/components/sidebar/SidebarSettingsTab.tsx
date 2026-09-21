import type { Editor } from "@tiptap/react";
import { DeleteOutlined, FileWordOutlined, UploadOutlined } from "@ant-design/icons";
import { Button, message, Modal, Progress, Select, theme, Typography } from "antd";
import React, { useMemo, useRef, useState } from "react";
import { TemplateCreateApi } from "../../../api/api";
import { useTemplateStore } from "../../../store/useTemplateStore";
import HeaderEditor from "../editor/ui/HeaderEditor";
import { importWordToEditor } from "./word-importer";

const { Text } = Typography;

export default function SidebarSettingsTab({ editor }: { editor: Editor | null }) {
	const { token } = theme.useToken();
	const fontInputRef = useRef<HTMLInputElement>(null);
	const wordInputRef = useRef<HTMLInputElement>(null);
	const missingFontInputRef = useRef<HTMLInputElement>(null);

	const [isUploadingFont, setIsUploadingFont] = useState(false);
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
	} | null>(null);

	const { customFonts, headerData, setHeaderData, fetchFonts } = useTemplateStore();

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

	const handleFontUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (event.target)
			event.target.value = "";
		if (!file)
			return;

		setIsUploadingFont(true);
		try {
			await TemplateCreateApi.uploadFont(file.name.replace(/\.[^/.]+$/, ""), file);
			message.success("فونت با موفقیت آپلود شد.");
			fetchFonts();
		}
		catch (error: any) {
			message.error(error?.message || "خطا در آپلود فونت");
		}
		finally {
			setIsUploadingFont(false);
		}
	};

	const handleDeleteFont = async (id: number) => {
		try {
			await TemplateCreateApi.deleteFont(id);
			message.success("فونت حذف شد.");
			fetchFonts();
		}
		catch (error) {
			message.error("خطا در حذف فونت");
			console.warn(error);
		}
	};

	const advanceMissingFont = (newMapping?: Record<string, string>) => {
		if (!missingFontState)
			return;
		const currentMapping = newMapping || missingFontState.mapping;
		if (missingFontState.currentIndex + 1 < missingFontState.queue.length) {
			setMissingFontState(prev => prev ? { ...prev, currentIndex: prev.currentIndex + 1, isUploading: false, progress: 0, mapping: currentMapping, showMappingUi: false, selectedMappingFont: undefined } : null);
		}
		else {
			if (missingFontsResolveRef.current) {
				missingFontsResolveRef.current(currentMapping);
				missingFontsResolveRef.current = null;
			}
			setMissingFontState(null);
		}
	};

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
			// Simulate progress concurrently up to 90%
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

			// Finish the progress
			setMissingFontState(prev => prev ? { ...prev, progress: 100 } : null);
			await new Promise(res => setTimeout(res, 300)); // slight delay to show 100%

			message.success("فونت با موفقیت آپلود شد.");
			await fetchFonts();

			advanceMissingFont();
		}
		catch (error: any) {
			if (typeof progressInterval !== "undefined")
				clearInterval(progressInterval);
			message.error(error?.message || "خطا در آپلود فونت");
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
			message.error("فقط فایل‌های .docx پشتیبانی می‌شوند.");
			return;
		}

		setIsImportingWord(true);
		try {
			await importWordToEditor(file, editor, () => {}, async (fontNames: string[]) => {
				const missing = fontNames.filter((fontName) => {
					return !customFonts?.some(f => f.name?.toLowerCase() === fontName.toLowerCase() || f.family?.toLowerCase() === fontName.toLowerCase());
				});

				if (missing.length === 0)
					return Promise.resolve();

				message.destroy("import-word");

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
					});
				});
			});
			message.success("فایل با موفقیت ایمپورت شد.");
		}
		catch (error: any) {
			console.error("[Sidebar] Error caught in handleWordImportClick:", error);
			if (error?.message === "EMPTY_FILE") {
				message.warning("فایل ورد فاقد محتوای متنی است.");
			}
			else {
				message.error("خطا در پردازش فایل ورد.");
			}
		}
		finally {
			message.destroy("import-word");
			setIsImportingWord(false);
		}
	};

	return (
		<div className="h-full flex flex-col p-4 space-y-4 overflow-y-auto custom-scrollbar">
			<HeaderEditor header={headerData} onChange={setHeaderData} />

			<div className="rounded-xl border p-4" style={{ backgroundColor: token.colorBgContainer, borderColor: token.colorBorderSecondary }}>
				<div className="flex justify-between items-center mb-4">
					<Text strong className="text-sm">
						<span className="text-lg font-serif mr-1" style={{ color: token.colorPrimary }}>T</span>
						{" "}
						فونت‌ها
					</Text>
					<Button size="small" type="dashed" icon={<UploadOutlined />} loading={isUploadingFont} onClick={() => fontInputRef.current?.click()}>
						آپلود فونت
					</Button>
					<input ref={fontInputRef} type="file" accept=".ttf,.woff,.woff2,.otf" className="hidden" onChange={handleFontUpload} />
				</div>
				<div className="flex flex-col gap-2">
					<div className="flex justify-between items-center p-2 rounded border text-xs" style={{ backgroundColor: token.colorBgElevated, borderColor: token.colorBorderSecondary, color: token.colorText }}>
						Vazirmatn (پیش‌فرض)
					</div>
					{customFonts?.map(font => (
						<div key={font.id} className="flex justify-between items-center p-2 rounded border text-xs" style={{ backgroundColor: token.colorBgElevated, borderColor: token.colorBorderSecondary, color: token.colorText }}>
							<span style={{ fontFamily: font.family }}>{font.name}</span>
							<Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => handleDeleteFont(font.id)} />
						</div>
					))}
				</div>
			</div>

			<Button type="primary" ghost block icon={<FileWordOutlined />} className="h-10 mt-2" loading={isImportingWord} onClick={() => wordInputRef.current?.click()}>
				ایمپورت از (docx.) Word
			</Button>
			<input ref={wordInputRef} type="file" accept=".docx" className="hidden" onChange={handleWordImportClick} />

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
													onClick={() => {
														const currentFont = missingFontState.queue[missingFontState.currentIndex];
														const newMapping = { ...missingFontState.mapping, [currentFont]: missingFontState.selectedMappingFont! };
														advanceMissingFont(newMapping);
													}}
												>
													تایید و جایگزینی
												</Button>
											</div>
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
