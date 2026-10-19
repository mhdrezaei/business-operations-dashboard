import { formatPercent, toNum } from "#src/features/dashboard/model/format";

interface GrowthBadgeProps {
	value: unknown
	/** Cost: growth is bad. */
	inverse?: boolean
	title?: string
}

/** Positive green, negative red (reversed for cost); null → neutral "—". */
export function GrowthBadge({ value, inverse = false, title }: GrowthBadgeProps) {
	const n = toNum(value);
	if (n === null)
		return <span title={title} className="text-[12px] text-colorTextTertiary">—</span>;
	const good = inverse ? n < 0 : n > 0;
	const color = n === 0 ? "text-colorTextTertiary" : good ? "text-success" : "text-error";
	return (
		<span title={title} className={`inline-flex items-center gap-1 text-[12px] whitespace-nowrap ${color}`}>
			{n === 0 ? "" : n > 0 ? "▲" : "▼"}
			<span dir="ltr">{formatPercent(Math.abs(n))}</span>
		</span>
	);
}
