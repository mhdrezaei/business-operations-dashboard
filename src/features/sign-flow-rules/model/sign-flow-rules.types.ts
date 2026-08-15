export type RecipientTargetType = "USER" | "ROLE";

export interface SignFlowRecipient {
	target_type: RecipientTargetType
	user_id: number | null
	role_id: number | null
	username?: string | null
	role_name?: string | null
}

export interface SignFlowStep {
	order: number
	name: string
	recipients: SignFlowRecipient[]
}

export interface SignFlowBinding {
	service: string
	company_type: string
}

export interface SignFlowRule {
	id: number
	name: string
	description: string
	is_enabled: boolean
	steps: SignFlowStep[]
	bindings: SignFlowBinding[]
	created_at: string
	updated_at: string
}

export interface SignFlowRulePayload {
	name: string
	description: string
	is_enabled: boolean
	steps: SignFlowStep[]
}

export interface SignFlowRulesResponse {
	count: number
	next: string | null
	previous: string | null
	results: SignFlowRule[]
}
