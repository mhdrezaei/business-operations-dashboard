import type { ServiceDto } from "#src/api/common/common.types";
import type { CompanyTypeOption } from "#src/api/user/types";
import type { AdminRolePermissionFlags } from "../../model/admin-roles.payload";
import type {
	AdminRoleContractExtraAction,
	AdminRoleDomainKey,
	AdminRolePermissionAction,
} from "../../model/admin-roles.schema";
import type {
	AdminRolePoliciesBulkUpsertPayload,
	AdminRolePolicyDto,
} from "../../model/admin-roles.types";

import { useAccess } from "#src/hooks";
import { cn } from "#src/utils/cn";
import { useQueries } from "@tanstack/react-query";
import { Button, Checkbox, Empty, Spin, Tabs, Typography } from "antd";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { buildAdminRolePoliciesPayload, isCompanyTypeScoped } from "../../model/admin-roles.payload";
import {
	adminRoleContractExtraActionValues,
	adminRolePermissionActions,
	adminRolePermissionActionValues,
	adminRolePermissionTabs,
	companyProfileCardOptions,
	isAdminRoleDomainKey,
} from "../../model/admin-roles.schema";
import { adminRoleServicesByDomainQuery } from "../../queries/admin-roles.queries";
import { AdminRoleCompanyTypesPanel } from "./AdminRoleCompanyTypesPanel";

type PermissionFlags = AdminRolePermissionFlags;
type DomainPermissionMap = Partial<Record<number, PermissionFlags>>;
type PermissionMatrix = Record<AdminRoleDomainKey, DomainPermissionMap>;
interface CompanyProfileCardGroup {
	key: string
	title: string
	cards: Array<{ code: string, label: string }>
}
interface InitialEditorState {
	permissionMatrix: PermissionMatrix
	selectedCompanyCards: string[]
	/** Company types picked per `domain:serviceId`; a missing key means "everything selectable". */
	companyTypesByKey: Record<string, string[]>
}

type GetPermittedCompanyTypes = (domain: string, action: AdminRolePermissionAction, serviceId: number) => CompanyTypeOption[];

interface CompanyTypesProps {
	options: CompanyTypeOption[]
	selected: string[]
	isRequired: boolean
	onChange: (nextKeys: string[]) => void
}

interface Props {
	initialAllowedServiceIds?: number[]
	initialPolicies?: AdminRolePolicyDto[]
	initialPoliciesLoading?: boolean
	onChange?: (payload: AdminRolePoliciesBulkUpsertPayload) => void
}

interface ServicePermissionCardProps {
	domain: AdminRoleDomainKey
	service: ServiceDto
	permissions: PermissionFlags
	/** Present for company-type scoped services once a CRUD action is enabled. */
	companyTypes?: CompanyTypesProps
	canGrantApproval: (serviceId: number, action: AdminRoleContractExtraAction) => boolean
	onToggleService: (domain: AdminRoleDomainKey, serviceId: number, checked: boolean) => void
	onToggleAction: (
		domain: AdminRoleDomainKey,
		serviceId: number,
		action: AdminRolePermissionAction | AdminRoleContractExtraAction,
		checked: boolean,
	) => void
}

const emptyPolicies: AdminRolePolicyDto[] = [];

const emptyServicesByDomain: Record<AdminRoleDomainKey, ServiceDto[]> = {
	contracts: [],
	performances: [],
	predictions: [],
	company_profile: [],
};

const defaultPermissionFlags: PermissionFlags = {
	view: false,
	create: false,
	update: false,
	delete: false,
	sign: false,
	business_approve: false,
};

/** Actions listed for a domain: contracts also carry the sign / business approval checkboxes. */
function getDomainActionValues(domain: AdminRoleDomainKey): Array<AdminRolePermissionAction | AdminRoleContractExtraAction> {
	return domain === "contracts"
		? [...adminRolePermissionActionValues, ...adminRoleContractExtraActionValues]
		: [...adminRolePermissionActionValues];
}

function companyTypesKey(domain: string, serviceId: number) {
	return `${domain}:${serviceId}`;
}

