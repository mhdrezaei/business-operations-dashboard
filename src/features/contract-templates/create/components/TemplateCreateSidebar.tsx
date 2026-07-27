// src/features/contract-templates/create/components/TemplateCreateSidebar.tsx
import { SearchOutlined } from "@ant-design/icons";
import { Input, Tag, theme, Typography } from "antd";
import React from "react";

const { Text } = Typography;

export default function TemplateCreateSidebar() {
	const { token } = theme.useToken();

	return (
		<div
			className="h-full flex flex-col rounded-xl border p-4"
			style={{ backgroundColor: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
		>
			{/* هدر سایدبار */}
			<div className="flex justify-between items-center mb-4">
				<h3 className="font-bold m-0 text-base" style={{ color: token.colorText }}>
					&#123; &#125; متغیرها
				</h3>
				<Tag
					color="processing"
					className="cursor-pointer m-0 hover:opacity-80 transition-opacity"
				>
					افزودن همه (تست)
				</Tag>
			</div>

			<Text type="secondary" className="text-xs mb-4 leading-relaxed block">
				روی هر متغیر کلیک کنید تا در محل مکان‌نما درج شود. موقع پرینت، مقدار واقعی جایگزین می‌شود.
			</Text>

			{/* سرچ باکس */}
			<Input
				prefix={<SearchOutlined style={{ color: token.colorTextDescription }} />}
				placeholder="جستجوی متغیر..."
				className="mb-4"
			/>

			{/* لیست متغیرها با اسکرول */}
			<div className="flex-1 overflow-y-auto custom-scrollbar pr-1 flex flex-col gap-5">

				{/* گروه: هویت شرکت */}
				<div>
					<Text type="secondary" className="text-[11px] mb-2 block font-semibold">هویت شرکت</Text>
					<div className="flex flex-wrap gap-2">
						<VariableTag label="نام شرکت" />
						<VariableTag label="نام حقوقی شرکت" />
						<VariableTag label="نام برند شرکت" />
						<VariableTag label="نوع شخصیت حقوقی" />
					</div>
				</div>

				{/* گروه: اطلاعات ثبتی و مالیاتی */}
				<div>
					<Text type="secondary" className="text-[11px] mb-2 block font-semibold">اطلاعات ثبتی و مالیاتی</Text>
					<div className="flex flex-wrap gap-2">
						<VariableTag label="شناسه ملی شرکت" />
						<VariableTag label="شماره ثبت شرکت" />
						<VariableTag label="محل ثبت شرکت" />
						<VariableTag label="کد اقتصادی شرکت" />
						<VariableTag label="شناسه مالیاتی" />
						<VariableTag label="شماره ثبت مالیاتی" />
						<VariableTag label="وضعیت ارزش افزوده" />
					</div>
				</div>

				{/* گروه: آدرس و اطلاعات تماس شرکت */}
				<div>
					<Text type="secondary" className="text-[11px] mb-2 block font-semibold">آدرس و اطلاعات تماس شرکت</Text>
					<div className="flex flex-wrap gap-2">
						<VariableTag label="نشانی قانونی شرکت" />
						<VariableTag label="کد پستی شرکت" />
						<VariableTag label="وب‌سایت شرکت" />
					</div>
				</div>

			</div>
		</div>
	);
}

// استفاده از تگ‌های استاندارد Antd
function VariableTag({ label }: { label: string }) {
	const { token } = theme.useToken();

	return (
		<Tag
			className="cursor-pointer m-0 px-2 py-1 transition-all duration-200 select-none"
			style={{
				borderRadius: "16px",
				backgroundColor: token.colorPrimaryBg,
				color: token.colorPrimary,
				borderColor: token.colorPrimaryBorder,
			}}
		>
			{label}
		</Tag>
	);
}
