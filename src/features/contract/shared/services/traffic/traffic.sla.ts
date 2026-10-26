export const TRAFFIC_COLLOCATION_SLAS = ["DIAMOND", "GOLD", "BRONZE"] as const;

export type TrafficCollocationSla = typeof TRAFFIC_COLLOCATION_SLAS[number];

/** بک‌اند SLA را شیء `{id, name, ...}` برمی‌گرداند؛ فرم فقط کد enum را نگه می‌دارد. */
export function slaCodeFromDto(value: unknown): TrafficCollocationSla | null {
	const code = String(value != null && typeof value === "object" ? (value as { id?: unknown }).id ?? "" : value ?? "").trim().toUpperCase();
	return (TRAFFIC_COLLOCATION_SLAS as readonly string[]).includes(code) ? code as TrafficCollocationSla : null;
}
