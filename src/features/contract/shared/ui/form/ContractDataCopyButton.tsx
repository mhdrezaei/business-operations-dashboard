import type { ContractFormValues } from "../../model/contract.form.types";
import { fetchCompaniesByService } from "#src/api/common/common.api";
import { contractDetailToFormValues } from "#src/features/contract/api/contract-detail.mappers";
import { fetchCompanyContracts, fetchContractDetail } from "#src/features/contract/api/contracts.api";
import { filterSelectableCompanyTypes } from "#src/features/contract/shared/model/company-type-options";
import { isCollocationCostContext, resolveContractServicePath } from "#src/features/contract/shared/model/contract-service-path";
import { collocationCostCompanyQuery } from "#src/features/contract/shared/queries/contract.queries";
import { isTelecomFrameCode } from "#src/features/contract/shared/services/telecom-frame/telecom-frame.types";
import { companyTypeMatches } from "#src/features/contract/shared/utils";
import { useAccess } from "#src/hooks";
import { i18n } from "#src/locales";
import { notification } from "#src/utils";
import { CopyOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button, Checkbox, Modal, Select, Spin } from "antd";
import { useMemo, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

function asNumber(value: unknown): number | null {
	if (value == null || value === "")
		return null;
	const number = typeof value === "number" ? value : Number(value);
	return Number.isFinite(number) ? number : null;
}

function dateLabel(value: unknown): string | null {
	if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(value))
		return null;
	const date = new Date(`${value.slice(0, 10)}T00:00:00Z`);
	if (Number.isNaN(date.getTime()))
		return null;
	return new Intl.DateTimeFormat("fa-IR-u-ca-persian", { dateStyle: "short", timeZone: "UTC" }).format(date);
}

function contractLabel(row: Record<string, any>) {
	const start = dateLabel(row.start_date ?? row.startDate) ?? `${String(row.start_jy ?? row.startYear ?? "—")}/${String(row.start_jm ?? row.startMonth ?? "—")}`;
	const endExclusive = row.end_date_exclusive ?? row.endDateExclusive;
	let end = dateLabel(endExclusive);
	if (end && endExclusive) {
		const date = new Date(`${String(endExclusive).slice(0, 10)}T00:00:00Z`);
		date.setUTCDate(date.getUTCDate() - 1);
		end = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { dateStyle: "short", timeZone: "UTC" }).format(date);
	}
	end ??= dateLabel(row.end_date ?? row.endDate) ?? `${String(row.end_jy ?? row.endYear ?? "—")}/${String(row.end_jm ?? row.endMonth ?? "—")}`;
	return i18n.t("contract.copy.rangeLabel", { start, end, interpolation: { escapeValue: false } });
}

function addendumOptions(addenda: unknown, depth = 0): Array<{ value: string, label: string }> {
	return (Array.isArray(addenda) ? addenda : []).flatMap((item, index) => {
		const row = (item ?? {}) as Record<string, any>;
		const id = asNumber(row.id);
		const number = row.display_addendum_number ?? row.displayAddendumNumber ?? row.contract_number ?? row.contractNumber ?? index + 1;
		return [
			...(id == null ? [] : [{ value: `addendum:${id}`, label: `${"— ".repeat(depth)}${i18n.t("contract.copy.addendumLabel", { number, interpolation: { escapeValue: false } })}` }]),
			...addendumOptions(row.children, depth + 1),
		];
	});
}

function findAddendum(addenda: unknown, id: number): Record<string, any> | null {
	for (const item of Array.isArray(addenda) ? addenda : []) {
		const row = (item ?? {}) as Record<string, any>;
		if (Number(row.id) === id)
			return row;
		const nested = findAddendum(row.children, id);
		if (nested)
			return nested;
	}
	return null;
}

const OMIT_FIELDS = new Set(["addenda", "agent", "isSigned", "isOfficial", "id", "children", "startYear", "startMonth", "endYear", "endMonth", "contractNumber", "description"]);
// فیلدهای مخصوص قرارداد اصلی که روی الحاقیه مقصد معنا ندارند
const ADDENDUM_TARGET_OMIT_FIELDS = new Set(["collocationPartnerType", "realStartYear", "realStartMonth", "displayAddendumNumber", "parentAddendumId", "fieldArrayId"]);
const MAIN_TARGET_PATH = "serviceFields";

