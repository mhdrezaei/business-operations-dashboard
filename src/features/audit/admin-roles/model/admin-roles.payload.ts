import type { AdminRoleContractExtraAction, AdminRoleDomainKey, AdminRolePermissionAction } from "./admin-roles.schema";
import type {
	AdminRolePoliciesBulkUpsertPayload,
	AdminRolePolicyDto,
	AdminRolePolicyUpsertItem,
} from "./admin-roles.types";

import { adminRoleContractExtraActionValues, adminRolePermissionActionValues, adminRolePermissionTabs, companyProfileCardOptions, isAdminRoleDomainKey } from "./admin-roles.schema";

const COMPANY_TYPE_SCOPED_SERVICE_CODES = new Set(["traffic", "sms", "psp", "telecom_frame", "sales_agency"]);

export type AdminRolePermissionFlags = Record<AdminRolePermissionAction | AdminRoleContractExtraAction, boolean>;

interface EditorService {
	id: number
	code: string
}

interface BuildAdminRolePoliciesPayloadOptions {
	servicesByDomain: Record<AdminRoleDomainKey, EditorService[]>
	permissionMatrix: Record<AdminRoleDomainKey, Partial<Record<number, AdminRolePermissionFlags>>>
	selectedCompanyCards: string[]
	/** Policies loaded for the role being edited (empty when creating). */
	initialPolicies: AdminRolePolicyDto[]
	/** Company types picked in the editor for a company-type scoped service. */
	getSelectedCompanyTypes: (domain: AdminRoleDomainKey, serviceId: number, flags: AdminRolePermissionFlags) => string[]
}

export function isCompanyTypeScoped(serviceCode: string) {
	return COMPANY_TYPE_SCOPED_SERVICE_CODES.has(serviceCode.trim().toLowerCase());
}

function toUpsertItem(policy: AdminRolePolicyDto): AdminRolePolicyUpsertItem {
	return {
		service: policy.service,
		domain: policy.domain,
		can_view: policy.can_view,
		can_create: policy.can_create,
		can_update: policy.can_update,
		can_delete: policy.can_delete,
		can_sign: policy.can_sign,
		can_business_approve: policy.can_business_approve,
		...(isCompanyTypeScoped(policy.service_code) ? { company_types: policy.company_types } : {}),
	};
}

/**
 * The bulk-upsert replaces every policy of the role, so the `contract_template` domain, which the editor
 * does not expose, is carried over from the loaded policies instead of being silently reset.
 */
export function buildAdminRolePoliciesPayload({
	servicesByDomain,
	permissionMatrix,
	selectedCompanyCards,
	initialPolicies,
	getSelectedCompanyTypes,
}: BuildAdminRolePoliciesPayloadOptions): AdminRolePoliciesBulkUpsertPayload {
	const allCompanyCardCodes = companyProfileCardOptions.map(card => card.code);
	const companyCards = selectedCompanyCards.length === allCompanyCardCodes.length ? ["all"] : selectedCompanyCards;

	const editorItems = adminRolePermissionTabs.flatMap((tab) => {
		const domain = tab.value;

		return (servicesByDomain[domain] ?? []).flatMap<AdminRolePolicyUpsertItem>((service) => {
			const permissions = permissionMatrix[domain]?.[service.id];

			if (!permissions || ![...adminRolePermissionActionValues, ...adminRoleContractExtraActionValues].some(action => permissions[action])) {
				return [];
			}

			const item: AdminRolePolicyUpsertItem = {
				service: service.id,
				domain,
				can_view: permissions.view,
				can_create: permissions.create,
				can_update: permissions.update,
				can_delete: permissions.delete,
				can_sign: domain === "contracts" && permissions.sign,
				can_business_approve: domain === "contracts" && permissions.business_approve,
			};

			if (isCompanyTypeScoped(service.code)) {
				item.company_types = getSelectedCompanyTypes(domain, service.id, permissions);
			}

			if (domain === "company_profile") {
				item.company_visible_cards = companyCards;
			}

			return [item];
		});
	});

	const carriedItems = initialPolicies
		.filter(policy => !isAdminRoleDomainKey(policy.domain))
		.map(toUpsertItem);

	return { items: [...editorItems, ...carriedItems] };
}
