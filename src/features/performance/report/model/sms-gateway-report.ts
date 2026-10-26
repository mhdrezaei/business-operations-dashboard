import type { SmsGatewayTrafficReportFilters, SmsOperatorCode, SmsOperatorInvoice } from "#src/features/performance/api/performances.api";
import type { Dayjs } from "#src/shared/lib/dayjs-jalali";
import type { SortOrder } from "antd/es/table/interface";
import type { TFunction } from "i18next";

export const TRAFFIC_OPERATOR_CODES = ["MCI", "MTN", "RTL", "RIGHTEL", "UNKNOWN_OPERATOR"];

export const TRAFFIC_PAGE_SIZE_OPTIONS = [20, 50, 100];

export const OPERATOR_INVOICE_CODES: SmsOperatorCode[] = ["MCI", "IRANCELL", "RIGHTEL"];

export function trafficOperatorLabel(t: TFunction, operator: string) {
	return t(`performance.smsGatewayPages.operators.${operator}`, { defaultValue: operator });
}

export function toOperatorOptions<Code extends string>(t: TFunction, codes: Code[]) {
	return codes.map(value => ({ label: trafficOperatorLabel(t, value), value }));
}

// Delivery statuses come from the gateway and are not a fixed set (DELIVRD/DELIVERED...), so classify by substring.
const DELIVERED_HINTS = ["DELIVR", "DELIVERED"];
const FAILED_HINTS = ["FAIL", "EXPIR", "UNDELIV", "REJECT"];
const PENDING_HINTS = ["PEND"];

export function trafficStatusColor(status: string | null | undefined) {
	const normalized = String(status ?? "").toUpperCase();
	if (FAILED_HINTS.some(hint => normalized.includes(hint)))
		return "error";
	if (DELIVERED_HINTS.some(hint => normalized.includes(hint)))
		return "success";
	if (PENDING_HINTS.some(hint => normalized.includes(hint)))
		return "warning";
	return "default";
}

export interface TrafficReportFormFilters {
	dateFrom: Dayjs | null
	dateTo: Dayjs | null
	companyId?: number
	operator?: string
	deliveryStatusId?: number
}

// The backend expects Gregorian YYYY-MM-DD, while the date pickers are Jalali.
function toGregorianDateOnly(value: Dayjs | null) {
	if (!value)
		return undefined;
	const date = value.toDate();
	const pad = (part: number) => String(part).padStart(2, "0");
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function buildTrafficReportPayload(filters: TrafficReportFormFilters): SmsGatewayTrafficReportFilters {
	return {
		date_from: toGregorianDateOnly(filters.dateFrom),
		date_to: toGregorianDateOnly(filters.dateTo),
		company_id: filters.companyId,
		operator: filters.operator,
		delivery_status_id: filters.deliveryStatusId,
	};
}

export function areTrafficFiltersEqual(a: SmsGatewayTrafficReportFilters | null, b: SmsGatewayTrafficReportFilters | null) {
	return JSON.stringify(a) === JSON.stringify(b);
}

/** Years offered by the operator-invoice forms: 1404 up to the current Jalali year + 5. */
export function getInvoiceYears(currentJalaliYear: number) {
	return Array.from({ length: Math.max(currentJalaliYear + 5 - 1404 + 1, 1) }, (_, index) => 1404 + index);
}

export function formatNullableNumber(value: number | null | undefined, format: (value: number) => string) {
	return value == null ? "—" : format(value);
}

/** Registered invoice minus the internal system; null when no invoice is registered. */
export function getInvoiceDifference(invoiceValue: number | null | undefined, internalValue: number | null | undefined) {
	return invoiceValue == null ? null : Number(invoiceValue) - Number(internalValue ?? 0);
}

export function getDifferenceTextType(difference: number) {
	if (difference === 0)
		return "success";
	return difference > 0 ? "warning" : "danger";
}

export function formatInvoiceDifference(difference: number | null, format: (value: number) => string) {
	if (difference == null)
		return "—";
	if (difference === 0)
		return format(0);
	return `${difference > 0 ? "+" : "−"}${format(Math.abs(difference))}`;
}

/** Operators already invoiced for a month; `excludeId` ignores the record being edited. */
export function getTakenOperators(invoices: SmsOperatorInvoice[], year: number | undefined, month: number | undefined, excludeId?: number) {
	return new Set(invoices
		.filter(item => item.id !== excludeId && item.sh_year === year && item.sh_month === month)
		.map(item => item.operator));
}

export function isMonthFullyInvoiced(invoices: SmsOperatorInvoice[], year: number, month: number, excludeId?: number) {
	return getTakenOperators(invoices, year, month, excludeId).size >= OPERATOR_INVOICE_CODES.length;
}

export function getNextFreeOperator(taken: Set<SmsOperatorCode>) {
	return OPERATOR_INVOICE_CODES.find(code => !taken.has(code));
}

type InvoiceSortKey = "sh_year" | "sh_month" | "operator";

/** Client-side ordering: year/month descending, operator ascending, unless the table sorts by a column. */
export function sortOperatorInvoices(invoices: SmsOperatorInvoice[], sort: Record<string, SortOrder> = {}) {
	const [field, order] = Object.entries(sort).find(([, value]) => value) as [InvoiceSortKey, SortOrder] | undefined ?? [];
	const compare = (a: SmsOperatorInvoice, b: SmsOperatorInvoice) => {
		if (b.sh_year !== a.sh_year)
			return b.sh_year - a.sh_year;
		if (b.sh_month !== a.sh_month)
			return b.sh_month - a.sh_month;
		return String(a.operator).localeCompare(String(b.operator));
	};
	if (!field)
		return [...invoices].sort(compare);
	const direction = order === "descend" ? -1 : 1;
	return [...invoices].sort((a, b) => {
		const left = a[field];
		const right = b[field];
		const result = typeof left === "number" && typeof right === "number" ? left - right : String(left).localeCompare(String(right));
		return result * direction || compare(a, b);
	});
}
