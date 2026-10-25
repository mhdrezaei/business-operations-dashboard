import type { Row } from "#src/features/contract/shared/utils/value-coercion";
import { asRows, toNumberOrNull, toStringOrNull } from "#src/features/contract/shared/utils/value-coercion";

export function mapTelecomFrameContractTypes(rows: unknown) {
	return asRows(rows)
		.filter(row => row.contractType)
		.map(row => ({
			contract_type: row.contractType,
			revenue: toStringOrNull(row.revenue) ?? "",
			man_hours: toNumberOrNull(row.manHours) ?? 0,
		}));
}

function mapTelecomFramePenalty(serviceFields: Row) {
	if (serviceFields.hasPenalty !== true || serviceFields.penalty == null)
		return null;
	const penalty = serviceFields.penalty as Row;
	return {
		initial_grace_days: Number(penalty.initialGraceDays),
		tolerance_days: Number(penalty.toleranceDays),
		penalty_percent: toStringOrNull(penalty.penaltyPercent) ?? "",
	};
}

function mapTelecomFrameStatusTimeline(rows: Row[]) {
	return rows
		.filter(row => row.startDate && row.endDateExclusive)
		.map(row => ({
			...(toNumberOrNull(row.id) != null ? { id: Number(row.id) } : {}),
			status: row.status,
			start_date: row.startDate,
			end_date_exclusive: row.endDateExclusive,
			note: row.note ?? "",
		}));
}

/** در ایجاد امضا/تایید همیشه false است؛ در ویرایش اصلاً ارسال نمی‌شود تا وضعیت قبلی پاک نشود. */
function mapTelecomFrameSignature(mode: TelecomFrameMode) {
	return mode === "create" ? { is_signed: false, is_business_approved: false } : {};
}

type TelecomFrameMode = "create" | "edit";

/** فیلدهای مخصوص فریم مخابرات روی بدنهٔ قرارداد اصلی (company_type را بدنهٔ مشترک می‌گذارد). */
export function mapTelecomFramePayload(serviceFields: Row, mode: TelecomFrameMode = "create") {
	const statusTimeline = asRows(serviceFields.statusTimeline);
	return {
		...mapTelecomFrameSignature(mode),
		contract_types: mapTelecomFrameContractTypes(serviceFields.contractTypes),
		bo_person_ids: (Array.isArray(serviceFields.boPersonIds) ? serviceFields.boPersonIds : []).map(Number),
		po_person_ids: (Array.isArray(serviceFields.poPersonIds) ? serviceFields.poPersonIds : []).map(Number),
		penalty: mapTelecomFramePenalty(serviceFields),
		...(statusTimeline.length > 0 ? { status_timeline: mapTelecomFrameStatusTimeline(statusTimeline) } : {}),
		addenda: mapTelecomFrameAddenda(serviceFields.addenda, mode),
	};
}

/** الحاقیه‌های فریم مخابرات فقط بازه، شماره، توضیح و contract_types دارند. */
export function mapTelecomFrameAddenda(addenda: unknown, mode: TelecomFrameMode = "create"): Row[] {
	return asRows(addenda).map(row => ({
		start_jy: toNumberOrNull(row.startYear),
		start_jm: toNumberOrNull(row.startMonth),
		end_jy: toNumberOrNull(row.endYear),
		end_jm: toNumberOrNull(row.endMonth),
		note: row.description ?? "",
		...mapTelecomFrameSignature(mode),
		contract_number: row.contractNumber ?? "",
		contract_types: mapTelecomFrameContractTypes(row.contractTypes),
		children: mapTelecomFrameAddenda(row.children, mode),
	}));
}