/** Types the signed-in admin may hand out for every enabled CRUD action (the backend rejects anything beyond that). */
function getSelectableCompanyTypes(
	getPermitted: GetPermittedCompanyTypes,
	domain: AdminRoleDomainKey,
	serviceId: number,
	flags: PermissionFlags | undefined,
): CompanyTypeOption[] {
	const [head = [], ...tail] = adminRolePermissionActionValues
		.filter(action => flags?.[action])
		.map(action => getPermitted(domain, action, serviceId));
	return head.filter(type => tail.every(list => list.some(item => item.key === type.key)));
}

function pickSelectedCompanyTypes(selectable: CompanyTypeOption[], picked: string[] | undefined): string[] {
	const keys = selectable.map(type => type.key);
	return picked ? keys.filter(key => picked.includes(key)) : keys;
}

const companyProfileCardGroups: CompanyProfileCardGroup[] = [
	{
		key: "basic",
		title: "کارت‌های پایه",
		cards: companyProfileCardOptions.slice(0, 4),
	},
	{
		key: "financial",
		title: "کارت‌های مالی",
		cards: companyProfileCardOptions.slice(4),
	},
];

function createPermissionFlags(enabled: boolean, domain: AdminRoleDomainKey): PermissionFlags {
	return {
		...defaultPermissionFlags,
		view: enabled,
		create: enabled,
		update: enabled,
		delete: enabled,
		sign: enabled && domain === "contracts",
		business_approve: enabled && domain === "contracts",
	};
}

function isAllActionsEnabled(permissions: PermissionFlags, domain: AdminRoleDomainKey): boolean {
	return getDomainActionValues(domain).every(action => permissions[action]);
}

function isSomeActionsEnabled(permissions: PermissionFlags, domain: AdminRoleDomainKey): boolean {
	return getDomainActionValues(domain).some(action => permissions[action]);
}

function buildPermissionMatrix(
	servicesByDomain: Record<AdminRoleDomainKey, ServiceDto[]>,
	initialAllowedServiceIds: number[],
): PermissionMatrix {
	return adminRolePermissionTabs.reduce((result, tab) => {
		const domainServices = servicesByDomain[tab.value] ?? [];

		result[tab.value] = domainServices.reduce<DomainPermissionMap>((domainResult, service) => {
			const isEnabled = initialAllowedServiceIds.includes(service.id);
			domainResult[service.id] = createPermissionFlags(isEnabled, tab.value);
			return domainResult;
		}, {});

		return result;
	}, {} as PermissionMatrix);
}

function normalizeCompanyVisibleCards(initialPolicies: AdminRolePolicyDto[]): string[] {
	const allowedCardCodes = new Set<string>(companyProfileCardOptions.map(card => card.code));
	const companyProfilePolicies = initialPolicies.filter(policy => policy.domain === "company_profile");

	if (companyProfilePolicies.length === 0) {
		return [];
	}

	const policyCards = Array.from(new Set(companyProfilePolicies.flatMap(policy => policy.company_visible_cards ?? [])));
	if (policyCards.includes("all")) {
		return companyProfileCardOptions.map(card => card.code);
	}

	return policyCards.filter(cardCode => allowedCardCodes.has(cardCode));
}

function buildInitialEditorState(
	servicesByDomain: Record<AdminRoleDomainKey, ServiceDto[]>,
	initialAllowedServiceIds: number[],
	initialPolicies: AdminRolePolicyDto[],
): InitialEditorState {
	if (initialPolicies.length === 0) {
		return {
			permissionMatrix: buildPermissionMatrix(servicesByDomain, initialAllowedServiceIds),
			selectedCompanyCards: [],
			companyTypesByKey: {},
		};
	}

	const permissionMatrix = buildPermissionMatrix(servicesByDomain, []);
	const companyTypesByKey: Record<string, string[]> = {};

	for (const policy of initialPolicies) {
		if (!isAdminRoleDomainKey(policy.domain)) {
			continue;
		}
		const domainPermissions = permissionMatrix[policy.domain] ?? {};
		domainPermissions[policy.service] = {
			view: policy.can_view,
			create: policy.can_create,
			update: policy.can_update,
			delete: policy.can_delete,
			sign: policy.can_sign,
			business_approve: policy.can_business_approve,
		};
		permissionMatrix[policy.domain] = domainPermissions;
		if (isCompanyTypeScoped(policy.service_code) && policy.company_types.length > 0) {
			companyTypesByKey[companyTypesKey(policy.domain, policy.service)] = policy.company_types;
		}
	}

	return {
		permissionMatrix,
		selectedCompanyCards: normalizeCompanyVisibleCards(initialPolicies),
		companyTypesByKey,
	};
}

