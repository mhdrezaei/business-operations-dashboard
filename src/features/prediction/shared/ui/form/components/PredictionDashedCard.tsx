import type { ReactNode } from "react";
import { ContractDashedBorder } from "#src/features/contract/shared/ui/form/components/ContractDashedBorder";
import { ContractFormSection } from "#src/features/contract/shared/ui/form/components/ContractFormSection";

interface Props {
	title?: ReactNode
	extra?: ReactNode
	children: ReactNode
	className?: string
	collapsible?: boolean
	defaultExpanded?: boolean
}

export function PredictionDashedCard({
	title,
	extra,
	children,
	className = "",
	collapsible = false,
	defaultExpanded = true,
}: Props) {
	if (collapsible) {
		return (
			<ContractFormSection
				title={title}
				extra={extra}
				className={className}
				defaultExpanded={defaultExpanded}
			>
				{children}
			</ContractFormSection>
		);
	}

	return (
		<section className={`prediction-dashed-card ${className}`.trim()}>
			<ContractDashedBorder />
			<div className="prediction-dashed-card__content">
				{title || extra
					? (
						<header className="prediction-dashed-card__header">
							<strong>{title}</strong>
							{extra}
						</header>
					)
					: null}
				{children}
			</div>
		</section>
	);
}
