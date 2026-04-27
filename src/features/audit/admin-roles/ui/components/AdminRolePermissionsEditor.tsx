import type { ServiceDto } from "#src/api/common/common.types";
import type {
	AdminRoleDomainKey,
	AdminRolePermissionAction,
} from "../../model/admin-roles.schema";
import type {
	AdminRolePoliciesBulkUpsertPayload,
	AdminRolePolicyDto,
	AdminRolePolicyUpsertItem,
} from "../../model/admin-roles.types";

import { cn } from "#src/utils/cn";
import { useQueries } from "@tanstack/react-query";
import { Button, Checkbox, Empty, Spin, Tabs, Typography } from "antd";
import React, { useEffect, useMemo, useState } from "react";

import {
	adminRolePermissionActions,
	adminRolePermissionTabs,
	companyProfileCardOptions,
	trafficCompanyTypes,
} from "../../model/admin-roles.schema";
import { adminRoleServicesByDomainQuery } from "../../queries/admin-roles.queries";

type PermissionFlags = Record<AdminRolePermissionAction, boolean>;
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
	onToggleService: (domain: AdminRoleDomainKey, serviceId: number, checked: boolean) => void
	onToggleAction: (
		domain: AdminRoleDomainKey,
		serviceId: number,
		action: AdminRolePermissionAction,
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
};

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

function createPermissionFlags(enabled: boolean): PermissionFlags {
	return {
		view: enabled,
		create: enabled,
		update: enabled,
		delete: enabled,
	};
}

function isAllActionsEnabled(permissions: PermissionFlags): boolean {
	return adminRolePermissionActions.every(action => permissions[action.value]);
}

function isSomeActionsEnabled(permissions: PermissionFlags): boolean {
	return adminRolePermissionActions.some(action => permissions[action.value]);
}

function buildPermissionMatrix(
	servicesByDomain: Record<AdminRoleDomainKey, ServiceDto[]>,
	initialAllowedServiceIds: number[],
): PermissionMatrix {
	return adminRolePermissionTabs.reduce((result, tab) => {
		const domainServices = servicesByDomain[tab.value] ?? [];

		result[tab.value] = domainServices.reduce<DomainPermissionMap>((domainResult, service) => {
			const isEnabled = initialAllowedServiceIds.includes(service.id);
			domainResult[service.id] = createPermissionFlags(isEnabled);
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
		};
	}

	const permissionMatrix = buildPermissionMatrix(servicesByDomain, []);

	for (const policy of initialPolicies) {
		const domainPermissions = permissionMatrix[policy.domain] ?? {};
		domainPermissions[policy.service] = {
			view: policy.can_view,
			create: policy.can_create,
			update: policy.can_update,
			delete: policy.can_delete,
		};
		permissionMatrix[policy.domain] = domainPermissions;
	}

	return {
		permissionMatrix,
		selectedCompanyCards: normalizeCompanyVisibleCards(initialPolicies),
	};
}

function buildPoliciesPayload(
	servicesByDomain: Record<AdminRoleDomainKey, ServiceDto[]>,
	permissionMatrix: PermissionMatrix,
	selectedCompanyCards: string[],
): AdminRolePoliciesBulkUpsertPayload {
	const allCompanyCardCodes = companyProfileCardOptions.map(card => card.code);
	const normalizedCompanyCards = selectedCompanyCards.length === allCompanyCardCodes.length
		? ["all"]
		: selectedCompanyCards;

	const items = adminRolePermissionTabs.flatMap((tab) => {
		const domain = tab.value;
		const services = servicesByDomain[domain] ?? [];

		return services.flatMap<AdminRolePolicyUpsertItem>((service) => {
			const permissions = permissionMatrix[domain]?.[service.id];

			if (!permissions || !isSomeActionsEnabled(permissions)) {
				return [];
			}

			const item: AdminRolePolicyUpsertItem = {
				service: service.id,
				domain,
				can_view: permissions.view,
				can_create: permissions.create,
				can_update: permissions.update,
				can_delete: permissions.delete,
			};

			if (service.code === "traffic") {
				item.traffic_company_types = [...trafficCompanyTypes];
			}

			if (domain === "company_profile") {
				item.company_visible_cards = normalizedCompanyCards;
			}

			return [item];
		});
	});

	return { items };
}

function PermissionActionItem({
	action,
	checked,
	serviceName,
	onChange,
}: {
	action: { label: string, value: AdminRolePermissionAction }
	checked: boolean
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
	onToggleService,
	onToggleAction,
}: ServicePermissionCardProps) {
	const allChecked = isAllActionsEnabled(permissions);
	const someChecked = isSomeActionsEnabled(permissions);

	function handleToggleAll(event: { target: { checked: boolean } }) {
		onToggleService(domain, service.id, event.target.checked);
	}

	function handleToggleAction(action: AdminRolePermissionAction) {
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
			</fieldset>
		</article>
	);
}

function PermissionDomainPanel({
	domain,
	services,
	permissions,
	onToggleService,
	onToggleAction,
}: {
	domain: AdminRoleDomainKey
	services: ServiceDto[]
	permissions: DomainPermissionMap
	onToggleService: (domain: AdminRoleDomainKey, serviceId: number, checked: boolean) => void
	onToggleAction: (
		domain: AdminRoleDomainKey,
		serviceId: number,
		action: AdminRolePermissionAction,
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
	}, [initialEditorState]);

	useEffect(() => {
		onChange?.(buildPoliciesPayload(servicesByDomain, permissionMatrix, selectedCompanyCards));
	}, [onChange, permissionMatrix, selectedCompanyCards, servicesByDomain]);

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
		updateServicePermissions(domain, serviceId, () => createPermissionFlags(checked));
	}

	function handleToggleAction(
		domain: AdminRoleDomainKey,
		serviceId: number,
		action: AdminRolePermissionAction,
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
				result[service.id] = createPermissionFlags(checked);
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