function PermissionActionItem({
	action,
	checked,
	disabled = false,
	serviceName,
	onChange,
}: {
	action: { label: string, value: AdminRolePermissionAction | AdminRoleContractExtraAction }
	checked: boolean
	disabled?: boolean
	serviceName: string
	onChange: (checked: boolean) => void
}) {
	function handleChange(event: { target: { checked: boolean } }) {
		onChange(event.target.checked);
	}

	return (
		<label className="flex cursor-pointer items-center justify-between rounded-2xl border border-[var(--ant-color-border-secondary)] px-4 py-3">
			<span className="text-sm font-medium">{action.label}</span>
			<Checkbox
				checked={checked}
				disabled={disabled}
				onChange={handleChange}
				aria-label={`${action.label} برای ${serviceName}`}
			/>
		</label>
	);
}

function ServicePermissionCard({
	domain,
	service,
	permissions,
	companyTypes,
	canGrantApproval,
	onToggleService,
	onToggleAction,
}: ServicePermissionCardProps) {
	const { t } = useTranslation();
	const allChecked = isAllActionsEnabled(permissions, domain);
	const someChecked = isSomeActionsEnabled(permissions, domain);
	const approvalActions = [
		{ label: t("system.role.permissions.sign"), value: "sign" },
		{ label: t("system.role.permissions.businessApprove"), value: "business_approve" },
	] as const;

	function handleToggleAll(event: { target: { checked: boolean } }) {
		onToggleService(domain, service.id, event.target.checked);
	}

	function handleToggleAction(action: AdminRolePermissionAction | AdminRoleContractExtraAction) {
		return (checked: boolean) => {
			onToggleAction(domain, service.id, action, checked);
		};
	}

	return (
		<article className="rounded-3xl border border-[var(--ant-color-border-secondary)] bg-[var(--ant-color-bg-container)] p-4">
			<header className="mb-4 flex items-start justify-between gap-4 [direction:ltr]">
				<div className="[direction:rtl]">
					<Checkbox
						checked={allChecked}
						indeterminate={!allChecked && someChecked}
						onChange={handleToggleAll}
					>
						<span className="text-sm font-medium">همه</span>
					</Checkbox>
				</div>

				<div className="text-right [direction:rtl]">
					<Typography.Title level={5} className="m-0">
						{service.name}
					</Typography.Title>
					<Typography.Text type="secondary">{service.code}</Typography.Text>
				</div>
			</header>

			<fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-2">
				<legend className="sr-only">{`مجوزهای سرویس ${service.name}`}</legend>
				{adminRolePermissionActions.map(action => (
					<PermissionActionItem
						key={`${service.id}-${action.value}`}
						action={action}
						checked={permissions[action.value]}
						serviceName={service.name}
						onChange={handleToggleAction(action.value)}
					/>
				))}
				{domain === "contracts"
					? approvalActions.map(action => (
						<PermissionActionItem
							key={`${service.id}-${action.value}`}
							action={action}
							checked={permissions[action.value]}
							disabled={!canGrantApproval(service.id, action.value)}
							serviceName={service.name}
							onChange={handleToggleAction(action.value)}
						/>
					))
					: null}
			</fieldset>

			{companyTypes ? <AdminRoleCompanyTypesPanel {...companyTypes} /> : null}
		</article>
	);
}

