import type { SectionTone } from "#src/shared/ui/section-card";
import type { ReactNode } from "react";
import { DashedBorder } from "#src/shared/ui/dashed-border";
import { getSectionToneColors, SectionCard } from "#src/shared/ui/section-card";
import { Tag, theme } from "antd";
import clsx from "clsx";
import "./styles.css";

export interface DashedCardProps {
	title?: ReactNode
	extra?: ReactNode
	children: ReactNode
	className?: string
	tone?: SectionTone
	variant?: "default" | "field"
	collapsible?: boolean
	defaultExpanded?: boolean
}

export type FieldCardProps = Omit<DashedCardProps, "variant" | "collapsible" | "defaultExpanded">;

/** Nested content surface with a token-aware dashed outline. */
export function DashedCard({
	title,
	extra,
	children,
	className,
	tone,
	variant = "default",
	collapsible = false,
	defaultExpanded = true,
}: DashedCardProps) {
	const { token } = theme.useToken();
	const toneColors = tone ? getSectionToneColors(token, tone) : null;

	if (collapsible) {
		return (
			<SectionCard
				title={title}
				extra={extra}
				tone={tone}
				className={className}
				defaultExpanded={defaultExpanded}
			>
				{children}
			</SectionCard>
		);
	}

	const titleNode = tone
		? (
			<Tag
				className="dashed-card__tag"
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
		: variant === "field"
			? <span className="dashed-card__title">{title}</span>
			: <strong className="dashed-card__title">{title}</strong>;

	return (
		<section className={clsx("dashed-card", `dashed-card--${variant}`, className)}>
			<DashedBorder />
			<div className="dashed-card__content">
				{title || extra
					? (
						<header className="dashed-card__header">
							{titleNode}
							{extra}
						</header>
					)
					: null}
				{children}
			</div>
		</section>
	);
}

/** Field-oriented dashed card with a stacked body and optional tone tag. */
export function FieldCard(props: FieldCardProps) {
	return <DashedCard {...props} variant="field" />;
}
