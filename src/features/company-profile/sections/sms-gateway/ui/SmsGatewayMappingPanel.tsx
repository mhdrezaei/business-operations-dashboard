import type { ServiceDto } from "#src/api/common/common.types";
import type { CSSProperties } from "react";
import type { SmsGatewayCustomerDto, SmsGatewayMappingPayload } from "../model/sms-gateway.types";
import { useAccess } from "#src/hooks";
import { SectionCard } from "#src/shared/ui/section-card";
import {
	CheckCircleFilled,
	DeleteOutlined,
	LinkOutlined,
	ReloadOutlined,
	SaveOutlined,
	SearchOutlined,
	WarningFilled,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Alert,
	App,
	Button,
	Empty,
	Input,
	Select,
	Skeleton,
	Spin,
	Tag,
	theme,
} from "antd";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router";
import { createSmsGatewayMapping, deleteSmsGatewayMapping, updateSmsGatewayMapping } from "../api/sms-gateway.api";
import {
	findGatewayCustomerByName,
	getOtherGatewayCustomerNames,
	isGatewayUnavailableError,
} from "../model/sms-gateway.helpers";
import {
	smsGatewayCompaniesQuery,
	smsGatewayCustomersQuery,
	smsGatewayMappingsByCustomerQuery,
} from "../queries/sms-gateway.queries";
import "#src/shared/ui/form-layout/styles.css";
import "./sms-gateway-mapping.css";

const SMS_SERVICE_CODES = new Set(["sms", "sms-commission", "sms_commission"]);

interface SmsGatewayMappingPanelProps {
	services: ServiceDto[]
	initialServiceId: number | null
}

function normalizeServiceCode(code: unknown) {
	return String(code ?? "").trim().toLowerCase();
}