function PermissionDomainPanel({
	domain,
	services,
	permissions,
	getCompanyTypes,
	canGrantApproval,
	onToggleService,
	onToggleAction,
}: {
	domain: AdminRoleDomainKey
	services: ServiceDto[]
	permissions: DomainPermissionMap
	getCompanyTypes: (domain: AdminRoleDomainKey, service: ServiceDto) => CompanyTypesProps | undefined
	canGrantApproval: (serviceId: number, action: AdminRoleContractExtraAction) => boolean
	onToggleService: (domain: AdminRoleDomainKey, serviceId: number, checked: boolean) => void
	onToggleAction: (
		domain: AdminRoleDomainKey,
		serviceId: number,
		action: AdminRolePermissionAction | AdminRoleContractExtraAction,
		checked: boolean,
	) => void
}) {
	if (services.length === 0) {
		return <Empty description="سرویسی برای این بخش در دسترس نیست." />;
	}

	return (
		<div className="max-h-[420px] overflow-y-auto pl-1">
			<div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
				{services.map(service => (
					<ServicePermissionCard
						key={`${domain}-${service.id}`}
						domain={domain}
						service={service}
						permissions={permissions[service.id] ?? defaultPermissionFlags}
						companyTypes={getCompanyTypes(domain, service)}
						canGrantApproval={canGrantApproval}
						onToggleService={onToggleService}
						onToggleAction={onToggleAction}
					/>
				))}
			</div>
		</div>
	);
}

function CompanyProfileCardsPanel({
	selectedCards,
	onChange,
}: {
	selectedCards: string[]
	onChange: (nextValue: string[]) => void
}) {
	const totalCards = companyProfileCardGroups.reduce((sum, group) => sum + group.cards.length, 0);

	function toggleCard(cardCode: string) {
		if (selectedCards.includes(cardCode)) {
			onChange(selectedCards.filter(item => item !== cardCode));
			return;
		}

		onChange([...selectedCards, cardCode]);
	}

	function selectGroupCards(cardCodes: string[]) {
		onChange(Array.from(new Set([...selectedCards, ...cardCodes])));
	}

	function clearGroupCards(cardCodes: string[]) {
		onChange(selectedCards.filter(item => !cardCodes.includes(item)));
	}

	return (
		<section className="rounded-[28px] border border-[var(--ant-color-border-secondary)] bg-[var(--ant-color-bg-container)] p-5">
			<header className="mb-5 flex flex-wrap items-start justify-between gap-3">
				<div className="text-right">
					<Typography.Title level={4} className="m-0">
						کارت‌های قابل نمایش در صفحه پروفایل شرکت
					</Typography.Title>
					<Typography.Text type="secondary">
						این تنظیم برای همه سرویس‌های پروفایل شرکت به‌صورت مشترک اعمال می‌شود.
					</Typography.Text>
				</div>

				<div className="rounded-2xl bg-[var(--ant-color-fill-tertiary)] px-4 py-2 text-sm font-medium">
					{`${selectedCards.length} / ${totalCards} انتخاب شده`}
				</div>
			</header>

			<div className="space-y-4">
				{companyProfileCardGroups.map((group) => {
					const groupCardCodes = group.cards.map(card => card.code);

					return (
						<section key={group.key} className="rounded-3xl border border-[var(--ant-color-border-secondary)] p-4">
							<header className="mb-4 flex flex-wrap items-center justify-between gap-3">
								<h3 className="m-0 text-base font-bold">{group.title}</h3>

								<div className="flex flex-wrap gap-2">
									<Button
										type="default"
										size="middle"
										className={cn("!rounded-2xl !border-emerald-600 !text-emerald-600")}
										onClick={() => selectGroupCards(groupCardCodes)}
									>
										انتخاب همه
									</Button>
									<Button
										danger
										size="middle"
										className="!rounded-2xl"
										onClick={() => clearGroupCards(groupCardCodes)}
									>
										حذف همه
									</Button>
								</div>
							</header>

							<div className="grid grid-cols-1 gap-3 xl:grid-cols-4">
								{group.cards.map(card => (
									<label
										key={card.code}
										className="flex cursor-pointer items-center justify-between rounded-2xl border border-[var(--ant-color-border-secondary)] px-4 py-3"
									>
										<span className="text-sm font-medium">{card.label}</span>
										<Checkbox
											checked={selectedCards.includes(card.code)}
											onChange={() => toggleCard(card.code)}
											aria-label={card.label}
										/>
									</label>
								))}
							</div>
						</section>
					);
				})}
			</div>
		</section>
	);
}

