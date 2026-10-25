export const TELECOM_FRAME_CONTRACT_TYPES = ["DEVELOPMENT", "SUPPORT", "UPDATE", "MAINTENANCE"] as const;
export type TelecomFrameContractType = (typeof TELECOM_FRAME_CONTRACT_TYPES)[number];

export const TELECOM_FRAME_STATUSES = ["ACTIVE", "SUSPENDED", "TERMINATED", "CANCELLED"] as const;
export type TelecomFrameStatus = (typeof TELECOM_FRAME_STATUSES)[number];

export interface TelecomFrameContractTypeRow {
	contractType: TelecomFrameContractType
	revenue: number | null
	manHours: number | null
}

export interface TelecomFramePenalty {
	initialGraceDays: number | null
	toleranceDays: number | null
	penaltyPercent: number | null
}

/** تاریخ‌ها رشته میلادی YYYY-MM-DD هستند (همان چیزی که RHFProDate ذخیره می‌کند). */
export interface TelecomFrameStatusRow {
	id?: number
	status: TelecomFrameStatus
	startDate: string
	endDateExclusive: string
	note: string
}

export function createEmptyTelecomFrameStatusRow(): TelecomFrameStatusRow {
	return { status: "ACTIVE", startDate: "", endDateExclusive: "", note: "" };
}

export function isTelecomFrameCode(code: string | null | undefined) {
	const normalized = typeof code === "string" ? code.trim().toLowerCase() : "";
	return normalized === "telecom_frame" || normalized === "telecom-frame";
}
