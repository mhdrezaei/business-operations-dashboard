import type { Editor } from "@tiptap/react";
import { DeleteOutlined, FileWordOutlined, UploadOutlined } from "@ant-design/icons";
import { Button, message, theme, Typography } from "antd";
// src/features/contract-templates/create/components/SidebarSettingsTab.tsx
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

	const [isUploadingFont, setIsUploadingFont] = useState(false);
	const [isImportingWord, setIsImportingWord] = useState(false);

	const { customFonts, headerData, setHeaderData, fetchFonts } = useTemplateStore();

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
		await importWordToEditor(file, editor, () => setIsImportingWord(false));
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
		</div>
	);
}
