import type { ButtonProps } from "antd";

import { BasicButton } from "#src/components";
import { useDeviceType, useLanguage, usePreferences } from "#src/hooks";
import { useLayout } from "#src/layout/hooks/use-layout";
import { loginPath } from "#src/router/extra-info";
import { useAuthStore, usePreferencesStore } from "#src/store";

import { CopyOutlined, RedoOutlined, RocketOutlined, SettingOutlined } from "@ant-design/icons";
import { theme as antdTheme, Badge, ConfigProvider, Divider, Drawer, FloatButton } from "antd";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import {
	Animation,
	BuiltinTheme,
	General,
	HeaderBackground,
	HeaderHeight,
	PreferencesFooter,
	PreferencesLayout,
	Sidebar,
	SiteTheme,
	Tabbar,
} from "./blocks";

const preferencesContentId = "__react-antd-admin__preferences_drawer__";
export function Preferences({ ...restProps }: ButtonProps) {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const [isOpen, setIsOpen] = useState(false);
	const { isMobile } = useDeviceType();
	const { isRTL } = useLanguage();
	const { reset, isDefault, isDark } = usePreferences();
	const preferences = usePreferencesStore();
	const logout = useAuthStore(state => state.logout);
	const { isTopNav, isMixedNav } = useLayout();

	const clearAndLogout = async () => {
		await logout();
		usePreferencesStore.persist.clearStorage();
		navigate(loginPath);
	};

	const handleCopyPreferences = async () => {
		const data = JSON.stringify(preferences, null, 2);
		await navigator.clipboard.writeText(data);
		window.$modal?.success?.({
			title: t("preferences.copyPreferencesSuccessTitle"),
			content: t("preferences.copyPreferencesSuccess"),
		});
	};

	return (
		<>
			<BasicButton
				type="text"
				{...restProps}
				onClick={(e) => {
					restProps?.onClick?.(e);
					setIsOpen(true);
				}}
			>
				<SettingOutlined />
			</BasicButton>
			<ConfigProvider
				theme={{
					/**
					 * اگر سایدبار تيره باشد و ناوبري بالا يا ترکيبي باشد، روي استايل زير تاثير مي گذارد، پس اينجا الگوريتم را ريست کن
					 */
					algorithm: isDark
						? antdTheme.darkAlgorithm
						: antdTheme.defaultAlgorithm,
				}}
			>

				<Drawer
					title={t("preferences.title")}
					placement={isRTL ? "left" : "right"}
					onClose={() => {
						setIsOpen(false);
					}}
					extra={(
						<Badge
							style={{ width: 8, height: 8 }}
							dot={!isDefault}
							color="blue"
							offset={[-5, 5]}
						>
							<BasicButton
								onPointerDown={() => !isDefault && reset()}
								type="text"
								icon={<RedoOutlined rotate={270} />}
							/>
						</Badge>
					)}
					footer={(
						<div className="flex justify-between">
							<BasicButton
								icon={<CopyOutlined rotate={180} />}
								onPointerDown={handleCopyPreferences}
							>
								{t("preferences.copyPreferences")}
							</BasicButton>
							<BasicButton
								type="text"
								onPointerDown={clearAndLogout}
							>
								{t("preferences.clearAndLogout")}
							</BasicButton>
						</div>
					)}
					{...(isMobile
						? {
							width: "100vw",
						}
						: {})}
					open={isOpen}
					id={preferencesContentId}
				>
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							direction: "ltr", // Force LTR for preferences content
							width: "100%",
						}}
					>
						<Divider>{t("preferences.general.title")}</Divider>
						<General />
						<Divider>{t("preferences.theme.title")}</Divider>
						<SiteTheme />
						<Divider>{t("preferences.theme.builtin.title")}</Divider>
						<BuiltinTheme />
						<Divider>{t("preferences.layout.title")}</Divider>
						<PreferencesLayout />
						{(isTopNav || isMixedNav) && (
							<>
								<Divider>{t("preferences.layout.headerBackground.title")}</Divider>
								<HeaderBackground />
							</>
						)}
						<Divider>{t("preferences.layout.headerHeight.title")}</Divider>
						<HeaderHeight />
						<Divider>{t("preferences.sidebar.title")}</Divider>
						<Sidebar />
						<Divider>{t("preferences.tabbar.title")}</Divider>
						<Tabbar />
						<Divider>{t("preferences.animation.title")}</Divider>
						<Animation />
						<Divider>{t("preferences.footer.title")}</Divider>
						<PreferencesFooter />
					</div>
					<FloatButton.BackTop
						icon={<RocketOutlined />}
						target={() => document.querySelector(`#${preferencesContentId} .ant-drawer-body`) as HTMLElement}
					/>
				</Drawer>
			</ConfigProvider>
		</>
	);
}
