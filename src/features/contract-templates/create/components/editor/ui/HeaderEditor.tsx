import type { HeaderData, HeaderEditorProps } from "../../../../types";
import { TemplateCreateApi } from "#src/features/contract-templates/api/api.js";
import { DeleteOutlined, LayoutOutlined, LoadingOutlined, PictureOutlined } from "@ant-design/icons";
import { Button, Checkbox, Divider, Input, InputNumber, message, Select, Spin, theme, Typography } from "antd";
import React, { useRef, useState } from "react";
import { useTemplateStore } from "../../../../store/useTemplateStore";

const { Text } = Typography;
const MAX_LOGO_SIZE = 1024 * 1024;

export default function HeaderEditor({ header, onChange }: HeaderEditorProps) {
	const { token } = theme.useToken();
	const inputRef = useRef<HTMLInputElement>(null);
	const [isUploading, setIsUploading] = useState(false);
	const { customFonts } = useTemplateStore();

	const set = (patch: Partial<HeaderData>) => onChange({ ...header, ...patch });

	const handleLogoFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];

		if (event.target) {
			event.target.value = "";
		}

		if (!file)
			return;

		if (!/image\/(?:png|jpe?g|svg\+xml)/.test(file.type)) {
			message.error("فقط تصویر PNG، JPG یا SVG مجاز است.");
			return;
		}
		if (file.size > MAX_LOGO_SIZE) {
			message.error("حجم لوگو نباید بیشتر از ۱ مگابایت باشد.");
			return;
		}

		setIsUploading(true);
		try {
			const data = await TemplateCreateApi.uploadAsset(file);

			set({
				logo_asset_id: data.id,
				logo_url: data.file_url,
				logo_data_url: null,
			});

			message.success("لوگو با موفقیت در سرور آپلود شد.");
		}
		catch (err: any) {
			message.error(err?.message || "خطا در آپلود لوگو");
		}
		finally {
			setIsUploading(false);
		}
	};

	const hasCustomLogo = Boolean(header.logo_data_url || header.logo_url);
	const logoSrc = header.logo_url || header.logo_data_url || "/karashab-logo.png";
	return (
		<div
			className="rounded-xl border p-4 mb-4 bg-white dark:bg-[#1f1f1f] shadow-sm transition-all hover:shadow-md"
			style={{ borderColor: token.colorBorderSecondary }}
		>
			<div className="mb-3 flex items-center gap-2 text-[15px] font-bold" style={{ color: token.colorTextHeading }}>
				<div className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ backgroundColor: `${token.colorPrimary}15`, color: token.colorPrimary }}>
					<LayoutOutlined />
				</div>
				تنظیمات هدر صفحات
			</div>
			<Text type="secondary" className="mb-5 text-xs leading-5 block text-justify opacity-85">
				این هدر در بالای همه صفحات پرینت و ویرایشگر تکرار می‌شود (لوگو و جزئیات قرارداد). از تنظیمات زیر برای شخصی‌سازی استفاده کنید.
			</Text>

			<div className="flex flex-col gap-4">
				{/* بخش لوگو */}
				<div className="flex items-center gap-3 p-3 rounded-lg border" style={{ backgroundColor: token.colorBgLayout, borderColor: token.colorBorderSecondary }}>
					<div
						className="flex h-16 w-24 flex-shrink-0 items-center justify-center overflow-hidden rounded-md border border-dashed relative p-1 bg-white"
						style={{ borderColor: token.colorBorder }}
					>
						{isUploading
							? (
								<Spin indicator={<LoadingOutlined style={{ fontSize: 18, color: token.colorPrimary }} spin />} />
							)
							: (
								<img src={logoSrc} alt="لوگو" className="max-h-full max-w-full object-contain opacity-90" />
							)}
					</div>
					<div className="flex flex-col gap-2 flex-1">
						<Button
							type="primary"
							size="small"
							className="w-full flex justify-center items-center h-8 text-[11px]"
							icon={<PictureOutlined />}
							onClick={() => inputRef.current?.click()}
							loading={isUploading}
						>
							تغییر لوگو
						</Button>
						<Button
							danger
							type="text"
							size="small"
							className="w-full flex justify-center items-center h-8 text-[11px] bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900"
							icon={<DeleteOutlined />}
							onClick={() => set({ logo_asset_id: null, logo_data_url: null, logo_url: null })}
							disabled={!hasCustomLogo || isUploading}
						>
							لوگوی پیش‌فرض
						</Button>
					</div>
					<input
						ref={inputRef}
						type="file"
						accept="image/png,image/jpeg,image/svg+xml"
						className="hidden"
						onChange={handleLogoFile}
					/>
				</div>

				{/* بخش شماره قرارداد */}
				<div className="flex flex-col gap-2">
					<Checkbox
						checked={header.show_contract_number !== false}
						onChange={e => set({ show_contract_number: e.target.checked })}
					>
						<span className="text-sm font-medium">نمایش شماره قرارداد</span>
					</Checkbox>
				</div>

				<Divider className="my-1" />

				{/* متن و تایپوگرافی */}
				<div className="flex flex-col gap-3">
					<div>
						<Text className="block mb-1.5 text-xs font-medium">متن عنوان هدر (اختیاری)</Text>
						<Input
							value={header.extra_text || ""}
							onChange={e => set({ extra_text: e.target.value })}
							placeholder="مثلاً: شرکت ارتباطات کاراشاب"
							className="text-sm"
						/>
					</div>

					<div className="grid grid-cols-2 gap-3 mt-1">
						<div>
							<Text className="block mb-1.5 text-[11px] text-gray-500">فونت هدر</Text>
							<Select
								value={header.header_font_family || "Vazirmatn"}
								onChange={value => set({ header_font_family: value })}
								className="w-full"
								size="small"
								getPopupContainer={trigger => trigger.parentNode}
								options={[
									{ value: "Vazirmatn", label: "Vazirmatn (پیش‌فرض)" },
									...(customFonts?.map(font => ({ value: font.family, label: font.name })) || []),
								]}
							/>
						</div>
						<div>
							<Text className="block mb-1.5 text-[11px] text-gray-500">اندازه فونت (px)</Text>
							<InputNumber
								value={header.header_font_size || 13}
								onChange={value => set({ header_font_size: value || 13 })}
								min={8}
								max={30}
								size="small"
								className="w-full"
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
