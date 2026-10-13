import type { ContractServicePath } from "#src/features/contract/api/contracts.api";
import type { ContractFormValues } from "../../model/contract.form.types";
import { fetchCompaniesByService } from "#src/api/common/common.api";
import { fetchCompanyContracts, fetchContractDetail } from "#src/features/contract/api/contracts.api";
import { companyTypeMatches, isIxpCompanyName } from "#src/features/contract/shared/utils";
import { useAccess } from "#src/hooks";
import { notification } from "#src/utils";
import { CopyOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button, Checkbox, Modal, Select, Spin } from "antd";
import { useMemo, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";

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
	return `${start} تا ${end}`;
}

function addendumOptions(addenda: unknown, depth = 0): Array<{ value: string, label: string }> {
	return (Array.isArray(addenda) ? addenda : []).flatMap((item, index) => {
		const row = (item ?? {}) as Record<string, any>;
		const id = asNumber(row.id);
		const number = row.display_addendum_number ?? row.displayAddendumNumber ?? row.contract_number ?? row.contractNumber ?? index + 1;
		return [
			...(id == null ? [] : [{ value: `addendum:${id}`, label: `${"— ".repeat(depth)}الحاقیه ${number}` }]),
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

function contractPath(code: unknown, companyType: unknown, counterparty: unknown): ContractServicePath | null {
	const service = String(code ?? "").trim().toLowerCase();
	if (service === "sms" || service.startsWith("sms/"))
		return counterparty === "gov_ops" || service === "sms/vendor" ? "sms/vendor" : "sms/client";
	if (service === "sms-commission" || service === "sms_commission")
		return "sms-commission";
	if (service === "sales_agency" || service === "sales-agency")
		return String(companyType ?? "").trim().toUpperCase() === "SALES_REP_MANAGEMENT" ? "sales-agency/rep-management" : "sales-agency/outbound";
	if (["openapi", "traffic", "psp", "commercial", "shahkar"].includes(service))
		return service as ContractServicePath;
	return null;
}

const OMIT_FIELDS = new Set(["addenda", "agent", "isSigned", "isOfficial", "id", "children", "startYear", "startMonth", "endYear", "endMonth", "contractNumber", "description"]);

export function ContractDataCopyButton() {
	const { control, setValue } = useFormContext<ContractFormValues>();
	const { getPermittedCompanyTypes } = useAccess();
	const serviceId = useWatch({ control, name: "serviceId" });
	const companyId = useWatch({ control, name: "companyId" });
	const serviceCode = useWatch({ control, name: "serviceCode" });
	const companyType = useWatch<ContractFormValues, "companyType">({ control, name: "companyType" });
	const counterparty = useWatch({ control, name: "counterpartyType" });
	const path = contractPath(serviceCode, companyType, counterparty);
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
	const hasSourceCompanyType = ["sms", "traffic", "psp"].includes(normalizedServiceCode) || isSalesAgency;
	const sourceCompanyTypeLabel = isSalesAgency
		? "نوع همکاری (عاملیت فروش)"
		: normalizedServiceCode === "sms"
			? "نوع شرکت (SMS)"
			: normalizedServiceCode === "traffic"
				? "نوع شرکت (ترافیک)"
				: "نوع شرکت (PSP)";
	const sourceCompanyLabel = isSalesAgency || normalizedServiceCode === "psp" ? "نام شرکت" : "شرکت";
	const sourceCompanyTypeOptions = useMemo(() => {
		if (!hasSourceCompanyType || serviceId == null)
			return [];

		const options = getPermittedCompanyTypes("contracts", "create", serviceId)
			.map(item => ({ label: item.value, value: item.key }));
		if (normalizedServiceCode === "traffic" && !options.some(option => String(option.value).toUpperCase() === "IXP"))
			options.push({ label: "IXP", value: "IXP" });
		return options;
	}, [getPermittedCompanyTypes, hasSourceCompanyType, normalizedServiceCode, serviceId]);
	const sourcePath = contractPath(serviceCode, otherCompany ? sourceCompanyType : companyType, counterparty);

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
				if (normalizedServiceCode === "traffic" && sourceCompanyType.toUpperCase() === "IXP")
					return isIxpCompanyName(item.name);
				return companyTypeMatches(item.company_type, sourceCompanyType);
			})
			.map(item => ({ label: item.name, value: Number(item.id) })),
		[companies.data, companyId, hasSourceCompanyType, sourceCompanyType],
	);
	const selectedCompanyType = otherCompany
		? sourceCompanyType
		: typeof companyType === "string" ? companyType : null;
	const resolvedCompanyId = otherCompany ? sourceCompanyId : companyId;
	const contracts = useQuery({
		queryKey: ["contracts", "contract-copy", sourcePath, resolvedCompanyId ?? null, selectedCompanyType ?? null, serviceId ?? null],
		queryFn: () => fetchCompanyContracts(sourcePath!, resolvedCompanyId!, selectedCompanyType, serviceId),
		enabled: open && sourcePath != null && resolvedCompanyId != null && serviceId != null,
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
	const partOptions = useMemo(() => [{ value: "main", label: "قرارداد اصلی" }, ...addendumOptions(detail.data?.addenda)], [detail.data]);

	async function receive() {
		if (contractId == null || part == null || sourcePath == null)
			return;
		setReceiving(true);
		try {
			const sourceDto = await fetchContractDetail(sourcePath, contractId);
			const { contractDetailToFormValues } = await import("#src/features/contract/list/ui/components/ContractDetailModal");
			const normalized = contractDetailToFormValues(sourceDto, sourcePath);
			const source = part === "main"
				? normalized.serviceFields
				: findAddendum(normalized.serviceFields.addenda, Number(part.replace("addendum:", "")));
			if (!source) {
				notification.error({ message: "بخش انتخاب‌شده در قرارداد منبع یافت نشد.", placement: "topRight" });
				return;
			}
			for (const [key, value] of Object.entries(source)) {
				if (!OMIT_FIELDS.has(key))
					setValue((`serviceFields.${key}`) as any, value as any, { shouldDirty: true, shouldValidate: true });
			}
			setOpen(false);
			setConfirming(false);
			setContractId(null);
			setPart(null);
			notification.success({ message: "اطلاعات منبع با موفقیت دریافت شد.", placement: "topRight" });
		}
		catch {
			notification.error({ message: "دریافت اطلاعات قرارداد منبع ناموفق بود.", placement: "topRight" });
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
					className="w-full"
					disabled={companyId == null || serviceId == null || path == null}
					onClick={() => setOpen(true)}
				>
					دریافت اطلاعات از قرارداد یا الحاقیه دیگر
				</Button>
			</div>
			<Modal
				open={open}
				title="دریافت اطلاعات از قرارداد یا الحاقیه دیگر"
				onCancel={close}
				onOk={() => setConfirming(true)}
				okText="دریافت اطلاعات"
				cancelText="انصراف"
				okButtonProps={{ disabled: part == null || detail.isLoading }}
				destroyOnHidden
			>
				<div className="grid gap-4">
					<div className="text-textSecondary">اطلاعات سرویس را از قرارداد اصلی یا الحاقیه‌ی ثبت‌شده در همین شرکت یا شرکت دیگری دریافت کنید.</div>
					<div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-yellow-700 backdrop-blur-md">فقط فیلدهای سرویس جایگزین می‌شوند؛ شرکت، سرویس، شماره و تاریخ قرارداد، وضعیت امضا و الحاقیه‌های مقصد بدون تغییر می‌مانند. فقط اطلاعات ثبت‌شده‌ی منبع دریافت می‌شود.</div>
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
						جستجو در شرکت‌های دیگر
					</Checkbox>
					{otherCompany
						? (
							<div className="grid gap-3">
								{hasSourceCompanyType
									? (
										<div className="grid gap-2">
											<div className="font-medium">{sourceCompanyTypeLabel}</div>
											<Select
												placeholder={`${sourceCompanyTypeLabel} را انتخاب کنید`}
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
										placeholder={isSalesAgency || normalizedServiceCode === "psp" ? "نام شرکت را انتخاب کنید" : "شرکت منبع را انتخاب کنید"}
										value={sourceCompanyId ?? undefined}
										onChange={(id) => {
											setSourceCompanyId(id);
											setContractId(null);
											setPart(null);
										}}
										options={companyOptions}
										disabled={hasSourceCompanyType && sourceCompanyType == null}
										loading={companies.isLoading}
										notFoundContent="شرکتی یافت نشد"
									/>
								</div>
							</div>
						)
						: null}
					<div className="grid gap-2">
						<div className="font-medium">انتخاب قرارداد منبع</div>
						{contracts.isLoading
							? <div className="flex justify-center py-3"><Spin size="small" /></div>
							: (
								<Select
									showSearch
									optionFilterProp="label"
									placeholder="قراردادی را انتخاب کنید"
									value={contractId ?? undefined}
									onChange={(id) => {
										setContractId(id);
										setPart(null);
									}}
									options={contractOptions}
									notFoundContent="قراردادی یافت نشد"
								/>
							)}
					</div>
					{contractId != null
						? (
							<div className="grid gap-2">
								<div className="font-medium">انتخاب بخش منبع</div>
								{detail.isLoading ? <div className="flex justify-center py-3"><Spin size="small" /></div> : <Select placeholder="قرارداد اصلی یا الحاقیه را انتخاب کنید" value={part ?? undefined} onChange={setPart} options={partOptions} />}
							</div>
						)
						: null}
					{contracts.isError ? <Alert type="error" showIcon message="دریافت قراردادهای منبع ناموفق بود" /> : null}
					{detail.isError ? <Alert type="error" showIcon message="دریافت اطلاعات قرارداد منبع ناموفق بود" /> : null}
				</div>
			</Modal>
			<Modal open={confirming} title={null} onCancel={() => setConfirming(false)} onOk={receive} confirmLoading={receiving} okText="تأیید" cancelText="انصراف" centered width={520} zIndex={1100}>
				<div className="grid justify-items-center gap-4 px-2 py-2 text-center">
					<ExclamationCircleOutlined className="text-[72px] leading-none text-orange-300" />
					<div className="text-2xl font-extrabold leading-tight">دریافت اطلاعات از منبع انتخاب‌شده</div>
					<div className="max-w-[420px] text-base font-semibold leading-7 text-text">فیلدهای سرویس با مقادیر ثبت‌شده‌ی منبع انتخاب‌شده جایگزین می‌شوند.</div>
				</div>
			</Modal>
		</>
	);
}
