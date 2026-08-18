import type { CSSProperties, ReactNode } from "react";
import type { ContractSectionTone } from "./contract-form-section-tone";
import { DownOutlined, UpOutlined } from "@ant-design/icons";
import { Button, Card, ConfigProvider, Tag, theme } from "antd";
import clsx from "clsx";
import { useContext, useState } from "react";
import { getContractSectionToneColors } from "./contract-form-section-tone";
import { ContractSectionToneContext } from "./contract-section-tone-context";

interface ContractFormSectionProps {
	title: ReactNode
	children: ReactNode
	className?: string
	extra?: ReactNode
	defaultExpanded?: boolean
	collapsible?: boolean
	tone?: ContractSectionTone
}

export function ContractFormSection({
	title,
	children,
	className,
	extra,
	defaultExpanded = true,
	collapsible = true,
	tone = "primary",
}: ContractFormSectionProps) {
	const [expanded, setExpanded] = useState(defaultExpanded);
	const inheritedTone = useContext(ContractSectionToneContext);
	const resolvedTone = inheritedTone ?? tone;
	const antdContext = useContext(ConfigProvider.ConfigContext);
	const { token } = theme.useToken();
	const configuredCardBorder = antdContext.theme?.components?.Card?.colorBorderSecondary;
	const configuredCardRadius = antdContext.theme?.components?.Card?.borderRadiusLG;
	const configuredInputBackground = antdContext.theme?.components?.Input?.colorBgContainer;
	const borderColor = typeof configuredCardBorder === "string"
		? configuredCardBorder
		: token.colorBorderSecondary;
	const toneColors = getContractSectionToneColors(token, resolvedTone);
	const style = {
		"--contract-section-border-color": borderColor,
		"--contract-section-header-gap": `${token.marginSM}px`,
		"--contract-section-radius": `${typeof configuredCardRadius === "number" ? configuredCardRadius : token.borderRadiusLG}px`,
		"--contract-section-line-width": `${token.lineWidth}px`,
		"--contract-section-dash-length": `${token.sizeXS - token.lineWidthBold}px`,
		"--contract-section-dash-gap": `${token.paddingXXS}px`,
		"--contract-section-branch-offset": `${token.paddingXS}px`,
		"--contract-section-accent-bg": toneColors.background,
		"--contract-section-accent-color": toneColors.text,
		"--contract-section-tag-bg": toneColors.background,
		"--contract-section-tag-color": toneColors.text,
		"--contract-section-tag-radius": `${resolvedTone === "purple" ? token.borderRadius : token.borderRadiusSM}px`,
		"--contract-section-body-padding": `${token.paddingLG}px`,
		"--contract-section-control-bg": typeof configuredInputBackground === "string"
			? configuredInputBackground
			: token.colorFillSecondary,
		"--contract-section-nested-bg": token.colorBgLayout,
		"--contract-section-danger-border-color": token.colorErrorBorder,
		"--contract-section-control-radius": `${token.borderRadius}px`,
		"--contract-section-control-padding-block": `${token.paddingXS}px`,
		"--contract-section-control-padding-inline": `${token.paddingSM}px`,
		"--contract-section-currency-bg": token.colorPrimary,
		"--contract-section-currency-border-color": token.colorPrimary,
		"--contract-section-currency-text-color": token.colorTextLightSolid,
		"--contract-section-upload-min-height": `${token.controlHeightLG * 3}px`,
		"--contract-section-field-label-gap": `${token.marginXS}px`,
		"--contract-section-field-label-height": `${token.controlHeightSM}px`,
		"--contract-section-field-control-height": `${token.controlHeight}px`,
	} as CSSProperties;

	return (
		<Card
			variant="outlined"
			style={style}
			className={clsx(
				"contract-form-section",
				collapsible && !expanded && "contract-form-section--collapsed",
				className,
			)}
			title={(
				<Tag bordered={false} className="contract-form-section__tag">
					{title}
				</Tag>
			)}
			extra={(
				<div className="contract-form-section__actions">
					{extra}
					{collapsible
						? (
							<Button
								type="text"
								disabled={false}
								aria-label={expanded ? `بستن ${String(title)}` : `باز کردن ${String(title)}`}
								icon={expanded ? <UpOutlined /> : <DownOutlined />}
								onClick={() => setExpanded(current => !current)}
							/>
						)
						: null}
				</div>
			)}
		>
			{!collapsible || expanded ? children : null}
		</Card>
	);
}
