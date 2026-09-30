const fs = require("node:fs");

let c = fs.readFileSync("src/features/contract/api/contracts.api.ts", "utf8");

const apiCode = `
export interface SignFlowListItem {
    id: number;
    state: string;
    service: string;
    service_name: string;
    company_type: any;
    contract_id: number;
    contract_number: string;
    company_name: string;
    addendum_group_id: string | null;
    record_type: string;
    template_id: number | null;
    template_name: string | null;
    rule_config_id: number;
    current_step_order: number;
    current_step_name: string;
    total_steps: number;
    contract_start_date: string;
    contract_end_date: string;
    is_waiting_for_me: boolean;
    started_at: string;
    finished_at: string | null;
    cancel_reason: string;
    created_by: number;
    created_by_username: string;
    created_at: string;
}

export function fetchSignFlowsList(params: {
    page?: number;
    page_size?: number;
    mine?: 'assigned' | 'created';
    state?: string;
    service?: string;
    record_type?: 'contract' | 'addendum';
    ordering?: string;
    company_type?: string;
    contract_id?: number;
}) {
    // Filter out null/undefined values to avoid passing them to searchParams
    const searchParams: Record<string, string> = {};
    for (const [key, value] of Object.entries(params)) {
        if (value != null && value !== "") {
            searchParams[key] = String(value);
        }
    }
    return request
        .get("contracts/sign-flows/", { searchParams })
        .json<PaginatedResult<SignFlowListItem>>();
}
`;

c += apiCode;
fs.writeFileSync("src/features/contract/api/contracts.api.ts", c);
