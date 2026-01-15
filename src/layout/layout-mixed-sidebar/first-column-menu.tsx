import type { MenuProps } from "antd";
import type { MenuItemType } from "../layout-menu/types";

import { Scrollbar } from "#src/components";
import { usePreferences } from "#src/hooks";
import { ConfigProvider, Menu } from "antd";

import { clsx } from "clsx";
import { createUseStyles } from "react-jss";

import { headerHeight } from "../constants";
import { Logo } from "../widgets";

const useStyles = createUseStyles(({ token }) => {
	return {
		menu: {
			"& .ant-menu-item": {
				"gap": token.sizeXS,
				"height": "60px",
				"display": "flex",
				"flexDirection": "column",
				"alignItems": "center",
				"justifyContent": "center",
				"& .ant-menu-title-content": {
					lineHeight: "initial",
					margin: "0px !important",
					fontSize: token.fontSizeIcon,
				},
			},
		},
	};
});

interface FirstColumnMenuProps {
	menus?: MenuItemType[]
	sideNavMenuKeyInSplitMode?: string
	handleMenuSelect?: (key: string, mode: MenuProps["mode"]) => void
}

const emptyArray: MenuItemType[] = [];
export default function FirstColumnMenu({
	handleMenuSelect,
	menus = emptyArray,
	sideNavMenuKeyInSplitMode,
}: FirstColumnMenuProps) {
	const classes = useStyles();
	const { firstColumnWidthInTwoColumnNavigation, isDark, sidebarTheme } = usePreferences();

	return (

		<div
			style={{
				width: firstColumnWidthInTwoColumnNavigation,
			}}
			className={clsx("border-r h-full", sidebarTheme === "dark" ? "border-r-[#303030]" : "border-r-colorBorderSecondary")}
		>
			<Logo sidebarCollapsed />
			<Scrollbar style={{ height: `calc(100% - ${headerHeight}px)` }}>
				<ConfigProvider theme={{
					components: {
						Menu: {
							collapsedWidth: firstColumnWidthInTwoColumnNavigation - 1,
						},
					},
				}}
				>
					<Menu
						mode="vertical"
						// inlineCollapsed
						selectedKeys={[sideNavMenuKeyInSplitMode ?? ""]}
						className={clsx(classes.menu)}
						items={menus as MenuProps["items"]}
						theme={isDark ? "dark" : sidebarTheme}
						/**
						 * از onClick به جاي onSelect استفاده مي شود چون وقتي مسير فرزند والد را فعال مي کند،
						 * کليک روي والد بايد همچنان ناوبري کند.
						 * @see https://github.com/user-attachments/assets/cf67a973-f210-45e4-8278-08727ab1b8ce
						 */
						onClick={({ key }) => handleMenuSelect?.(key, "horizontal")}
					/>
				</ConfigProvider>
			</Scrollbar>
		</div>
	);
}
