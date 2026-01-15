import { BasicButton } from "#src/components";
import { useTabsStore } from "#src/store";
import { cn } from "#src/utils";

import { FullscreenExitOutlined, FullscreenOutlined } from "@ant-design/icons";
import { useShallow } from "zustand/shallow";

interface TabMaximizeProps {
	className?: string
}
/**
 * تغيير تب به حالت بيشينه / کمينه
 *
 * @returns کامپوننت دکمه بيشينه / کمينه تب
 */
export function TabMaximize({ className }: TabMaximizeProps) {
	/**
	 * useShallow - it may cause infinite loops in zustand v5
	 * https://github.com/pmndrs/zustand/blob/v5.0.0/docs/migrations/migrating-to-v5.md#requiring-stable-selector-outputs
	 */
	const { isMaximize } = useTabsStore(useShallow(state => ({ isMaximize: state.isMaximize })));
	const { toggleMaximize } = useTabsStore(useShallow(state => ({ toggleMaximize: state.toggleMaximize })));

	/** تغيير بيشينه / کمينه */
	const onClick = () => {
		toggleMaximize(!isMaximize);
	};

	return (
		<BasicButton
			className={cn(className)}
			type="text"
			size="middle"
			icon={isMaximize ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
			onClick={onClick}
		/>
	);
}
