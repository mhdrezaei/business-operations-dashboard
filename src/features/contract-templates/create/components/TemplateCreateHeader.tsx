// src/features/contract-templates/create/components/TemplateCreateHeader.tsx
import { ArrowRightOutlined, PrinterOutlined, SaveOutlined } from "@ant-design/icons";
import { Button, theme, Typography } from "antd";

const { Title, Text } = Typography;

export default function TemplateCreateHeader({ onClose }: { onClose: () => void }) {
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
				<Button
					type="default"
					icon={<ArrowRightOutlined />}
					onClick={onClose}
				>
					بازگشت به لیست
				</Button>
				<Button
					type="default"
					icon={<PrinterOutlined />}
				>
					پیش‌ نمایش چاپ
				</Button>
				{/* با استفاده از type="primary"، رنگ دکمه به صورت خودکار با تم Antd تنظیم می‌شود */}
				<Button
					type="primary"
					icon={<SaveOutlined />}
				>
					ذخیره قالب
				</Button>
			</div>
		</div>
	);
}
