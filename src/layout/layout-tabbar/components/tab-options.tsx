import type { MenuProps } from "antd";

import { BasicButton } from "#src/components";
import { cn } from "#src/utils";

import { DownOutlined } from "@ant-design/icons";
import { Dropdown } from "antd";
import { useState } from "react";

import { useDropdownMenu } from "../hooks/use-dropdown-menu";

/**
 * رابط ويژگي هاي TabOptions
 * @interface TabOptionsProps
 * @property {string} activeKey - کليد تب فعال
 */
interface TabOptionsProps {
	activeKey: string
	className?: string
}

/**
 * کامپوننت TabOptions
 * براي نمايش منوي عمليات تب ها
 * @param {TabOptionsProps} props - ويژگي هاي کامپوننت
 * @returns {JSX.Element} کامپوننت TabOptions
 */
export function TabOptions({ activeKey, className }: TabOptionsProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [items, onClickMenu] = useDropdownMenu();

	/**
	 * رسيدگي به تغيير وضعيت باز بودن منو
	 * @param {boolean} open - آيا منو باز است
	 */
	const onOpenChange = (open: boolean) => {
		setIsOpen(open);
	};

	/**
	 * رسيدگي به کليک آيتم منو
	 * @param {object} param - پارامتر کليک
	 * @param {string} param.key - کليد آيتم کليک شده
	 */
	const onClick: MenuProps["onClick"] = ({ key }) => {
		onClickMenu(key, activeKey);
		setIsOpen(false);
	};

	return (
		<Dropdown
			trigger={["click"]}
			menu={{ items: items(activeKey), onClick }}
			open={isOpen}
			onOpenChange={onOpenChange}
		>
			<BasicButton
				className={cn(className)}
				size="middle"
				type="text"
				icon={<DownOutlined />}
			/>
		</Dropdown>
	);
}
