// src/features/contract-templates/create/components/editor/ui/HeaderEditor.tsx
import { TemplateCreateApi } from "#src/features/contract-templates/api/api.js";
import { DeleteOutlined, LayoutOutlined, LoadingOutlined, PictureOutlined } from "@ant-design/icons";
import { Button, Checkbox, Input, message, Spin, theme, Typography } from "antd";
import React, { useRef, useState } from "react";

const { Text } = Typography;
const MAX_LOGO_SIZE = 1024 * 1024;

export interface HeaderData {
	logo_asset_id?: number | null
	logo_data_url?: string | null
	logo_url?: string | null
	show_contract_number?: boolean
	extra_text?: string
}

interface HeaderEditorProps {
	header: HeaderData
	onChange: (data: HeaderData) => void
}

export default function HeaderEditor({ header, onChange }: HeaderEditorProps) {
	const { token } = theme.useToken();
	const inputRef = useRef<HTMLInputElement>(null);
	const [isUploading, setIsUploading] = useState(false);

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
			className="rounded-xl border p-4"
			style={{ backgroundColor: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
		>
			<div className="mb-2 flex items-center gap-2 font-semibold" style={{ color: token.colorText }}>
				<LayoutOutlined style={{ color: token.colorPrimary }} />
				هدر صفحات
			</div>
			<Text type="secondary" className="mb-4 text-[11px] leading-5 block text-justify">
				این هدر در بالای همۀ صفحات پرینت تکرار می‌شود: لوگو بالا-راست و «شماره قرارداد :» با نوار آبی بالا-چپ.
				اگر لوگویی آپلود نکنید، لوگوی پیش‌فرض کاراشاب استفاده می‌شود.
			</Text>

			<div className="flex items-center gap-3 mb-5">
				<div className="flex flex-col gap-2 flex-1">
					<Button
						ghost
						type="primary"
						size="small"
						className="w-full flex justify-center items-center h-8 text-[11px]"
						icon={<PictureOutlined />}
						onClick={() => inputRef.current?.click()}
						loading={isUploading}
					>
						آپلود لوگوی دیگر
					</Button>
					<Button
						danger
						ghost
						type="default"
						size="small"
						className="w-full flex justify-center items-center h-8 text-[11px]"
						icon={<DeleteOutlined />}
						onClick={() => set({ logo_asset_id: null, logo_data_url: null, logo_url: null })}
						disabled={!hasCustomLogo || isUploading}
					>
						بازگشت به لوگوی پیش‌فرض
					</Button>
				</div>

				<div
					className="flex h-16 w-24 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed relative p-1"
					style={{ borderColor: token.colorBorder, backgroundColor: token.colorBgLayout }}
				>
					{isUploading
						? (
							<Spin indicator={<LoadingOutlined style={{ fontSize: 18, color: token.colorPrimary }} spin />} />
						)
						: (
							<img src={logoSrc} alt="لوگو" className="max-h-full max-w-full object-contain opacity-90" />
						)}
				</div>

				<input
					ref={inputRef}
					type="file"
					accept="image/png,image/jpeg,image/svg+xml"
					className="hidden"
					onChange={handleLogoFile}
				/>
			</div>

			<div className="flex flex-col gap-3">
				<Checkbox
					checked={header.show_contract_number !== false}
					onChange={e => set({ show_contract_number: e.target.checked })}
				>
					<span className="text-[11px]">نمایش شماره قرارداد/الحاقیه</span>
				</Checkbox>

				<div>
					<Text className="block mb-1 text-[11px]">متن ثابت هدر (اختیاری)</Text>
					<Input
						value={header.extra_text || ""}
						onChange={e => set({ extra_text: e.target.value })}
						placeholder="مثلاً: شرکت گسترش خدمات ارتباطات کاراشاب"
						className="text-xs"
					/>
				</div>
			</div>
		</div>
	);
}
