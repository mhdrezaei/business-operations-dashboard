// src/features/contract-templates/create/components/editor/ui/HeaderEditor.tsx
import { DeleteOutlined, LayoutOutlined, LoadingOutlined, PictureOutlined } from "@ant-design/icons";
import { Button, Checkbox, Input, message, theme, Typography } from "antd";
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
			message.error("فقط تصویر PNG ،JPG یا SVG مجاز است.");
			return;
		}
		if (file.size > MAX_LOGO_SIZE) {
			message.error("حجم لوگو نباید بیشتر از ۱ مگابایت باشد.");
			return;
		}

		setIsUploading(true);
		try {
			const formData = new FormData();
			formData.append("file", file);

			const response = await fetch("https://negah-dp.karashab-co.ir/api/v1/contracts/templates/assets/", {
				method: "POST",
				body: formData,
			});

			if (!response.ok) {
				throw new Error("خطا در ارتباط با سرور");
			}

			const data = await response.json();

			// ذخیره دیتای واقعی دریافت شده از سرور
			set({
				logo_asset_id: data.id,
				logo_url: data.file_url,
				logo_data_url: null,
			});

			message.success("لوگو با موفقیت آپلود شد.");
		}
		catch (err: any) {
			message.error(err?.message || "خطا در آپلود لوگو");
		}
		finally {
			setIsUploading(false);
		}
	};

	const hasCustomLogo = Boolean(header.logo_data_url || header.logo_url);
	const logoSrc = header.logo_url || header.logo_data_url || "/default-logo.png";

	return (
		<div
			className="rounded-xl border p-4"
			style={{ backgroundColor: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
		>
			<div className="mb-2 flex items-center gap-2 font-semibold" style={{ color: token.colorText }}>
				<LayoutOutlined style={{ color: token.colorPrimary }} />
				هدر صفحات
			</div>
			<Text type="secondary" className="mb-4 text-[11px] leading-5 block">
				این هدر در بالای همهٔ صفحات پرینت تکرار می‌شود: لوگو در یک سمت و شماره قرارداد در سمت دیگر.
				اگر لوگویی آپلود نکنید، لوگوی پیش‌فرض استفاده می‌شود.
			</Text>

			<div className="flex items-center gap-4 mb-4">
				<div
					className="flex h-16 w-24 items-center justify-center overflow-hidden rounded-lg border border-dashed"
					style={{ borderColor: token.colorBorder, backgroundColor: token.colorBgLayout }}
				>
					{isUploading
						? (
							<LoadingOutlined style={{ color: token.colorPrimary, fontSize: 20 }} />
						)
						: logoSrc && logoSrc !== "/default-logo.png"
							? (
								<img src={logoSrc} alt="لوگو" className="max-h-full max-w-full object-contain" />
							)
							: (
								<Text type="secondary" className="text-[10px] text-center">لوگوی پیش‌فرض</Text>
							)}
				</div>

				<div className="flex flex-col gap-2">
					<div className="flex gap-2">
						<Button
							type="dashed"
							size="small"
							icon={<PictureOutlined />}
							onClick={() => inputRef.current?.click()}
							disabled={isUploading}
						>
							آپلود لوگوی دیگر
						</Button>
						{hasCustomLogo && (
							<Button
								type="text"
								danger
								size="small"
								icon={<DeleteOutlined />}
								onClick={() => set({ logo_asset_id: null, logo_data_url: null, logo_url: null })}
								disabled={isUploading}
							>
								حذف
							</Button>
						)}
					</div>
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
					<span className="text-xs">نمایش شماره قرارداد/الحاقیه</span>
				</Checkbox>

				<div>
					<Text className="block mb-1 text-xs">متن ثابت هدر (اختیاری)</Text>
					<Input
						value={header.extra_text || ""}
						onChange={e => set({ extra_text: e.target.value })}
						placeholder="مثلاً: شرکت گسترش خدمات ارتباطات..."
					/>
				</div>
			</div>
		</div>
	);
}
