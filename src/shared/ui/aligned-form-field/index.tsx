import type { CSSProperties, ReactNode } from "react";
import React, { useEffect, useMemo, useState } from "react";
import "#src/shared/ui/form-layout/styles.css";

/* eslint-disable react-refresh/only-export-components */

export interface AlignedFormFieldProps {
	label: string
	labelId?: string
	align?: "center" | "start"
	children: ReactNode
}

function buildFallbackWidth(labels: string[]) {
	const longestLabel = labels.reduce((max, current) => Math.max(max, current.length), 0);
	return `${Math.max(longestLabel + 2, 8)}ch`;
}

function measureMaxLabelWidth(labels: string[]) {
	if (typeof document === "undefined")
		return buildFallbackWidth(labels);

	const probe = document.createElement("span");
	probe.className = "aligned-form-field__label aligned-form-field__label--measure";
	document.body.appendChild(probe);

	let maxWidth = 0;
	for (const label of labels) {
		probe.textContent = `${label}:`;
		maxWidth = Math.max(maxWidth, Math.ceil(probe.getBoundingClientRect().width));
	}

	document.body.removeChild(probe);
	return maxWidth > 0 ? `${maxWidth}px` : buildFallbackWidth(labels);
}

export function useAlignedLabelWidth(labels: string[]): CSSProperties {
	const [labelWidth, setLabelWidth] = useState(() => buildFallbackWidth(labels));
	const labelKey = useMemo(() => labels.join("|"), [labels]);

	useEffect(() => {
		function updateWidth() {
			// The measured width is a layout result and must update after fonts load.
			// eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
			setLabelWidth(measureMaxLabelWidth(labels));
		}

		updateWidth();
		void document.fonts?.ready.then(updateWidth);
		window.addEventListener("resize", updateWidth);

		return () => window.removeEventListener("resize", updateWidth);
	}, [labelKey]);

	return useMemo(
		() => ({ ["--contract-form-label-width" as string]: labelWidth }),
		[labelWidth],
	);
}

export function AlignedFormField({ label, labelId, align = "center", children }: AlignedFormFieldProps) {
	const className = align === "start"
		? "aligned-form-field aligned-form-field--start"
		: "aligned-form-field";
	const hasLabel = label.trim().length > 0;

	return (
		<div className={className}>
			<div
				id={hasLabel ? labelId : undefined}
				className="aligned-form-field__label"
				aria-hidden={hasLabel ? undefined : true}
			>
				{hasLabel ? <span className="aligned-form-field__label-text">{label}</span> : null}
			</div>
			<div className="aligned-form-field__control">{children}</div>
		</div>
	);
}
