import type { ContractApprovalHistoryEntryDto } from "../../../api/contracts.api";
import { dayjs } from "#src/shared/lib/dayjs-jalali";
import { toPersianDigits } from "#src/utils/formated";

export function formatHistoryDate(value: string) {
	const date = dayjs(value);
	return toPersianDigits(date.isValid() ? date.format("YYYY/MM/DD - HH:mm") : value);
}

export type ContractHistoryStatus = "approved" | "rejected" | "removed" | "undecided";

/** «تأیید قرارداد» (is_signed) has no rejection: a false/null entry means the earlier approval was removed. */
export function getHistoryStatus(entry: Pick<ContractApprovalHistoryEntryDto, "field_name" | "new_value">): ContractHistoryStatus {
	if (entry.new_value === true)
		return "approved";
	if (entry.field_name === "is_signed")
		return "removed";
	return entry.new_value === false ? "rejected" : "undecided";
}
