import { useDeviceType } from "#src/hooks";
import { cn } from "#src/utils";

import { DoubleLeftOutlined, DoubleRightOutlined } from "@ant-design/icons";
import { Button, theme, Typography } from "antd";
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
	const { isMobile } = useDeviceType();
	const { token } = theme.useToken();

	useEffect(() => {
		const timer = setInterval(() => {
			setCurrentTime(new Date());
		}, 1000);

		return () => clearInterval(timer);
	}, []);

	// Persian date - with Persian month names
	const persianDateString = moment(currentTime).format("jD jMMMM jYYYY");

	const englishDateString = new Intl.DateTimeFormat("en-GB", {
		calendar: "gregory",
		day: "numeric",
		month: "long",
	}).format(currentTime);

	return (
		<div className={cn(
			"overflow-hidden px-4 py-4 transition-all duration-300 ease-in-out",
			sidebarCollapsed && "px-1",
			className,
		)}
		>
			<div className={cn("flex items-center", sidebarCollapsed ? "justify-center" : "justify-between gap-3")}>
				{!sidebarCollapsed
					? (
						<div className="min-w-0 flex-1 overflow-hidden">
							<Text
								className="block whitespace-nowrap text-right text-base font-bold leading-none tracking-normal !text-colorText"
								dir="rtl"
							>
								{persianDateString}
							</Text>

							<Text
								className="mt-2 block whitespace-nowrap text-right text-xs font-normal leading-none tracking-normal !text-primary"
								dir="ltr"
							>
								{englishDateString}
							</Text>
						</div>
					)
					: null}

				{!isMobile && onToggleCollapse && (
					<Button
						type="text"
						style={{
							borderColor: token.colorPrimaryBorder,
							backgroundColor: token.colorPrimaryBg,
							color: token.colorPrimary,
						}}
						icon={sidebarCollapsed ? <DoubleLeftOutlined /> : <DoubleRightOutlined />}
						onClick={onToggleCollapse}
						aria-label={sidebarCollapsed ? "باز کردن سایدبار" : "جمع کردن سایدبار"}
						className="flex !h-12 !w-12 !min-w-[48px] flex-none items-center justify-center !rounded-xl !border !border-solid !p-0 !text-xl hover:!text-primary"
					/>
				)}
			</div>
		</div>
	);
}
