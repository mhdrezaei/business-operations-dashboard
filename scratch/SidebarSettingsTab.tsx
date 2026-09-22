import type { Editor } from "@tiptap/react";
import { DeleteOutlined, FileWordOutlined, UploadOutlined } from "@ant-design/icons";
import { Button, message, theme, Typography, Modal, Progress, Space } from "antd";
import React, { useRef, useState } from "react";
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
	
	const [missingFontState, setMissingFontState] = useState<{
		visible: boolean;
		fontName: string;
		resolve?: (val: string | null) => void;
		isUploading: boolean;
		progress: number;
	} | null>(null);

	const { customFonts, headerData, setHeaderData, fetchFonts } = useTemplateStore();

	const handleFontUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (event.target) event.target.value = "";
		if (!file) return;

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
		}
	};

	const handleWordImportClick = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (event.target) event.target.value = "";
		if (!file || !editor) return;

		if (!file.name.toLowerCase().endsWith(".docx")) {
			message.error("فقط فایل‌های .docx پشتیبانی می‌شوند.");
			return;
		}

		setIsImportingWord(true);
		const hideLoading = message.loading("در حال پردازش فایل...", 0);
		try {
			await importWordToEditor(file, editor, () => setIsImportingWord(false), async (fontName) => {
				const exists = customFonts?.find(f => f.name?.toLowerCase() === fontName.toLowerCase() || f.family?.toLowerCase() === fontName.toLowerCase());
				if (exists) return exists.family;
				
				return new Promise<string | null>((resolve) => {
					setMissingFontState({
						visible: true,
						fontName,
						resolve,
						isUploading: false,
						progress: 0,
					});
				});
			});
			message.success("فایل با موفقیت ایمپورت شد.");
		} catch (error: any) {
			console.error(error);
			if (error?.message === "EMPTY_FILE") {
				message.warning("فایل ورد فاقد محتوای متنی است.");
			} else {
				message.error("خطا در پردازش فایل ورد.");
			}
		} finally {
			setTimeout(hideLoading, 100);
			setIsImportingWord(false);
		}
	};

	const handleMissingFontUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (event.target) event.target.value = "";
		if (!file || !missingFontState) return;

		setMissingFontState(prev => prev ? { ...prev, isUploading: true, progress: 0 } : null);

		try {
			// Ensure it uses the exact name of the requested font to match it
			await TemplateCreateApi.uploadFont(missingFontState.fontName, file, (progress) => {
				setMissingFontState(prev => prev ? { ...prev, progress: Math.floor(progress) } : null);
			});
			message.success("فونت با موفقیت آپلود شد.");
			await fetchFonts();
			missingFontState.resolve?.(missingFontState.fontName);
			setMissingFontState(null);
		}
		catch (error: any) {
			message.error(error?.message || "خطا در آپلود فونت");
			setMissingFontState(prev => prev ? { ...prev, isUploading: false, progress: 0 } : null);
		}
	};

	const handleCancelMissingFont = () => {
		if (missingFontState?.resolve) {
			missingFontState.resolve(null);
		}
		setMissingFontState(null);
	};

	return (
		<div className="h-full flex flex-col p-4 space-y-4 overflow-y-auto custom-scrollbar">
			<HeaderEditor header={headerData} onChange={setHeaderData} />

			<div className="rounded-xl border p-4" style={{ backgroundColor: token.colorBgContainer, borderColor: token.colorBorderSecondary }}>
				<div className="flex justify-between items-center mb-4">
					<Text strong className="text-sm">
						<span className="text-lg font-serif mr-1" style={{ color: token.colorPrimary }}>T</span>
						{" "}فونت‌ها
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
				title={
					<div className="flex items-center gap-2">
						<span className="text-xl">⚠️</span>
						<span>فونت یافت نشد</span>
					</div>
				}
				open={missingFontState?.visible}
				onCancel={handleCancelMissingFont}
				closable={!missingFontState?.isUploading}
				maskClosable={!missingFontState?.isUploading}
				footer={
					missingFontState?.isUploading ? null : (
						<Space>
							<Button onClick={handleCancelMissingFont}>استفاده از فونت پیش‌فرض</Button>
							<Button type="primary" icon={<UploadOutlined />} onClick={() => missingFontInputRef.current?.click()}>
								آپلود فونت ({missingFontState?.fontName})
							</Button>
						</Space>
					)
				}
				centered
			>
				{missingFontState?.isUploading ? (
					<div className="py-6 flex flex-col items-center">
						<Text className="mb-4">در حال آپلود فونت {missingFontState.fontName}...</Text>
						<Progress percent={missingFontState.progress} status="active" strokeColor={token.colorPrimary} />
					</div>
				) : (
					<div className="py-4">
						<Text>
							فونت <Text strong code>{missingFontState?.fontName}</Text> در این فایل ورد استفاده شده اما در سیستم شما نصب نیست.
							آیا مایلید این فونت را برای نمایش بهتر فایل آپلود کنید؟
						</Text>
						<input ref={missingFontInputRef} type="file" accept=".ttf,.woff,.woff2,.otf" className="hidden" onChange={handleMissingFontUpload} />
					</div>
				)}
			</Modal>
		</div>
	);
}