function hasValue(value: unknown) {
	return value != null && value !== "";
}

/** منبع هزینه رک مخابرات (cost) یا دیتاسنترهای شرکای تجاری؛ اگر هیچ‌کدام تشخیص داده نشد null. */
function getCollocationSourceKind(source: Record<string, any>): "cost" | "partners" | null {
	if (hasValue(source.telecomRackCount) || hasValue(source.telecomMonthlyRackRent))
		return "cost";
	if (Array.isArray(source.datacenters) && source.datacenters.length > 0)
		return "partners";
	return null;
}

interface ContractDataCopyButtonProps {
	/** مسیر مقصد: قرارداد اصلی (serviceFields) یا مسیر یک الحاقیه */
	targetPath?: string
}

export function ContractDataCopyButton({ targetPath = MAIN_TARGET_PATH }: ContractDataCopyButtonProps) {
	const { t } = useTranslation();
	const isAddendumTarget = targetPath !== MAIN_TARGET_PATH;
	const { control, setValue } = useFormContext<ContractFormValues>();
	const { getPermittedCompanyTypes } = useAccess();
	const serviceId = useWatch({ control, name: "serviceId" });
	const companyId = useWatch({ control, name: "companyId" });
	const serviceCode = useWatch({ control, name: "serviceCode" });
	const companyType = useWatch<ContractFormValues, "companyType">({ control, name: "companyType" });
	const counterparty = useWatch({ control, name: "counterpartyType" });
	const path = resolveContractServicePath({ serviceCode, companyType, counterpartyType: counterparty });
	const [open, setOpen] = useState(false);
	const [confirming, setConfirming] = useState(false);
	const [otherCompany, setOtherCompany] = useState(false);
	const [sourceCompanyType, setSourceCompanyType] = useState<string | null>(null);
	const [sourceCompanyId, setSourceCompanyId] = useState<number | null>(null);
	const [contractId, setContractId] = useState<number | null>(null);
	const [part, setPart] = useState<string | null>(null);
	const [receiving, setReceiving] = useState(false);
	const normalizedServiceCode = String(serviceCode ?? "").trim().toLowerCase();
	const isSalesAgency = normalizedServiceCode === "sales_agency" || normalizedServiceCode === "sales-agency";
	const isTelecomFrame = isTelecomFrameCode(normalizedServiceCode);
	const hasSourceCompanyType = ["sms", "traffic", "psp"].includes(normalizedServiceCode) || isSalesAgency || isTelecomFrame;
	const sourceCompanyTypeLabel = isSalesAgency
		? t("contract.field.salesAgencyType")
		: normalizedServiceCode === "sms"
			? t("contract.field.smsCompanyType")
			: normalizedServiceCode === "traffic"
				? t("contract.field.trafficCompanyType")
				: isTelecomFrame ? t("contract.copy.telecomFrameCompanyType") : t("contract.field.pspCompanyType");
	const sourceCompanyLabel = isSalesAgency || normalizedServiceCode === "psp" ? t("contract.field.companyName") : t("contract.formLabel.companyName");
	const sourceCompanyTypeOptions = useMemo(() => {
		if (!hasSourceCompanyType || serviceId == null)
			return [];

		return filterSelectableCompanyTypes(serviceCode, getPermittedCompanyTypes("contracts", "create", serviceId))
			.map(item => ({ label: item.value, value: item.key }));
	}, [getPermittedCompanyTypes, hasSourceCompanyType, serviceCode, serviceId]);
	const sourcePath = resolveContractServicePath({ serviceCode, companyType: otherCompany ? sourceCompanyType : companyType, counterpartyType: counterparty });
	// SMS vendor شرکت ندارد و قرارداد هزینه رک مخابرات شرکت سراسری BE را دارد
	const isCostContext = isCollocationCostContext({ serviceCode, companyType, counterpartyType: counterparty });
	const companyOptional = path === "sms/vendor";
	const costCompany = useQuery({
		...collocationCostCompanyQuery(serviceId ?? 0),
		enabled: open && isCostContext && serviceId != null,
	});

	const companies = useQuery({
		queryKey: ["common", "companies", "contract-copy", serviceId ?? null, sourceCompanyType ?? null],
		queryFn: () => fetchCompaniesByService(serviceId!, { pageSize: 1000 }),
		enabled: open && otherCompany && serviceId != null && (!hasSourceCompanyType || sourceCompanyType != null),
	});
	const companyOptions = useMemo(
		() => (companies.data?.results ?? [])
			.filter(item => Number(item.id) !== Number(companyId))
			.filter((item) => {
				if (!hasSourceCompanyType || !sourceCompanyType)
					return !hasSourceCompanyType;
				return companyTypeMatches(item.company_type, sourceCompanyType);
			})
			.map(item => ({ label: item.name, value: Number(item.id) })),
		[companies.data, companyId, hasSourceCompanyType, sourceCompanyType],
	);
	const selectedCompanyType = otherCompany
		? sourceCompanyType
		: typeof companyType === "string" ? companyType : null;
	const resolvedCompanyId = otherCompany ? sourceCompanyId : companyId ?? (isCostContext ? costCompany.data ?? null : null);
	const contracts = useQuery({
		queryKey: ["contracts", "contract-copy", sourcePath, resolvedCompanyId ?? null, selectedCompanyType ?? null, serviceId ?? null],
		queryFn: () => fetchCompanyContracts(sourcePath!, resolvedCompanyId, selectedCompanyType, serviceId),
		enabled: open && sourcePath != null && (resolvedCompanyId != null || (!otherCompany && companyOptional)) && serviceId != null,
	});
	const detail = useQuery({
		queryKey: ["contracts", "contract-copy-detail", sourcePath, contractId ?? null],
		queryFn: () => fetchContractDetail(sourcePath!, contractId!),
		enabled: open && sourcePath != null && contractId != null,
	});
	const contractOptions = useMemo(
		() => (contracts.data?.results ?? []).map((row: any) => ({ value: Number(row.id), label: contractLabel(row) })),
		[contracts.data],
	);
	const partOptions = useMemo(() => [{ value: "main", label: t("contract.copy.mainContract") }, ...addendumOptions(detail.data?.addenda)], [detail.data, t]);

	async function receive() {
		if (contractId == null || part == null || sourcePath == null)
			return;
		setReceiving(true);
		try {
			const sourceDto = await fetchContractDetail(sourcePath, contractId);
			const normalized = contractDetailToFormValues(sourceDto, sourcePath);
			const source = part === "main"
				? normalized.serviceFields
				: findAddendum(normalized.serviceFields.addenda, Number(part.replace("addendum:", "")));
			if (!source) {
				notification.error({ message: t("contract.copy.sourcePartMissing"), placement: "topRight" });
				return;
			}
			const isCollocationTarget = String(companyType ?? "").trim().toUpperCase() === "COLLOCATION";
			const sourceKind = isCollocationTarget ? getCollocationSourceKind(source) : null;
			if (sourceKind != null && sourceKind !== (counterparty === "gov_ops" ? "cost" : "partners")) {
				notification.error({ message: t(`contract.copy.incompatible.${sourceKind}`), placement: "topRight" });
				return;
			}
			for (const [key, value] of Object.entries(source)) {
				// ردیف‌های تاریخچه وضعیت متعلق به قرارداد منبع‌اند؛ شناسه‌شان کپی نمی‌شود
				const copied = key === "statusTimeline" && Array.isArray(value) ? value.map(({ id: _id, ...row }) => row) : value;
				if (!OMIT_FIELDS.has(key) && !(isAddendumTarget && ADDENDUM_TARGET_OMIT_FIELDS.has(key)))
					setValue((`${targetPath}.${key}`) as any, copied as any, { shouldDirty: true, shouldValidate: true });
			}
			setOpen(false);
			setConfirming(false);
			setContractId(null);
			setPart(null);
			notification.success({ message: t("contract.copy.success"), placement: "topRight" });
		}
		catch {
			notification.error({ message: t("contract.copy.failure"), placement: "topRight" });
		}
		finally {
			setReceiving(false);
		}
	}

	function close() {
		setOpen(false);
		setSourceCompanyId(null);
		setContractId(null);
		setPart(null);
		setConfirming(false);
	}

	return (
		<>
			<div className="w-full">
				<Button
					icon={<CopyOutlined />}
					className="h-auto min-h-[var(--ant-control-height)] w-full whitespace-normal py-1.5 leading-snug"
					disabled={(companyId == null && !isCostContext && !companyOptional) || serviceId == null || path == null}
					onClick={() => setOpen(true)}
				>
					{t("contract.copy.openButton")}
				</Button>
			</div>
			<Modal
				open={open}
				title={t("contract.copy.openButton")}
				onCancel={close}
				onOk={() => setConfirming(true)}
				okText={t("contract.copy.receive")}
				cancelText={t("common.cancel")}
				okButtonProps={{ disabled: part == null || detail.isLoading }}
				destroyOnHidden
			>
				<div className="grid gap-4">
					<div className="text-textSecondary">{t("contract.copy.intro")}</div>
					<div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-yellow-700 backdrop-blur-md">{t("contract.copy.replaceNotice")}</div>
					<Checkbox
						checked={otherCompany}
						onChange={(event) => {
							setOtherCompany(event.target.checked);
							setSourceCompanyType(event.target.checked && typeof companyType === "string" ? companyType : null);
							setSourceCompanyId(null);
							setContractId(null);
							setPart(null);
						}}
					>
						{t("contract.copy.otherCompanies")}
					</Checkbox>
					{otherCompany
						? (
							<div className="grid gap-3">
								{hasSourceCompanyType
									? (
										<div className="grid gap-2">
											<div className="font-medium">{sourceCompanyTypeLabel}</div>
											<Select
												placeholder={t("contract.copy.selectCompanyType", { type: sourceCompanyTypeLabel })}
												value={sourceCompanyType ?? undefined}
												onChange={(value) => {
													setSourceCompanyType(value);
													setSourceCompanyId(null);
													setContractId(null);
													setPart(null);
												}}
												options={sourceCompanyTypeOptions}
											/>
										</div>
									)
									: null}
								<div className="grid gap-2">
									<div className="font-medium">{sourceCompanyLabel}</div>
									<Select
										showSearch
										optionFilterProp="label"
										placeholder={isSalesAgency || normalizedServiceCode === "psp" ? t("contract.copy.selectCompanyName") : t("contract.copy.selectSourceCompany")}
										value={sourceCompanyId ?? undefined}
										onChange={(id) => {
											setSourceCompanyId(id);
											setContractId(null);
											setPart(null);
										}}
										options={companyOptions}
										disabled={hasSourceCompanyType && sourceCompanyType == null}
										loading={companies.isLoading}
										notFoundContent={t("contract.copy.noCompany")}
									/>
								</div>
							</div>
						)
						: null}
					<div className="grid gap-2">
						<div className="font-medium">{t("contract.copy.sourceContract")}</div>
						{contracts.isLoading
							? <div className="flex justify-center py-3"><Spin size="small" /></div>
							: (
								<Select
									showSearch
									optionFilterProp="label"
									placeholder={t("contract.copy.selectContract")}
									value={contractId ?? undefined}
									onChange={(id) => {
										setContractId(id);
										setPart(null);
									}}
									options={contractOptions}
									notFoundContent={t("contract.copy.noContract")}
								/>
							)}
					</div>
					{contractId != null
						? (
							<div className="grid gap-2">
								<div className="font-medium">{t("contract.copy.sourcePart")}</div>
								{detail.isLoading ? <div className="flex justify-center py-3"><Spin size="small" /></div> : <Select placeholder={t("contract.copy.selectPart")} value={part ?? undefined} onChange={setPart} options={partOptions} />}
							</div>
						)
						: null}
					{contracts.isError ? <Alert type="error" showIcon message={t("contract.copy.contractsLoadFailed")} /> : null}
					{detail.isError ? <Alert type="error" showIcon message={t("contract.copy.detailLoadFailed")} /> : null}
				</div>
			</Modal>
			<Modal open={confirming} title={null} onCancel={() => setConfirming(false)} onOk={receive} confirmLoading={receiving} okText={t("common.confirm")} cancelText={t("common.cancel")} centered width={520} zIndex={1100}>
				<div className="grid justify-items-center gap-4 px-2 py-2 text-center">
					<ExclamationCircleOutlined className="text-[72px] leading-none text-orange-300" />
					<div className="text-2xl font-extrabold leading-tight">{t("contract.copy.confirmTitle")}</div>
					<div className="max-w-[420px] text-base font-semibold leading-7 text-text">{t("contract.copy.confirmDescription")}</div>
				</div>
			</Modal>
		</>
	);
}
