import type { ButtonProps } from "antd";
import type { RefObject } from "react";
import { BasicButton } from "#src/components";
import { FullscreenExitOutlined, FullscreenOutlined } from "@ant-design/icons";

import { useFullscreen } from "ahooks";

export interface FullscreenButtonProps extends Omit<ButtonProps, "target"> {
	target: HTMLElement | (() => Element) | RefObject<Element>
	fullscreenIcon?: React.ReactNode
	fullscreenExitIcon?: React.ReactNode
}

/**
 * کامپوننت دکمه تمام صفحه
 *
 * @param target عنصر هدف تمام صفحه
 * @param fullscreenIcon آيکن حالت تمام صفحه
 * @param fullscreenExitIcon آيکن خروج از تمام صفحه
 * @param restProps ساير ويژگي ها
 * @returns کامپوننت دکمه تمام صفحه را برمي گرداند
 */
export const FullscreenButton: React.FC<FullscreenButtonProps> = ({
	target,
	fullscreenIcon,
	fullscreenExitIcon,
	...restProps
}) => {
	const [isFullscreen, { toggleFullscreen }] = useFullscreen(target);

	return (
		<BasicButton
			type="text"
			{...restProps}
			icon={!isFullscreen ? (fullscreenIcon ?? <FullscreenOutlined />) : (fullscreenExitIcon ?? <FullscreenExitOutlined />)}
			onClick={toggleFullscreen}
		/>
	);
};
