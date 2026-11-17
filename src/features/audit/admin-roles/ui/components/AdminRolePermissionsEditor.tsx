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

import { buildAdminRolePoliciesPayload, companyTypesKey, isCompanyTypeScoped, setGrantableFlags, withoutCompanyTypeSelections } from "../../model/admin-roles.payload";
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

type CanGrantAction = (domain: AdminRoleDomainKey, serviceId: number, action: AdminRolePermissionAction | AdminRoleContractExtraAction) => boolean;

type GetPermittedCompanyTypes = (domain: string, action: AdminRolePermissionAction, serviceId: number) => CompanyTypeOption[];

interface CompanyTypesProps {
	options: CompanyTypeOption[]
	selected: string[]
	lockedTypes: string[]
	isRequired: boolean
	onChange: (nextKeys: string[]) => void
}

interface Props {
	initialAllowedServiceIds?: number[]
	initialPolicies?: AdminRolePolicyDto[]
	initialPoliciesLoading?: boolean
	/** `isDirty` is true when the matrix differs from the one the role was loaded with. */
	onChange?: (payload: AdminRolePoliciesBulkUpsertPayload, isDirty: boolean) => void
}

interface ServicePermissionCardProps {
	domain: AdminRoleDomainKey
	service: ServiceDto
	permissions: PermissionFlags
	/** Present for company-type scoped services once a CRUD action is enabled. */
	companyTypes?: CompanyTypesProps
	canGrantAction: CanGrantAction
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
	contract_template: [],
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

/** Types the role already holds that the signed-in admin cannot grant: shown disabled and kept on save. */
function getLockedCompanyTypes(selectable: CompanyTypeOption[], saved: string[] | undefined): string[] {
	return (saved ?? []).filter(key => !selectable.some(type => type.key === key));
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
	canGrantAction,
	onToggleService,
	onToggleAction,
}: ServicePermissionCardProps) {
	const { t } = useTranslation();
	const grantableActions = getDomainActionValues(domain).filter(action => canGrantAction(domain, service.id, action));
	const allChecked = grantableActions.length > 0 && grantableActions.every(action => permissions[action]);
	const someChecked = grantableActions.some(action => permissions[action]);
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
						disabled={grantableActions.length === 0}
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
						disabled={!canGrantAction(domain, service.id, action.value)}
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
							disabled={!canGrantAction(domain, service.id, action.value)}
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
	canGrantAction,
	onToggleService,
	onToggleAction,
}: {
	domain: AdminRoleDomainKey
	services: ServiceDto[]
	permissions: DomainPermissionMap
	getCompanyTypes: (domain: AdminRoleDomainKey, service: ServiceDto) => CompanyTypesProps | undefined
	canGrantAction: CanGrantAction
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
		<div>
			<div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
				{services.map(service => (
					<ServicePermissionCard
						key={`${domain}-${service.id}`}
						domain={domain}
						service={service}
						permissions={permissions[service.id] ?? defaultPermissionFlags}
						companyTypes={getCompanyTypes(domain, service)}
						canGrantAction={canGrantAction}
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

	const { getPermittedCompanyTypes, hasDomainPermissionByServiceId, isFullAdmin } = useAccess();
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
			`${policy.domain}:${policy.service}:${Number(policy.can_view)}:${Number(policy.can_create)}:${Number(policy.can_update)}:${Number(policy.can_delete)}:${Number(policy.can_sign)}:${Number(policy.can_business_approve)}:${policy.company_visible_cards.join(",")}:${policy.company_types.join(",")}`
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
		const buildPayload = (matrix: PermissionMatrix, cards: string[], companyTypes: Record<string, string[]>) => buildAdminRolePoliciesPayload({
			servicesByDomain,
			permissionMatrix: matrix,
			selectedCompanyCards: cards,
			getSelectedCompanyTypes: (domain, serviceId, flags) => {
				const selectable = getSelectableCompanyTypes(getPermittedCompanyTypesRef.current, domain, serviceId, flags);
				const saved = companyTypes[companyTypesKey(domain, serviceId)];
				return [...pickSelectedCompanyTypes(selectable, saved), ...getLockedCompanyTypes(selectable, saved)];
			},
		});

		const currentPayload = buildPayload(permissionMatrix, selectedCompanyCards, companyTypesByKey);
		const { permissionMatrix: baseMatrix, selectedCompanyCards: baseCards, companyTypesByKey: baseCompanyTypes } = initialEditorState;
		const isDirty = JSON.stringify(currentPayload) !== JSON.stringify(buildPayload(baseMatrix, baseCards, baseCompanyTypes));

		onChange?.(currentPayload, isDirty);
	}, [onChange, permissionMatrix, selectedCompanyCards, companyTypesByKey, servicesByDomain, initialEditorState]);

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
			lockedTypes: getLockedCompanyTypes(options, companyTypesByKey[key]),
			isRequired,
			onChange: nextKeys => setCompanyTypesByKey(current => ({ ...current, [key]: nextKeys })),
		};
	}

	// non-full admins can only hand out the permissions they hold themselves
	const canGrantAction: CanGrantAction = (domain, serviceId, action) =>
		isFullAdmin || hasDomainPermissionByServiceId(domain, action, serviceId);

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
		setCompanyTypesByKey(current => withoutCompanyTypeSelections(current, domain, [serviceId]));
		updateServicePermissions(domain, serviceId, current => setGrantableFlags(current, checked, domain, action => canGrantAction(domain, serviceId, action)));
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

		setCompanyTypesByKey(current => withoutCompanyTypeSelections(current, activeDomain, domainServices.map(service => service.id)));
		setPermissionMatrix(current => ({
			...current,
			[activeDomain]: domainServices.reduce<DomainPermissionMap>((result, service) => {
				result[service.id] = setGrantableFlags(
					current[activeDomain]?.[service.id] ?? defaultPermissionFlags,
					checked,
					activeDomain,
					action => canGrantAction(activeDomain, service.id, action),
				);
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
		<section className="flex min-h-0 flex-1 flex-col rounded-3xl border border-[var(--ant-color-border-secondary)] bg-[var(--ant-color-bg-container)] p-4">
			<div className="shrink-0">
				<Tabs
					activeKey={activeDomain}
					onChange={handleTabChange}
					items={tabItems}
					tabBarGutter={12}
					className="[&_.ant-tabs-nav]:!mb-3"
				/>

				<div className="mb-3 flex flex-wrap gap-2">
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
			</div>

			{isLoadingServices || initialPoliciesLoading
				? <div className="flex flex-1 items-center justify-center"><Spin /></div>
				: (
					<div className="min-h-0 flex-1 space-y-4 overflow-y-auto pe-1">
						<PermissionDomainPanel
							domain={activeDomain}
							services={servicesByDomain[activeDomain] ?? []}
							permissions={permissionMatrix[activeDomain] ?? {}}
							getCompanyTypes={getCompanyTypes}
							canGrantAction={canGrantAction}
							onToggleService={handleToggleService}
							onToggleAction={handleToggleAction}
						/>

						{activeDomain === "company_profile"
							? (
								<CompanyProfileCardsPanel
									selectedCards={selectedCompanyCards}
									onChange={setSelectedCompanyCards}
								/>
							)
							: null}
					</div>
				)}
		</section>
	);
}
