import type { AdminRoleContractExtraAction, AdminRoleDomainKey, AdminRolePermissionAction } from "./admin-roles.schema";
import type {
	AdminRolePoliciesBulkUpsertPayload,
	AdminRolePolicyUpsertItem,
} from "./admin-roles.types";

import { adminRoleContractExtraActionValues, adminRolePermissionActionValues, adminRolePermissionTabs, companyProfileCardOptions } from "./admin-roles.schema";

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
	/** Company types picked in the editor for a company-type scoped service. */
	getSelectedCompanyTypes: (domain: AdminRoleDomainKey, serviceId: number, flags: AdminRolePermissionFlags) => string[]
}

/**
 * Sets (or clears) every action the signed-in admin may grant and leaves the rest as they are,
 * so "select all" never turns on a permission the admin does not hold themselves.
 */
export function setGrantableFlags(
	current: AdminRolePermissionFlags,
	enabled: boolean,
	domain: AdminRoleDomainKey,
	canGrant: (action: AdminRolePermissionAction | AdminRoleContractExtraAction) => boolean,
): AdminRolePermissionFlags {
	const actions = domain === "contracts"
		? [...adminRolePermissionActionValues, ...adminRoleContractExtraActionValues]
		: adminRolePermissionActionValues;

	return actions.reduce<AdminRolePermissionFlags>(
		(flags, action) => (canGrant(action) ? { ...flags, [action]: enabled } : flags),
		{ ...current },
	);
}

export function companyTypesKey(domain: string, serviceId: number) {
	return `${domain}:${serviceId}`;
}

/** Drops the picked company types of the given services, so they fall back to "everything selectable". */
export function withoutCompanyTypeSelections(
	selections: Record<string, string[]>,
	domain: AdminRoleDomainKey,
	serviceIds: number[],
): Record<string, string[]> {
	const dropped = new Set(serviceIds.map(serviceId => companyTypesKey(domain, serviceId)));
	return Object.fromEntries(Object.entries(selections).filter(([key]) => !dropped.has(key)));
}

export function isCompanyTypeScoped(serviceCode: string) {
	return COMPANY_TYPE_SCOPED_SERVICE_CODES.has(serviceCode.trim().toLowerCase());
}

/** The bulk-upsert replaces every policy of the role, so the payload always carries the whole editor matrix. */
export function buildAdminRolePoliciesPayload({
	servicesByDomain,
	permissionMatrix,
	selectedCompanyCards,
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

	return { items: editorItems };
}
