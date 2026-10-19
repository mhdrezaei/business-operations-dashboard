import type {
	ContractApprovalField,
	ContractApprovalHistorySubjectDto,
	ContractServicePath,
} from "../../api/contracts.api";

/** Traffic company types whose unofficial contracts cannot be approved through the approve endpoint. */
const UNOFFICIAL_BLOCKED_TRAFFIC_COMPANY_TYPES = new Set(["IXP", "CP", "TCI", "PREMIUM"]);

export interface ContractApprovalPolicyContext {
	service: ContractServicePath
	/** Normalized company type token (e.g. "IXP"). */
	companyType?: string | null
	isOfficial?: boolean | null
}

export interface ContractApprovalActionState {
	disabled: boolean
	/** Why the action is unavailable. Empty when the state is simply "already applied". */
	reason?: string
}

/**
 * Mirrors the backend approve rules so the UI can disable actions up front
 * instead of waiting for a 403/400 response.
 */
export class ContractApprovalPolicy {
	constructor(private readonly context: ContractApprovalPolicyContext) {}

	get isUnofficialBlocked() {
		if (this.context.isOfficial !== false)
			return false;
		if (this.context.service === "sms/client")
			return true;
		const companyType = String(this.context.companyType ?? "").toUpperCase();
		return this.context.service === "traffic" && UNOFFICIAL_BLOCKED_TRAFFIC_COMPANY_TYPES.has(companyType);
	}

	getActionState(
		subject: ContractApprovalHistorySubjectDto,
		field: ContractApprovalField,
		value: boolean,
		isRealSigned: boolean,
	): ContractApprovalActionState {
		if (isRealSigned)
			return { disabled: true, reason: "این مورد با امضای واقعی قفل شده است." };
		if (this.isUnofficialBlocked)
			return { disabled: true, reason: "این قرارداد غیررسمی است و تأیید برای آن مجاز نیست." };
		if (subject[field] === value)
			return { disabled: true };
		if (field === "is_signed" && value && subject.is_business_approved !== true)
			return { disabled: true, reason: "ابتدا باید تأیید تجاری انجام شود." };
		if (field === "is_business_approved" && !value && subject.is_signed === true)
			return { disabled: true, reason: "ابتدا باید تأیید اداره قراردادها لغو شود." };
		return { disabled: false };
	}
}
