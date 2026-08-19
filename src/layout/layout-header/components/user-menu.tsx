import type { ButtonProps, MenuProps } from "antd";

import ProfileIcon from "#src/assets/svg/header/profile.svg?react";
import { BasicButton } from "#src/components";
import { RiAccountCircleLine } from "#src/icons";
import { loginPath } from "#src/router/extra-info";
import { useAuthStore } from "#src/store";
import { cn, isWindowsOs } from "#src/utils";

import { LogoutOutlined } from "@ant-design/icons";
import { useKeyPress } from "ahooks";
import { Dropdown, theme } from "antd";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

export function UserMenu({ ...restProps }: ButtonProps) {
	const navigate = useNavigate();
	const { t } = useTranslation();
	const { token } = theme.useToken();
	const logout = useAuthStore(state => state.logout);

	const onClick: MenuProps["onClick"] = async ({ key }) => {
		if (key === "logout") {
			await logout();
			navigate(loginPath);
		}
		if (key === "personal-center") {
			navigate("/personal-center/my-profile");
		}
	};

	const altView = useMemo(() => isWindowsOs() ? "Alt" : "⌥", [isWindowsOs]);
	const items: MenuProps["items"] = [
		{
			label: t("common.menu.personalCenter"),
			key: "personal-center",
			icon: <RiAccountCircleLine />,
			extra: `${altView}P`,
		},
		{
			label: t("authority.logout"),
			key: "logout",
			icon: <LogoutOutlined />,
			extra: `${altView}Q`,
		},
	];

	useKeyPress(["alt.P"], () => {
		navigate("/personal-center/my-profile");
	});

	useKeyPress(["alt.Q"], () => {
		onClick({ key: "logout" } as any);
	});

	return (
		<Dropdown
			menu={{ items, onClick }}
			arrow={false}
			placement="bottomRight"
			trigger={["click"]}
		>
			<BasicButton
				type="text"
				{...restProps}
				aria-label={t("common.menu.personalCenter")}
				className={cn(restProps.className, "!rounded-full !text-white hover:!text-white hover:!brightness-110")}
				style={{
					...restProps.style,
					backgroundColor: token.colorPrimary,
					backgroundImage: `linear-gradient(180deg, ${token.colorPrimary} 0%, ${token.cyan6} 100%)`,
				}}
				icon={<ProfileIcon className="size-6 [&_path]:fill-current" aria-hidden />}
			>
			</BasicButton>
		</Dropdown>
	);
}
