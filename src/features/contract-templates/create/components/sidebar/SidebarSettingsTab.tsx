import { DeleteOutlined, UploadOutlined } from "@ant-design/icons";
import { Button, theme, Typography } from "antd";
import React, { useRef, useState } from "react";
import { TemplateCreateApi } from "../../../api/api";
import { useTemplateStore } from "../../../store/useTemplateStore";
import { customToast } from "../editor/ui/CustomToast";
import HeaderEditor from "../editor/ui/HeaderEditor";

const { Text } = Typography;

export default function SidebarSettingsTab() {
	const { token } = theme.useToken();
	const fontInputRef = useRef<HTMLInputElement>(null);
	const [isUploadingFont, setIsUploadingFont] = useState(false);
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
			customToast.success("فونت با موفقیت آپلود شد.");
			fetchFonts();
		}
		catch (error: any) {
			customToast.error(error?.message || "خطا در آپلود فونت");
		}
		finally {
			setIsUploadingFont(false);
		}
	};

	const handleDeleteFont = async (id: number) => {
		try {
			await TemplateCreateApi.deleteFont(id);
			customToast.success("فونت حذف شد.");
			fetchFonts();
		}
		catch (error) {
			customToast.error("خطا در حذف فونت");
			console.warn(error);
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
		</div>
	);
}
