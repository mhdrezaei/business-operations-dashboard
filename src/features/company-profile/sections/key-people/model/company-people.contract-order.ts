import type { CompanyPersonDto } from "./company-people.types";
import { CONTRACT_ORDER_MAX } from "../../../shared/utils/contract-order";
import { COMPANY_PERSON_ROLE_OPTIONS } from "./company-people.constants";

function getRoleLabel(role: string) {
	return COMPANY_PERSON_ROLE_OPTIONS.find(option => option.value === role)?.label ?? role;
}

export function getPersonSlotIndex(person: Pick<CompanyPersonDto, "role_slot_index" | "contract_order">) {
	const index = person.role_slot_index ?? person.contract_order;
	return index != null && index > 0 ? index : null;
}

export function getNextContractOrder(people: CompanyPersonDto[], role: string) {
	return people.filter(item => item.role === role && getPersonSlotIndex(item) != null).length + 1;
}

export function getAddToContractError(people: CompanyPersonDto[], person: CompanyPersonDto) {
	const roleLabel = getRoleLabel(person.role);
	const nextOrder = getNextContractOrder(people, person.role);

	if (nextOrder > CONTRACT_ORDER_MAX)
		return `حداکثر ${CONTRACT_ORDER_MAX} مورد از نقش «${roleLabel}» می‌توانند در قرارداد نمایش داده شوند.`;

	const hasConflict = people.some(item => item.id !== person.id && item.role === person.role && getPersonSlotIndex(item) === nextOrder);
	return hasConflict
		? `شماره ${nextOrder} برای نقش «${roleLabel}» قبلاً استفاده شده است. شماره قرارداد اشخاص به تفکیک نقش محاسبه می‌شود.`
		: null;
}
