import type { ContractServicePath } from "#src/features/contract/api/contracts.api";
import type { ContractFormValues } from "../../model/contract.form.types";
import { fetchCompaniesByService } from "#src/api/common/common.api";
import { fetchCompanyContracts, fetchContractDetail } from "#src/features/contract/api/contracts.api";
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
	const serviceId = useWatch({ control, name: "serviceId" });
	const companyId = useWatch({ control, name: "companyId" });
	const serviceCode = useWatch({ control, name: "serviceCode" });
	const companyType = useWatch<ContractFormValues, "companyType">({ control, name: "companyType" });
	const counterparty = useWatch({ control, name: "counterpartyType" });
	const path = contractPath(serviceCode, companyType, counterparty);
	const [open, setOpen] = useState(false);
	const [confirming, setConfirming] = useState(false);
	const [otherCompany, setOtherCompany] = useState(false);
	const [sourceCompanyId, setSourceCompanyId] = useState<number | null>(null);
	const [contractId, setContractId] = useState<number | null>(null);
	const [part, setPart] = useState<string | null>(null);
	const [receiving, setReceiving] = useState(false);

	const companies = useQuery({
		queryKey: ["common", "companies", "contract-copy", serviceId ?? null],
		queryFn: () => fetchCompaniesByService(serviceId!, { pageSize: 1000 }),
		enabled: open && otherCompany && serviceId != null,
	});
	const companyOptions = useMemo(
		() => (companies.data?.results ?? []).filter(item => Number(item.id) !== Number(companyId)).map(item => ({ label: item.name, value: Number(item.id) })),
		[companies.data, companyId],
	);
	const selectedCompany = companies.data?.results.find(item => Number(item.id) === Number(sourceCompanyId));
	const selectedCompanyType = otherCompany
		? typeof selectedCompany?.company_type === "string" ? selectedCompany.company_type : null
		: typeof companyType === "string" ? companyType : null;
	const resolvedCompanyId = otherCompany ? sourceCompanyId : companyId;
	const contracts = useQuery({
		queryKey: ["contracts", "contract-copy", path, resolvedCompanyId ?? null, selectedCompanyType ?? null, serviceId ?? null],
		queryFn: () => fetchCompanyContracts(path!, resolvedCompanyId!, selectedCompanyType, serviceId),
		enabled: open && path != null && resolvedCompanyId != null && serviceId != null,
	});
	const detail = useQuery({
		queryKey: ["contracts", "contract-copy-detail", path, contractId ?? null],
		queryFn: () => fetchContractDetail(path!, contractId!),
		enabled: open && path != null && contractId != null,
	});
	const contractOptions = useMemo(
		() => (contracts.data?.results ?? []).map((row: any) => ({ value: Number(row.id), label: contractLabel(row) })),
		[contracts.data],
	);
	const partOptions = useMemo(() => [{ value: "main", label: "قرارداد اصلی" }, ...addendumOptions(detail.data?.addenda)], [detail.data]);

	async function receive() {
		if (contractId == null || part == null || path == null)
			return;
		setReceiving(true);
		try {
			const sourceDto = await fetchContractDetail(path, contractId);
			const { contractDetailToFormValues } = await import("#src/features/contract/list/ui/components/ContractDetailModal");
			const normalized = contractDetailToFormValues(sourceDto, path);
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
			<div className="mt-4 flex justify-end">
				<Button
					icon={<CopyOutlined />}
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
							setSourceCompanyId(null);
							setContractId(null);
							setPart(null);
						}}
					>
						جستجو در شرکت‌های دیگر
					</Checkbox>
					{otherCompany
						? (
							<Select
								showSearch
								optionFilterProp="label"
								placeholder="شرکت منبع را انتخاب کنید"
								value={sourceCompanyId ?? undefined}
								onChange={(id) => {
									setSourceCompanyId(id);
									setContractId(null);
									setPart(null);
								}}
								options={companyOptions}
								loading={companies.isLoading}
								notFoundContent="شرکتی یافت نشد"
							/>
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
