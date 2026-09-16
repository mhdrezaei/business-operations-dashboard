import type { ReactNode } from "react";
import { ContractDashedBorder } from "#src/features/contract/shared/ui/form/components/ContractDashedBorder";

interface Props {
	title?: ReactNode
	extra?: ReactNode
	children: ReactNode
	className?: string
}

export function PredictionDashedCard({ title, extra, children, className = "" }: Props) {
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
