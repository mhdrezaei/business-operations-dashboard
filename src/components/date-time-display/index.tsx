import { useDeviceType, usePreferences } from "#src/hooks";
import { cn } from "#src/utils";

import { DoubleRightOutlined } from "@ant-design/icons";
import { Button, Typography } from "antd";
import dayjs from "dayjs";
import moment from "moment-jalaali";
import { useEffect, useState } from "react";

// Load Persian locale for moment-jalaali
moment.loadPersian({ usePersianDigits: false, dialect: "persian-modern" });

const { Text } = Typography;

export interface DateTimeDisplayProps {
	className?: string
	sidebarCollapsed?: boolean
	onToggleCollapse?: () => void
}

export function DateTimeDisplay({ className, sidebarCollapsed = false, onToggleCollapse }: DateTimeDisplayProps) {
	const [currentTime, setCurrentTime] = useState(new Date());
	const { sidebarTheme, isDark } = usePreferences();
	const { isMobile } = useDeviceType();

	useEffect(() => {
		const timer = setInterval(() => {
			setCurrentTime(new Date());
		}, 1000);

		return () => clearInterval(timer);
	}, []);

	const isFixedDarkTheme = isDark || sidebarTheme === "dark";

	// Persian date - with Persian month names
	const persianDateString = moment(currentTime).format("jD jMMMM jYYYY");

	// English date - ensure English locale and proper LTR format
	const englishDateString = `${currentTime.getFullYear()} - ${dayjs(currentTime).locale("en").format("MMMM")}, ${currentTime.getDate()}`;

	return (
		<div className={cn(
			"px-4 py-3 border-t transition-all duration-300 ease-in-out overflow-hidden ",
			isFixedDarkTheme ? "border-t-[#303030]" : "border-t-colorBorderSecondary",
			sidebarCollapsed ? "opacity-0 max-h-0 py-0" : "opacity-100 max-h-20",
			className,
		)}
		>
			{/* Persian Date with Collapse Button */}
			<div className="mb-2 flex items-center justify-between">
				<Text
					className={cn(
						"text-right text-md font-bold leading-none tracking-normal",
						isFixedDarkTheme ? "!text-gray-300" : "!text-gray-700",
					)}
					dir="rtl"
				>
					{persianDateString}
				</Text>

				{/* Collapse Button - Only on Desktop */}
				{!isMobile && onToggleCollapse && (
					<Button
						type="text"
						size="small"
						icon={<DoubleRightOutlined />}
						onClick={onToggleCollapse}
						className={cn(
							"!p-1 !min-w-0 !h-6 !w-6 flex items-center justify-center",
							"!text-primary hover:!text-primary-600 hover:!bg-primary-50",
							isFixedDarkTheme && "hover:!bg-primary-900/20",
						)}
					/>
				)}
			</div>

			{/* English Date */}
			<div>
				<Text
					className={cn(
						"block text-right text-xs font-normal leading-none tracking-normal",
						"!text-gray-500", // Gray text for English
						"ltr:direction-ltr", // LTR direction utility
					)}
					dir="ltr"
				>
					{englishDateString}
				</Text>
			</div>

			{/* Horizontal Dashed Divider */}
			<div
				className={cn(
					"mt-3 border-t border-dashed",
					isFixedDarkTheme ? "border-t-gray-300" : "border-t-gray-700",
				)}
			/>
		</div>
	);
}