export function AdminRolePermissionsEditor({
	initialAllowedServiceIds = [],
	initialPolicies = emptyPolicies,
	initialPoliciesLoading = false,
	onChange,
}: Props) {
	const [activeDomain, setActiveDomain] = useState<AdminRoleDomainKey>("contracts");
	const [selectedCompanyCards, setSelectedCompanyCards] = useState<string[]>([]);

	const [companyTypesByKey, setCompanyTypesByKey] = useState<Record<string, string[]>>({});

	const { getPermittedCompanyTypes, hasDomainPermissionByServiceId } = useAccess();
	// kept in a ref: the access helpers are recreated on every render and must not retrigger the payload effect
	const getPermittedCompanyTypesRef = useRef(getPermittedCompanyTypes);
	getPermittedCompanyTypesRef.current = getPermittedCompanyTypes;

	const serviceQueries = useQueries({
		queries: adminRolePermissionTabs.map(tab => adminRoleServicesByDomainQuery(tab.value)),
	});

	const isLoadingServices = serviceQueries.some(query => query.isLoading);
	const allowedServiceIdsSignature = initialAllowedServiceIds.join(",");
	const initialPoliciesSignature = [...initialPolicies]
		.sort((left, right) => {
			const leftKey = `${left.domain}:${left.service}`;
			const rightKey = `${right.domain}:${right.service}`;
			return leftKey.localeCompare(rightKey);
		})
		.map(policy => (
			`${policy.domain}:${policy.service}:${Number(policy.can_view)}:${Number(policy.can_create)}:${Number(policy.can_update)}:${Number(policy.can_delete)}:${policy.company_visible_cards.join(",")}`
		))
		.join("|");
	const serviceQuerySignature = serviceQueries
		.map((query, index) => {
			const domainKey = adminRolePermissionTabs[index]?.value ?? "";
			const ids = (query.data?.results ?? []).map(service => service.id).join(",");
			return `${domainKey}:${query.dataUpdatedAt}:${ids}`;
		})
		.join("|");

	const servicesByDomain = useMemo(() => {
		return adminRolePermissionTabs.reduce((result, tab, index) => {
			result[tab.value] = serviceQueries[index]?.data?.results ?? [];
			return result;
		}, { ...emptyServicesByDomain });
	}, [serviceQuerySignature]);

	const initialEditorState = useMemo(
		() => buildInitialEditorState(servicesByDomain, initialAllowedServiceIds, initialPolicies),
		[allowedServiceIdsSignature, initialPoliciesSignature, serviceQuerySignature],
	);

	const [permissionMatrix, setPermissionMatrix] = useState<PermissionMatrix>(() => initialEditorState.permissionMatrix);

	useEffect(() => {
		setPermissionMatrix(initialEditorState.permissionMatrix);
		setSelectedCompanyCards(initialEditorState.selectedCompanyCards);
		setCompanyTypesByKey(initialEditorState.companyTypesByKey);
	}, [initialEditorState]);

	useEffect(() => {
		const currentPayload = buildAdminRolePoliciesPayload({
			servicesByDomain,
			permissionMatrix,
			selectedCompanyCards,
			initialPolicies,
			getSelectedCompanyTypes: (domain, serviceId, flags) => pickSelectedCompanyTypes(
				getSelectableCompanyTypes(getPermittedCompanyTypesRef.current, domain, serviceId, flags),
				companyTypesByKey[companyTypesKey(domain, serviceId)],
			),
		});

		onChange?.(currentPayload);
	}, [onChange, permissionMatrix, selectedCompanyCards, companyTypesByKey, servicesByDomain, initialPolicies]);

	function getCompanyTypes(domain: AdminRoleDomainKey, service: ServiceDto): CompanyTypesProps | undefined {
		const flags = permissionMatrix[domain]?.[service.id];
		const isRequired = adminRolePermissionActionValues.some(action => flags?.[action]);
		if (!isCompanyTypeScoped(service.code) || !isRequired) {
			return undefined;
		}

		const options = getSelectableCompanyTypes(getPermittedCompanyTypes, domain, service.id, flags);
		const key = companyTypesKey(domain, service.id);
		return {
			options,
			selected: pickSelectedCompanyTypes(options, companyTypesByKey[key]),
			isRequired,
			onChange: nextKeys => setCompanyTypesByKey(current => ({ ...current, [key]: nextKeys })),
		};
	}

	// non-full admins can only hand out the approvals they hold themselves
	function canGrantApproval(serviceId: number, action: AdminRoleContractExtraAction) {
		return hasDomainPermissionByServiceId("contracts", action, serviceId);
	}

	function handleTabChange(key: string) {
		const nextDomain = adminRolePermissionTabs.find(tab => tab.value === key)?.value;
		if (nextDomain) {
			setActiveDomain(nextDomain);
		}
	}

	function updateServicePermissions(
		domain: AdminRoleDomainKey,
		serviceId: number,
		updater: (current: PermissionFlags) => PermissionFlags,
	) {
		setPermissionMatrix((current) => {
			const currentDomain = current[domain] ?? {};
			const currentFlags = currentDomain[serviceId] ?? defaultPermissionFlags;

			return {
				...current,
				[domain]: {
					...currentDomain,
					[serviceId]: updater(currentFlags),
				},
			};
		});
	}

	function handleToggleService(domain: AdminRoleDomainKey, serviceId: number, checked: boolean) {
		updateServicePermissions(domain, serviceId, () => createPermissionFlags(checked, domain));
	}

	function handleToggleAction(
		domain: AdminRoleDomainKey,
		serviceId: number,
		action: AdminRolePermissionAction | AdminRoleContractExtraAction,
		checked: boolean,
	) {
		updateServicePermissions(domain, serviceId, current => ({
			...current,
			[action]: checked,
		}));
	}

	function setWholeDomainPermissions(checked: boolean) {
		const domainServices = servicesByDomain[activeDomain] ?? [];

		setPermissionMatrix(current => ({
			...current,
			[activeDomain]: domainServices.reduce<DomainPermissionMap>((result, service) => {
				result[service.id] = createPermissionFlags(checked, activeDomain);
				return result;
			}, {}),
		}));
	}

	function handleSelectAllDomain() {
		setWholeDomainPermissions(true);
	}

	function handleClearAllDomain() {
		setWholeDomainPermissions(false);
	}

	const tabItems = adminRolePermissionTabs.map(tab => ({
		key: tab.value,
		label: tab.label,
	}));

	return (
		<section className="rounded-[28px] border border-[var(--ant-color-border-secondary)] bg-[var(--ant-color-bg-container)] p-5">
			<Spin spinning={isLoadingServices || initialPoliciesLoading}>
				<Tabs
					activeKey={activeDomain}
					onChange={handleTabChange}
					items={tabItems}
					tabBarGutter={12}
				/>

				<div className="mb-4 flex flex-wrap gap-2">
					<Button
						type="default"
						size="middle"
						className={cn("!rounded-2xl !border-emerald-600 !text-emerald-600")}
						onClick={handleSelectAllDomain}
					>
						انتخاب همه سرویس‌های این بخش
					</Button>
					<Button
						danger
						size="middle"
						className="!rounded-2xl"
						onClick={handleClearAllDomain}
					>
						پاک‌سازی همه سرویس‌های این بخش
					</Button>
				</div>

				<PermissionDomainPanel
					domain={activeDomain}
					services={servicesByDomain[activeDomain] ?? []}
					permissions={permissionMatrix[activeDomain] ?? {}}
					getCompanyTypes={getCompanyTypes}
					canGrantApproval={canGrantApproval}
					onToggleService={handleToggleService}
					onToggleAction={handleToggleAction}
				/>

				{activeDomain === "company_profile"
					? (
						<div className="mt-5">
							<CompanyProfileCardsPanel
								selectedCards={selectedCompanyCards}
								onChange={setSelectedCompanyCards}
							/>
						</div>
					)
					: null}
			</Spin>
		</section>
	);
}
