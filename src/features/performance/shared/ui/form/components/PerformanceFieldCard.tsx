import type { ContractSectionTone } from "#src/features/contract/shared/ui/form/components/contract-form-section-tone";
import type { ReactNode } from "react";
import { getContractSectionToneColors } from "#src/features/contract/shared/ui/form/components/contract-form-section-tone";
import { ContractDashedBorder } from "#src/features/contract/shared/ui/form/components/ContractDashedBorder";
import { Card, Tag, theme } from "antd";
import clsx from "clsx";

interface PerformanceFieldCardProps {
	title: ReactNode
	children: ReactNode
	tone?: ContractSectionTone
	className?: string
	headerExtra?: ReactNode
}

export function PerformanceFieldCard({
	title,
	children,
	tone,
	className,
	headerExtra,
}: PerformanceFieldCardProps) {
	const { token } = theme.useToken();
	const toneColors = tone ? getContractSectionToneColors(token, tone) : null;

	return (
		<Card bordered={false} className={clsx("performance-field-card", className)}>
			<ContractDashedBorder />
			<div className="performance-field-card__header">
				{tone
					? (
						<Tag
							className="performance-field-card__tag"
							style={{
								borderColor: toneColors?.background,
								borderRadius: token.borderRadiusSM,
								backgroundColor: toneColors?.background,
								color: toneColors?.text,
							}}
						>
							{title}
						</Tag>
					)
					: <span className="performance-field-card__title">{title}</span>}
				{headerExtra}
			</div>
			{children}
		</Card>
	);
}