export default function SmsGatewayMappingPanel({ services, initialServiceId }: SmsGatewayMappingPanelProps) {
	const { token } = theme.useToken();
	const { modal } = App.useApp();
	const queryClient = useQueryClient();
	const { state: locationState } = useLocation() as { state: { gatewayCustomerSearch?: string } | null };
	const deepLinkCustomerName = locationState?.gatewayCustomerSearch ?? "";
	const lockedRetryRef = useRef(false);
	const [search, setSearch] = useState(deepLinkCustomerName);
	const [pickedCustomerId, setPickedCustomerId] = useState<number | null | undefined>(undefined);
	const [serviceId, setServiceId] = useState<number | null>(initialServiceId);
	const [companyId, setCompanyId] = useState<number | null>(null);

	const customersQuery = useQuery(smsGatewayCustomersQuery());
	const selectedCustomerId = pickedCustomerId !== undefined
		? pickedCustomerId
		: findGatewayCustomerByName(customersQuery.data ?? [], deepLinkCustomerName)?.id ?? null;
	const selectedCustomer = useMemo(
		() => customersQuery.data?.find(customer => customer.id === selectedCustomerId) ?? null,
		[customersQuery.data, selectedCustomerId],
	);
	const customerMappingsQuery = useQuery(smsGatewayMappingsByCustomerQuery(selectedCustomerId));
	const selectedCustomerMapping = customerMappingsQuery.data?.find(
		mapping => mapping.gateway_customer_id === selectedCustomerId,
	) ?? null;
	const mappedServiceId = selectedCustomerMapping?.service ?? null;
	const effectiveServiceId = selectedCustomer?.is_mapped ? mappedServiceId ?? serviceId : serviceId;
	const effectiveCompanyId = companyId ?? (selectedCustomer?.is_mapped ? selectedCustomer.mapped_company_id : null);
	const isLocked = !!selectedCustomer?.is_mapped && customerMappingsQuery.isSuccess && !selectedCustomerMapping;
	const isRetryingLocked = isLocked && customerMappingsQuery.isFetching;
	const companiesQuery = useQuery(smsGatewayCompaniesQuery(effectiveServiceId));

	useEffect(() => {
		if (!isLocked) {
			lockedRetryRef.current = false;
			return;
		}
		if (lockedRetryRef.current || customerMappingsQuery.isFetching)
			return;

		lockedRetryRef.current = true;
		void customerMappingsQuery.refetch();
	}, [isLocked, customerMappingsQuery]);

	const { hasDomainPermissionByServiceId } = useAccess();
	const canCreateMapping = hasDomainPermissionByServiceId("company_profile", "create", effectiveServiceId);
	const canDeleteMapping = hasDomainPermissionByServiceId("company_profile", "delete", effectiveServiceId);

	const smsServices = useMemo(
		() => services.filter(service => SMS_SERVICE_CODES.has(normalizeServiceCode(service.code))),
		[services],
	);

	const filteredCustomers = useMemo(() => {
		const normalizedSearch = search.trim().toLocaleLowerCase("fa");
		if (!normalizedSearch)
			return customersQuery.data ?? [];

		return (customersQuery.data ?? []).filter((customer) => {
			const matchesCustomer = customer.value.toLocaleLowerCase("fa").includes(normalizedSearch);
			const matchesCompany = customer.mapped_company_name?.toLocaleLowerCase("fa").includes(normalizedSearch);
			return matchesCustomer || matchesCompany;
		});
	}, [customersQuery.data, search]);

	const companyOptions = useMemo(
		() => (companiesQuery.data?.results ?? []).map(company => ({ label: company.name, value: company.id })),
		[companiesQuery.data],
	);

	const otherGatewayNames = useMemo(() => {
		return getOtherGatewayCustomerNames(
			customersQuery.data ?? [],
			effectiveCompanyId,
			selectedCustomerId,
		);
	}, [customersQuery.data, effectiveCompanyId, selectedCustomerId]);

	async function refreshGatewayData() {
		await Promise.all([
			queryClient.invalidateQueries({ queryKey: ["sms-gateway", "customers"] }),
			queryClient.invalidateQueries({ queryKey: ["sms-gateway", "mappings"] }),
		]);
	}

	const createMutation = useMutation({
		mutationFn: createSmsGatewayMapping,
		onSuccess: async () => {
			window.$notification?.success({ message: "مپینگ ثبت شد" });
			await refreshGatewayData();
		},
		onError: () => window.$message?.error("ثبت مپینگ انجام نشد؛ دوباره تلاش کنید"),
	});

	const updateMutation = useMutation({
		mutationFn: ({ id, ...payload }: { id: number } & SmsGatewayMappingPayload) => updateSmsGatewayMapping(id, payload),
		onSuccess: async () => {
			window.$notification?.success({ message: "مپینگ ویرایش شد" });
			setCompanyId(null);
			await refreshGatewayData();
		},
		onError: () => window.$message?.error("ویرایش مپینگ انجام نشد؛ دوباره تلاش کنید"),
	});

	const deleteMutation = useMutation({
		mutationFn: deleteSmsGatewayMapping,
		onSuccess: async () => {
			window.$message?.success("مپینگ با موفقیت حذف شد");
			setCompanyId(null);
			await refreshGatewayData();
		},
		onError: () => window.$message?.error("حذف مپینگ انجام نشد؛ دوباره تلاش کنید"),
	});

	function handleCreate() {
		if (!selectedCustomerId || !companyId || selectedCustomer?.is_mapped)
			return;

		if (!canCreateMapping) {
			window.$message?.warning("دسترسی ثبت مپینگ را ندارید.");
			return;
		}

		createMutation.mutate({ company: companyId, gateway_customer_id: selectedCustomerId });
	}

	function handleUpdate() {
		if (!selectedCustomerMapping || !companyId || companyId === selectedCustomer?.mapped_company_id)
			return;

		updateMutation.mutate({ id: selectedCustomerMapping.id, company: companyId, gateway_customer_id: selectedCustomerMapping.gateway_customer_id });
	}

	function handleCustomerSelect(customerId: number) {
		setPickedCustomerId(customerId);
		setCompanyId(null);
	}

	function handleDelete() {
		const mapping = selectedCustomerMapping;
		if (!mapping) {
			window.$message?.error("شناسه مپینگ پیدا نشد؛ فهرست را به‌روزرسانی کنید");
			return;
		}

		if (!canDeleteMapping) {
			window.$message?.warning("دسترسی حذف مپینگ را ندارید.");
			return;
		}

		modal.confirm({
			title: "حذف مپینگ",
			content: `ارتباط «${selectedCustomer?.value ?? "مشتری Gateway"}» با «${mapping.company_name}» حذف شود؟`,
			okText: "حذف مپینگ",
			cancelText: "انصراف",
			okButtonProps: { danger: true },
			onOk: () => deleteMutation.mutateAsync(mapping.id),
		});
	}

	const style = {
		"--sms-gateway-surface": token.colorBgLayout,
		"--sms-gateway-control": token.colorBgContainer,
		"--sms-gateway-border": token.colorSplit,
		"--sms-gateway-text": token.colorText,
		"--sms-gateway-text-secondary": token.colorTextSecondary,
		"--sms-gateway-primary": token.colorPrimary,
		"--sms-gateway-primary-bg": token.colorPrimaryBg,
		"--sms-gateway-success": token.colorSuccess,
		"--sms-gateway-success-bg": token.colorSuccessBg,
		"--sms-gateway-warning": token.colorWarning,
		"--sms-gateway-warning-bg": token.colorWarningBg,
		"--sms-gateway-warning-text": token.colorWarningText,
		"--sms-gateway-radius": `${token.borderRadiusLG}px`,
		"--sms-gateway-gap": `${token.marginLG}px`,
	} as CSSProperties;

	return (
		<section className="sms-gateway company-profile-sections" style={style} aria-label="مپینگ SMS Gateway">
			<div className="sms-gateway__workspace">
				<CustomerListCard
					customers={filteredCustomers}
					total={customersQuery.data?.length ?? 0}
					search={search}
					selectedCustomerId={selectedCustomerId}
					isLoading={customersQuery.isLoading}
					isError={customersQuery.isError}
					isGatewayUnavailable={isGatewayUnavailableError(customersQuery.error)}
					onSearch={setSearch}
					onSelect={handleCustomerSelect}
					onRetry={() => void customersQuery.refetch()}
				/>

				<SectionCard
					className="company-profile-section company-profile-section--contact sms-gateway__mapping-section"
					tone="geekblue"
					title={isLocked ? "وضعیت مپینگ" : selectedCustomer?.is_mapped ? "مدیریت مپینگ" : "مپ کردن شرکت"}
				>
					{!selectedCustomer
						? (
							<Empty
								image={Empty.PRESENTED_IMAGE_SIMPLE}
								description="از فهرست، یک مشتری Gateway را انتخاب کنید."
							/>
						)
						: isRetryingLocked
							? <div className="sms-gateway__form" aria-busy="true"><Spin tip="در حال دریافت اطلاعات…"><div /></Spin></div>
							: isLocked
								? (
									<div className="sms-gateway__form">
										<Alert
											type="info"
											showIcon
											message={`«${selectedCustomer.value}» قبلاً به شرکت «${selectedCustomer.mapped_company_name ?? `#${selectedCustomer.mapped_company_id}`}» مپ شده است.`}
											description={<Button size="small" onClick={() => void customerMappingsQuery.refetch()}>تلاش دوباره</Button>}
										/>
										<div className="sms-gateway__actions">
											<Button type="text" onClick={() => setPickedCustomerId(null)}>انصراف</Button>
										</div>
									</div>
								)
								: (
									<div className="sms-gateway__form">
										<div className="sms-gateway__selected-customer">
											<SmsGatewayDashedBorder />
											<span>مشتری Gateway</span>
											<strong>{selectedCustomer.value}</strong>
										</div>

										<label className="sms-gateway__field">
											<span>نام سرویس</span>
											<Select
												value={effectiveServiceId}
												onChange={(value) => {
													setServiceId(value);
													setCompanyId(null);
												}}
												options={smsServices.map(service => ({ label: service.name, value: service.id }))}
												placeholder="سرویس را انتخاب کنید"
												disabled={selectedCustomer.is_mapped}
												aria-label="نام سرویس"
											/>
										</label>

										<label className="sms-gateway__field">
											<span>شرکت</span>
											<Select
												showSearch
												optionFilterProp="label"
												value={effectiveCompanyId}
												onChange={setCompanyId}
												options={companyOptions}
												loading={companiesQuery.isLoading}
												placeholder={effectiveServiceId ? "شرکت را انتخاب کنید" : "ابتدا سرویس را انتخاب کنید"}
												disabled={!effectiveServiceId || (selectedCustomer.is_mapped && !selectedCustomerMapping)}
												aria-label="شرکت"
												notFoundContent={companiesQuery.isLoading ? <Spin size="small" /> : "شرکتی یافت نشد"}
											/>
										</label>

										{otherGatewayNames.length > 0 && (
											<div className="sms-gateway__related-mappings" role="status">
												<WarningFilled aria-hidden="true" />
												<span>
													این شرکت به
													{" "}
													<strong>{otherGatewayNames.join("، ")}</strong>
													{" "}
													هم متصل است.
												</span>
											</div>
										)}

										<div className="sms-gateway__actions">
											{selectedCustomer.is_mapped
												? (
													<>
														<Button
															type="primary"
															icon={<SaveOutlined />}
															loading={updateMutation.isPending}
															disabled={!selectedCustomerMapping || !companyId || companyId === selectedCustomer.mapped_company_id}
															onClick={handleUpdate}
														>
															ذخیره تغییرات
														</Button>
														{canDeleteMapping ? (
															<Button
																danger
																icon={<DeleteOutlined />}
																loading={deleteMutation.isPending}
																disabled={!selectedCustomerMapping}
																onClick={handleDelete}
															>
																حذف مپینگ
															</Button>
														) : null}
													</>
												)
												: (canCreateMapping ? (
													<Button
														type="primary"
														icon={<LinkOutlined />}
														loading={createMutation.isPending}
														disabled={!serviceId || !companyId}
														onClick={handleCreate}
													>
														ثبت مپینگ
													</Button>
												) : null)}
											<Button type="text" onClick={() => setPickedCustomerId(null)}>انصراف</Button>
										</div>
									</div>
								)}
				</SectionCard>
			</div>
		</section>
	);
}

interface CustomerListCardProps {
	customers: SmsGatewayCustomerDto[]
	total: number
	search: string
	selectedCustomerId: number | null
	isLoading: boolean
	isError: boolean
	isGatewayUnavailable: boolean
	onSearch: (value: string) => void
	onSelect: (id: number) => void
	onRetry: () => void
}

function CustomerListCard({
	customers,
	total,
	search,
	selectedCustomerId,
	isLoading,
	isError,
	isGatewayUnavailable,
	onSearch,
	onSelect,
	onRetry,
}: CustomerListCardProps) {
	return (
		<SectionCard
			className="company-profile-section company-profile-section--general sms-gateway__customers-section"
			tone="primary"
			title={`مشتریان Gateway (${total})`}
			extra={(
				<Button
					type="text"
					size="small"
					icon={<ReloadOutlined spin={isLoading} />}
					aria-label="به‌روزرسانی مشتریان Gateway"
					onClick={onRetry}
				/>
			)}
		>
			<Input
				allowClear
				prefix={<SearchOutlined />}
				value={search}
				onChange={event => onSearch(event.target.value)}
				placeholder="جست‌وجوی مشتری یا شرکت مپ‌شده..."
				aria-label="جست‌وجوی مشتری Gateway"
			/>

			<div className="sms-gateway__customer-list" role="listbox" aria-label="مشتریان Gateway">
				{isLoading && <Skeleton active paragraph={{ rows: 6 }} />}
				{isError && (
					<Alert
						type="error"
						showIcon
						message={isGatewayUnavailable ? "سامانه Gateway در دسترس نیست (خطای ۵۰۲). لطفاً بعداً تلاش کنید." : "دریافت مشتریان Gateway ناموفق بود"}
						description={<Button size="small" onClick={onRetry}>تلاش دوباره</Button>}
					/>
				)}
				{!isLoading && !isError && customers.length === 0 && (
					<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="مشتری‌ای با این عبارت پیدا نشد." />
				)}
				{!isLoading && !isError && customers.map(customer => (
					<button
						type="button"
						role="option"
						aria-selected={selectedCustomerId === customer.id}
						key={customer.id}
						className={`sms-gateway__customer${customer.is_mapped ? " sms-gateway__customer--mapped" : ""}${selectedCustomerId === customer.id ? " sms-gateway__customer--selected" : ""}`}
						onClick={() => onSelect(customer.id)}
					>
						<SmsGatewayDashedBorder />
						<span className="sms-gateway__customer-copy">
							<strong>{customer.value}</strong>
							<small>{customer.is_mapped ? customer.mapped_company_name : "مپ نشده"}</small>
						</span>
						{customer.is_mapped
							? <Tag color="success" icon={<CheckCircleFilled />}>مپ شده</Tag>
							: <Tag>مپ نشده</Tag>}
					</button>
				))}
			</div>
		</SectionCard>
	);
}

function SmsGatewayDashedBorder() {
	const { token } = theme.useToken();
	const borderWidth = token.lineWidth;
	const dashLength = token.sizeXS - token.lineWidthBold;
	const dashGap = token.paddingXXS;
	const radius = token.borderRadius;

	return (
		<svg className="sms-gateway__dashed-border" aria-hidden="true">
			<rect
				x={borderWidth / 2}
				y={borderWidth / 2}
				width={`calc(100% - ${borderWidth}px)`}
				height={`calc(100% - ${borderWidth}px)`}
				rx={Math.max(0, radius - borderWidth / 2)}
				fill="none"
				stroke="currentColor"
				strokeWidth={borderWidth}
				strokeDasharray={`${dashLength} ${dashGap}`}
			/>
		</svg>
	);
}
