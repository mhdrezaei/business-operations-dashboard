import type { ContractApprovalField, ContractApprovalPayload } from "../../api/contracts.api";

export interface ContractApprovalDecision {
	/** `null` targets the main contract, otherwise the addendum row id. */
	addendumId: number | null
	field: ContractApprovalField
	value: boolean
}

/** Body of PATCH `/approve/`: the flag (and comment) of the main contract, or of a single addendum. */
export function buildContractApprovalPayload(decision: ContractApprovalDecision, comment: string): ContractApprovalPayload {
	const change = { [decision.field]: decision.value, comment: comment.trim() || undefined };
	return decision.addendumId === null
		? change
		: { addenda: [{ id: decision.addendumId, ...change }] };
}
