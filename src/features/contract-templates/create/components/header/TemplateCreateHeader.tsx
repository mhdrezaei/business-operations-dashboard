// src/features/contract-templates/create/components/TemplateCreateHeader.tsx
import type { TemplateCreateHeaderProps } from "../../../types";
import { ArrowRightOutlined, FileWordOutlined, PrinterOutlined, SaveOutlined } from "@ant-design/icons";
import { Button, message, Popconfirm, theme, Typography } from "antd";

const { Title, Text } = Typography;

interface ExtendedHeaderProps extends TemplateCreateHeaderProps {
	onExportWord?: () => void
	onSaveTemplate?: () => void
	isSaving?: boolean
}

export default function TemplateCreateHeader({
	onClose,
	onOpenPrintPreview,
	onExportWord,
	onSaveTemplate,
	isSaving,
}: ExtendedHeaderProps) {
	const { token } = theme.useToken();

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
		</div>
	);
}
