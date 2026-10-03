import type { ContractFormValues } from "#src/features/contract/shared/model/contract.form.types.js";
import type { ArrayPath, Path } from "react-hook-form";
import { fetchCompaniesByService } from "#src/api/common/common.api";
import { fetchCompanyContracts, fetchContractDetail } from "#src/features/contract/api/contracts.api";
import { ContractAddendaSection } from "#src/features/contract/components/addenda/ContractAddendaSection";
import {
	AlignedFormField,
	useAlignedLabelWidth,
} from "#src/shared/ui/aligned-form-field";
import { RHFProNumber } from "#src/shared/ui/rhf-pro";
import { SectionCard } from "#src/shared/ui/section-card";
import { notification } from "#src/utils";
import { CopyOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button, Checkbox, Modal, Select, Spin } from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";

const sf = (path: string) => `serviceFields.${path}` as const;

const COMMISSION_LABELS = [
	"کارمزد دریافت اولیه",
	"کارمزد دریافت نهایی",
	"درصد کاراشاب",
	"درصد مخابرات",
	"درصد سهم طرف اول",
	"درصد سهم منطقه",
	"درصد سهم نماینده فروش",
];

function toPercent(v: unknown): number | null {
	if (v === "" || v == null)
		return null;
	const n = typeof v === "number" ? v : Number(v);
	return Number.isFinite(n) ? n : null;
}

function isPercentInRange(v: number) {
	return v >= 0 && v <= 100;
}

const SMS_COMMISSION_COPY_FIELDS = [
	"initialCommission",
	"finalCommission",
	"expertPercent",
	"telecomPercent",
	"firstPartySharePercent",
	"regionSharePercent",
	"salesAgentSharePercent",
] as const;

function toNumberOrNull(value: unknown): number | null {
	if (value == null || value === "")
		return null;
	const numberValue = typeof value === "number" ? value : Number(value);
	return Number.isFinite(numberValue) ? numberValue : null;
}

function formatJalaliDate(year: unknown, month: unknown) {
	const normalizedYear = toNumberOrNull(year);
	const normalizedMonth = toNumberOrNull(month);
	if (normalizedYear == null || normalizedMonth == null)
		return "—";
	const formatNumber = new Intl.NumberFormat("fa-IR", { useGrouping: false, minimumIntegerDigits: 2 });
	return `${new Intl.NumberFormat("fa-IR", { useGrouping: false }).format(normalizedYear)}/${formatNumber.format(normalizedMonth)}`;
}

function formatJalaliIsoDate(value: unknown, isEndExclusive = false): string | null {
	if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(value))
		return null;
	const date = new Date(`${value.slice(0, 10)}T00:00:00Z`);
	if (Number.isNaN(date.getTime()))
		return null;
	if (isEndExclusive)
		date.setUTCDate(date.getUTCDate() - 1);
	const parts = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		timeZone: "UTC",
	}).formatToParts(date);
	const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value ?? "";
	return `${part("year")}/${part("month")}/${part("day")}`;
}

function formatContractRange(contract: Record<string, any>) {
	const startDate = formatJalaliIsoDate(contract.start_date ?? contract.startDate);
	const endDateExclusive = formatJalaliIsoDate(contract.end_date_exclusive ?? contract.endDateExclusive, true);
	const endDate = formatJalaliIsoDate(contract.end_date ?? contract.endDate);
	const start = startDate ?? `${formatJalaliDate(contract.start_jy ?? contract.startYear, contract.start_jm ?? contract.startMonth)}/۰۱`;
	const end = endDateExclusive ?? endDate ?? `${formatJalaliDate(contract.end_jy ?? contract.endYear, contract.end_jm ?? contract.endMonth)}/—`;
	return `${start} تا ${end}`;
}

function findAddendumById(addenda: unknown, id: number): Record<string, any> | null {
	for (const addendum of Array.isArray(addenda) ? addenda : []) {
		const row = (addendum ?? {}) as Record<string, any>;
		if (Number(row.id) === id)
			return row;
		const child = findAddendumById(row.children, id);
		if (child)
			return child;
	}
	return null;
}

function getAddendumOptions(addenda: unknown, depth = 0): Array<{ value: string, label: string }> {
	return (Array.isArray(addenda) ? addenda : []).flatMap((addendum, index) => {
		const row = (addendum ?? {}) as Record<string, any>;
		const id = toNumberOrNull(row.id);
		const number = row.display_addendum_number ?? row.displayAddendumNumber ?? row.contract_number ?? row.contractNumber ?? index + 1;
		const label = `${"— ".repeat(depth)}الحاقیه ${number}`;
		return [
			...(id != null ? [{ value: `addendum:${id}`, label }] : []),
			...getAddendumOptions(row.children, depth + 1),
		];
	});
}

function SmsCommissionCopyDataButton() {
	const { control, setValue } = useFormContext<ContractFormValues>();
	const [open, setOpen] = useState(false);
	const [includeOtherCompanies, setIncludeOtherCompanies] = useState(false);
	const [destinationCompanyId, setDestinationCompanyId] = useState<number | null>(null);
	const [sourceContractId, setSourceContractId] = useState<number | null>(null);
	const [sourcePart, setSourcePart] = useState<string | null>(null);
	const [confirming, setConfirming] = useState(false);
	const [isReceiving, setIsReceiving] = useState(false);
	const companyId = useWatch({ control, name: "companyId" });
	const serviceId = useWatch({ control, name: "serviceId" });
	const noOtherCompaniesWarningRef = useRef<string | null>(null);

	const companies = useQuery({
		queryKey: ["common", "companies", "sms-commission-copy-destinations", serviceId ?? null],
		queryFn: () => fetchCompaniesByService(serviceId!, { pageSize: 1000 }),
		enabled: open && includeOtherCompanies && serviceId != null,
	});
	const otherCompanyOptions = useMemo(() => {
		return (companies.data?.results ?? [])
			.filter(company => Number(company.id) !== Number(companyId))
			.map(company => ({ label: company.name, value: company.id }));
	}, [companies.data, companyId]);

	useEffect(() => {
		const warningKey = `${serviceId ?? ""}:${companyId ?? ""}`;
		if (!open || !includeOtherCompanies || companies.isLoading || companies.isError || otherCompanyOptions.length > 0) {
			noOtherCompaniesWarningRef.current = null;
			return;
		}
		if (noOtherCompaniesWarningRef.current !== warningKey) {
			notification.warning({
				message: "شرکت دیگری در این سرویس یافت نشد.",
				placement: "topRight",
			});
			noOtherCompaniesWarningRef.current = warningKey;
		}
	}, [companies.isError, companies.isLoading, companyId, includeOtherCompanies, open, otherCompanyOptions.length, serviceId]);

	const sourceCompanyId = includeOtherCompanies ? destinationCompanyId : companyId;

	const sourceContracts = useQuery({
		queryKey: ["contracts", "sms-commission-copy-sources", sourceCompanyId ?? null, serviceId ?? null],
		queryFn: () => fetchCompanyContracts("sms-commission", sourceCompanyId!, undefined, serviceId),
		enabled: open && serviceId != null && sourceCompanyId != null,
		staleTime: 2 * 60 * 1000,
	});
	const sourceDetail = useQuery({
		queryKey: ["contracts", "sms-commission-copy-source-detail", sourceContractId ?? null],
		queryFn: () => fetchContractDetail("sms-commission", sourceContractId!),
		enabled: open && sourceContractId != null,
		staleTime: 2 * 60 * 1000,
	});

	const options = useMemo(() => {
		const rows = sourceContracts.data?.results ?? [];
		return rows.map((contract: any) => ({
			value: Number(contract.id),
			label: formatContractRange(contract),
		}));
	}, [sourceContracts.data]);
	const sourcePartOptions = useMemo(() => [
		{ value: "main", label: "قرارداد اصلی" },
		...getAddendumOptions(sourceDetail.data?.addenda),
	], [sourceDetail.data]);
	const selectedSourcePartLabel = sourcePartOptions.find(option => option.value === sourcePart)?.label ?? null;

	async function receiveSourceData() {
		if (sourceContractId == null || !sourcePart)
			return;
		setIsReceiving(true);
		try {
			const detail = await fetchContractDetail("sms-commission", sourceContractId);
			const source = sourcePart === "main"
				? detail
				: findAddendumById(detail?.addenda, Number(sourcePart.replace("addendum:", "")));
			if (!source) {
				notification.error({ message: "بخش انتخاب‌شده در قرارداد منبع یافت نشد.", placement: "topRight" });
				return;
			}
			const sourceValues: Record<(typeof SMS_COMMISSION_COPY_FIELDS)[number], number | null> = {
				initialCommission: toNumberOrNull(source.initial_receive_fee ?? source.initialReceiveFee),
				finalCommission: toNumberOrNull(source.final_receive_fee ?? source.finalReceiveFee),
				expertPercent: toNumberOrNull(source.karashab_percent ?? source.karashabPercent),
				telecomPercent: toNumberOrNull(source.mokhaberat_percent ?? source.mokhaberatPercent),
				firstPartySharePercent: toNumberOrNull(source.first_side_percent ?? source.firstSidePercent),
				regionSharePercent: toNumberOrNull(source.area_percent ?? source.areaPercent),
				salesAgentSharePercent: toNumberOrNull(source.sales_agent_percent ?? source.salesAgentPercent),
			};
			SMS_COMMISSION_COPY_FIELDS.forEach((field) => {
				setValue(sf(field) as any, sourceValues[field] as any, { shouldDirty: true, shouldValidate: true });
			});
			setOpen(false);
			setSourceContractId(null);
			setSourcePart(null);
			setConfirming(false);
			notification.success({ message: "اطلاعات منبع با موفقیت دریافت شد.", placement: "topRight" });
		}
		catch {
			notification.error({ message: "دریافت اطلاعات قرارداد منبع ناموفق بود.", placement: "topRight" });
		}
		finally {
			setIsReceiving(false);
		}
	}

	function closeModal() {
		setOpen(false);
		setDestinationCompanyId(null);
		setSourceContractId(null);
		setSourcePart(null);
		setConfirming(false);
	}

	function openModal() {
		setIncludeOtherCompanies(false);
		setDestinationCompanyId(null);
		setSourceContractId(null);
		setSourcePart(null);
		setConfirming(false);
		setOpen(true);
	}

	return (
		<>
			<div className="mt-4 flex justify-end">
				<Button icon={<CopyOutlined />} disabled={companyId == null || serviceId == null} onClick={openModal}>
					دریافت اطلاعات از قرارداد یا الحاقیه دیگر
				</Button>
			</div>

			<Modal
				open={open}
				title="دریافت اطلاعات از قرارداد یا الحاقیه دیگر"
				onCancel={closeModal}
				onOk={() => setConfirming(true)}
				okText="دریافت اطلاعات"
				cancelText="انصراف"
				okButtonProps={{ disabled: sourcePart == null || sourceDetail.isLoading }}
				destroyOnHidden
			>
				<div className="grid gap-4">
					<div className="text-textSecondary">
						اعداد و درصدهای این بخش را از یک قرارداد یا الحاقیه دیگر در همین شرکت — یا در صورت نیاز، شرکت‌های دیگر —
						دریافت کنید.
					</div>
					<div
						className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-yellow-700 backdrop-blur-md"
					>
						این عملیات فقط مقادیر عددی، پلکان‌ها و نرخ‌ها را از منبع انتخاب‌شده جایگزین می‌کند. شماره قرارداد، تاریخ‌ها و وضعیت تایید/امضا بدون تغییر باقی می‌مانند. توجه داشته باشید فقط آخرین اطلاعات ثبت‌شدهٔ منبع دریافت می‌شود؛ تغییرات ثبت‌نشده در قرارداد یا الحاقیهٔ منبع کپی نخواهد شد.
					</div>
					<Checkbox
						checked={includeOtherCompanies}
						onChange={(event) => {
							setIncludeOtherCompanies(event.target.checked);
							setDestinationCompanyId(null);
							setSourceContractId(null);
							setSourcePart(null);
						}}
					>
						جستجو در شرکت‌های دیگر
					</Checkbox>
					{includeOtherCompanies
						? (
							<div className="grid gap-2">
								<div className="font-medium">انتخاب شرکت مقصد</div>
								<Select
									showSearch
									optionFilterProp="label"
									placeholder="شرکت مقصد را انتخاب کنید"
									value={destinationCompanyId ?? undefined}
									onChange={(company) => {
										setDestinationCompanyId(company);
										setSourceContractId(null);
										setSourcePart(null);
									}}
									options={otherCompanyOptions}
									loading={companies.isLoading}
									notFoundContent="موردی یافت نشد"
								/>
							</div>
						)
						: null}
					<div className="grid gap-2">
						<div className="flex items-center gap-2 font-medium">
							<span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-sm text-white">
								۱
							</span>
							<span>انتخاب قرارداد منبع</span>
						</div>
						{sourceContracts.isLoading
							? <div className="flex justify-center py-3"><Spin size="small" /></div>
							: (
								<Select
									showSearch
									optionFilterProp="label"
									placeholder="قراردادی را انتخاب کنید"
									value={sourceContractId ?? undefined}
									onChange={(contractId) => {
										setSourceContractId(contractId);
										setSourcePart(null);
									}}
									options={options}
									notFoundContent="قراردادی یافت نشد"
								/>
							)}
					</div>
					{sourceContractId != null
						? (
							<div className="grid gap-2">
								<div className="flex items-center gap-2 font-medium">
									<span
										className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-sm text-white"
									>
										۲
									</span>
									<span>
										انتخاب بخش منبع در «
										{options.find(option => option.value === sourceContractId)?.label ?? "—"}
										»
									</span>
								</div>

								{sourceDetail.isLoading
									? <div className="flex justify-center py-3"><Spin size="small" /></div>
									: (
										<Select
											placeholder="بخش منبع را انتخاب کنید"
											value={sourcePart ?? undefined}
											onChange={setSourcePart}
											options={sourcePartOptions}
										/>
									)}
							</div>
						)
						: null}
					{selectedSourcePartLabel
						? (
							<div
								className="rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-green-700 backdrop-blur-md"
							>
								منبع انتخاب شده:
								{" "}
								{selectedSourcePartLabel}
							</div>
						)
						: null}
					{sourceContracts.isError ? <Alert type="error" showIcon message="دریافت قراردادهای منبع ناموفق بود" /> : null}
					{sourceDetail.isError
						? <Alert type="error" showIcon message="دریافت اطلاعات قرارداد منبع ناموفق بود" />
						: null}
				</div>
			</Modal>
			<Modal
				open={confirming}
				title={null}
				onCancel={() => setConfirming(false)}
				onOk={receiveSourceData}
				confirmLoading={isReceiving}
				okText="تأیید"
				cancelText="انصراف"
				centered
				width={520}
				zIndex={1100}
			>
				<div className="grid justify-items-center gap-4 px-2 py-2 text-center">
					<ExclamationCircleOutlined className="text-[72px] leading-none text-orange-300" />
					<div className="text-2xl font-extrabold leading-tight">دریافت اطلاعات از منبع انتخاب‌شده</div>
					<div className="max-w-[420px] text-base font-semibold leading-7 text-text">
						مقادیر عددی، پلکان‌ها و نرخ‌های فعلی با مقادیر ثبت‌شدهٔ منبع انتخاب‌شده
						جایگزین خواهد شد.
					</div>
					<div className="max-w-[420px] text-sm leading-6 text-textSecondary">اگر منبع تغییرات ثبت‌نشده داشته باشد، آخرین اطلاعات ثبت‌شده جایگزین می‌شود. آیا تأیید می‌کنید؟</div>
				</div>
			</Modal>
		</>
	);
}

function SmsCommissionAddendumPercentSync({ base }: { base: string }) {
	const { control, setValue } = useFormContext<ContractFormValues>();
	const expertRaw = useWatch({ control, name: `${base}.expertPercent` as any });
	const telecomRaw = useWatch({ control, name: `${base}.telecomPercent` as any });
	const firstPartyRaw = useWatch({ control, name: `${base}.firstPartySharePercent` as any });
	const regionRaw = useWatch({ control, name: `${base}.regionSharePercent` as any });
	const salesAgentRaw = useWatch({ control, name: `${base}.salesAgentSharePercent` as any });
	const previousPair = useRef<[number | null, number | null]>([null, null]);
	const previousTriple = useRef<[number | null, number | null, number | null]>([null, null, null]);

	useEffect(() => {
		const values: [number | null, number | null] = [toPercent(expertRaw), toPercent(telecomRaw)];
		const changed = values.map((value, index) => value !== previousPair.current[index]);
		if (changed.filter(Boolean).length === 1) {
			const changedIndex = changed[0] ? 0 : 1;
			const otherIndex = changedIndex === 0 ? 1 : 0;
			const changedValue = values[changedIndex];
			const otherValue = values[otherIndex];
			const targetIndex = changedValue != null ? otherIndex : otherValue != null ? changedIndex : null;
			const remaining = changedValue != null ? 100 - changedValue : otherValue != null ? 100 - otherValue : null;
			if (targetIndex != null && remaining != null && isPercentInRange(remaining) && values[targetIndex] !== remaining) {
				const field = targetIndex === 0 ? "expertPercent" : "telecomPercent";
				setValue(`${base}.${field}` as any, remaining as any, { shouldDirty: true, shouldValidate: true });
			}
		}
		previousPair.current = values;
	}, [base, expertRaw, telecomRaw, setValue]);

	useEffect(() => {
		const values: [number | null, number | null, number | null] = [toPercent(firstPartyRaw), toPercent(regionRaw), toPercent(salesAgentRaw)];
		const changed = values.map((value, index) => value !== previousTriple.current[index]);
		if (changed.filter(Boolean).length === 1) {
			const changedIndex = changed.findIndex(Boolean);
			const otherIndexes = [0, 1, 2].filter(index => index !== changedIndex);
			const changedValue = values[changedIndex];
			let targetIndex: number | null = null;

			if (changedValue == null) {
				if (otherIndexes.every(index => values[index] != null))
					targetIndex = changedIndex;
			}
			else if (values[otherIndexes[0]] != null) {
				targetIndex = otherIndexes[1];
			}
			else if (values[otherIndexes[1]] != null) {
				targetIndex = otherIndexes[0];
			}

			if (targetIndex != null) {
				const sourceIndexes = [0, 1, 2].filter(index => index !== targetIndex);
				const remaining = 100 - (values[sourceIndexes[0]] ?? 0) - (values[sourceIndexes[1]] ?? 0);
				if (isPercentInRange(remaining) && values[targetIndex] !== remaining) {
					const fields = ["firstPartySharePercent", "regionSharePercent", "salesAgentSharePercent"];
					setValue(`${base}.${fields[targetIndex]}` as any, remaining as any, { shouldDirty: true, shouldValidate: true });
				}
			}
		}
		previousTriple.current = values;
	}, [base, firstPartyRaw, regionRaw, salesAgentRaw, setValue]);

	return null;
}

export function SmsCommissionFields() {
	const { control, setValue } = useFormContext<ContractFormValues>();
	const alignedLabelStyle = useAlignedLabelWidth(COMMISSION_LABELS);

	const startYear = useWatch({ control, name: "startYear" });
	const startMonth = useWatch({ control, name: "startMonth" });
	const endYear = useWatch({ control, name: "endYear" });
	const endMonth = useWatch({ control, name: "endMonth" });
	const expertPercentRaw = useWatch({ control, name: sf("expertPercent") as any });
	const telecomPercentRaw = useWatch({ control, name: sf("telecomPercent") as any });
	const firstPartySharePercentRaw = useWatch({ control, name: sf("firstPartySharePercent") as any });
	const regionSharePercentRaw = useWatch({ control, name: sf("regionSharePercent") as any });
	const salesAgentSharePercentRaw = useWatch({ control, name: sf("salesAgentSharePercent") as any });

	const prevExpertTelecomRef = useRef<{
		expertPercent: number | null
		telecomPercent: number | null
	}>({
		expertPercent: null,
		telecomPercent: null,
	});
	const prevShareTripleRef = useRef<{
		firstPartySharePercent: number | null
		regionSharePercent: number | null
		salesAgentSharePercent: number | null
	}>({
		firstPartySharePercent: null,
		regionSharePercent: null,
		salesAgentSharePercent: null,
	});

	const showAddenda = useMemo(
		() => startYear != null && startMonth != null && endYear != null && endMonth != null,
		[startYear, startMonth, endYear, endMonth],
	);

	useEffect(() => {
		const expertPercent = toPercent(expertPercentRaw);
		const telecomPercent = toPercent(telecomPercentRaw);
		const prev = prevExpertTelecomRef.current;

		const expertChanged = expertPercent !== prev.expertPercent;
		const telecomChanged = telecomPercent !== prev.telecomPercent;

		if (expertChanged && !telecomChanged) {
			if (expertPercent != null) {
				const remaining = 100 - expertPercent;
				if (isPercentInRange(remaining) && telecomPercent !== remaining) {
					setValue(sf("telecomPercent") as any, remaining as any, {
						shouldDirty: true,
						shouldValidate: true,
					});
				}
			}
			else if (telecomPercent != null) {
				const remaining = 100 - telecomPercent;
				if (isPercentInRange(remaining) && expertPercent !== remaining) {
					setValue(sf("expertPercent") as any, remaining as any, {
						shouldDirty: true,
						shouldValidate: true,
					});
				}
			}
		}

		if (telecomChanged && !expertChanged) {
			if (telecomPercent != null) {
				const remaining = 100 - telecomPercent;
				if (isPercentInRange(remaining) && expertPercent !== remaining) {
					setValue(sf("expertPercent") as any, remaining as any, {
						shouldDirty: true,
						shouldValidate: true,
					});
				}
			}
			else if (expertPercent != null) {
				const remaining = 100 - expertPercent;
				if (isPercentInRange(remaining) && telecomPercent !== remaining) {
					setValue(sf("telecomPercent") as any, remaining as any, {
						shouldDirty: true,
						shouldValidate: true,
					});
				}
			}
		}

		prevExpertTelecomRef.current = {
			expertPercent,
			telecomPercent,
		};
	}, [expertPercentRaw, telecomPercentRaw, setValue]);

	useEffect(() => {
		const firstPartySharePercent = toPercent(firstPartySharePercentRaw);
		const regionSharePercent = toPercent(regionSharePercentRaw);
		const salesAgentSharePercent = toPercent(salesAgentSharePercentRaw);
		const prev = prevShareTripleRef.current;

		const firstChanged = firstPartySharePercent !== prev.firstPartySharePercent;
		const regionChanged = regionSharePercent !== prev.regionSharePercent;
		const salesChanged = salesAgentSharePercent !== prev.salesAgentSharePercent;
		const changedCount = [firstChanged, regionChanged, salesChanged].filter(Boolean).length;

		if (changedCount === 1) {
			if (firstChanged) {
				if (firstPartySharePercent != null) {
					if (regionSharePercent != null) {
						const remaining = 100 - firstPartySharePercent - regionSharePercent;
						if (isPercentInRange(remaining) && salesAgentSharePercent !== remaining) {
							setValue(sf("salesAgentSharePercent") as any, remaining as any, {
								shouldDirty: true,
								shouldValidate: true,
							});
						}
					}
					else if (salesAgentSharePercent != null) {
						const remaining = 100 - firstPartySharePercent - salesAgentSharePercent;
						if (isPercentInRange(remaining) && regionSharePercent !== remaining) {
							setValue(sf("regionSharePercent") as any, remaining as any, {
								shouldDirty: true,
								shouldValidate: true,
							});
						}
					}
				}
				else if (regionSharePercent != null && salesAgentSharePercent != null) {
					const remaining = 100 - regionSharePercent - salesAgentSharePercent;
					if (isPercentInRange(remaining) && firstPartySharePercent !== remaining) {
						setValue(sf("firstPartySharePercent") as any, remaining as any, {
							shouldDirty: true,
							shouldValidate: true,
						});
					}
				}
			}
			else if (regionChanged) {
				if (regionSharePercent != null) {
					if (firstPartySharePercent != null) {
						const remaining = 100 - regionSharePercent - firstPartySharePercent;
						if (isPercentInRange(remaining) && salesAgentSharePercent !== remaining) {
							setValue(sf("salesAgentSharePercent") as any, remaining as any, {
								shouldDirty: true,
								shouldValidate: true,
							});
						}
					}
					else if (salesAgentSharePercent != null) {
						const remaining = 100 - regionSharePercent - salesAgentSharePercent;
						if (isPercentInRange(remaining) && firstPartySharePercent !== remaining) {
							setValue(sf("firstPartySharePercent") as any, remaining as any, {
								shouldDirty: true,
								shouldValidate: true,
							});
						}
					}
				}
				else if (firstPartySharePercent != null && salesAgentSharePercent != null) {
					const remaining = 100 - firstPartySharePercent - salesAgentSharePercent;
					if (isPercentInRange(remaining) && regionSharePercent !== remaining) {
						setValue(sf("regionSharePercent") as any, remaining as any, {
							shouldDirty: true,
							shouldValidate: true,
						});
					}
				}
			}
			else if (salesChanged) {
				if (salesAgentSharePercent != null) {
					if (firstPartySharePercent != null) {
						const remaining = 100 - salesAgentSharePercent - firstPartySharePercent;
						if (isPercentInRange(remaining) && regionSharePercent !== remaining) {
							setValue(sf("regionSharePercent") as any, remaining as any, {
								shouldDirty: true,
								shouldValidate: true,
							});
						}
					}
					else if (regionSharePercent != null) {
						const remaining = 100 - salesAgentSharePercent - regionSharePercent;
						if (isPercentInRange(remaining) && firstPartySharePercent !== remaining) {
							setValue(sf("firstPartySharePercent") as any, remaining as any, {
								shouldDirty: true,
								shouldValidate: true,
							});
						}
					}
				}
				else if (firstPartySharePercent != null && regionSharePercent != null) {
					const remaining = 100 - firstPartySharePercent - regionSharePercent;
					if (isPercentInRange(remaining) && salesAgentSharePercent !== remaining) {
						setValue(sf("salesAgentSharePercent") as any, remaining as any, {
							shouldDirty: true,
							shouldValidate: true,
						});
					}
				}
			}
		}

		prevShareTripleRef.current = {
			firstPartySharePercent,
			regionSharePercent,
			salesAgentSharePercent,
		};
	}, [firstPartySharePercentRaw, regionSharePercentRaw, salesAgentSharePercentRaw, setValue]);

	function renderCommissionGrid(base?: string) {
		const nameOf = (field: string) => base ? `${base}.${field}` : sf(field);

		return (
			<>
				{base ? <SmsCommissionAddendumPercentSync base={base} /> : null}
				<div
					className="aligned-form-grid aligned-form-grid--two"
					style={alignedLabelStyle}
				>
					<AlignedFormField label="کارمزد دریافت اولیه">
						<RHFProNumber<ContractFormValues, any>
							name={nameOf("initialCommission") as any}
							label=""
							inputProps={{ placeholder: "مثلاً 110", addonAfter: "ریال" }}
							formItemProps={{ className: "contract-type-currency-field mb-0" }}
						/>
					</AlignedFormField>

					<AlignedFormField label="کارمزد دریافت نهایی">
						<RHFProNumber<ContractFormValues, any>
							name={nameOf("finalCommission") as any}
							label=""
							inputProps={{ placeholder: "مثلاً 150", addonAfter: "ریال" }}
							formItemProps={{ className: "contract-type-currency-field mb-0" }}
						/>
					</AlignedFormField>

					<AlignedFormField label="درصد کاراشاب">
						<RHFProNumber<ContractFormValues, any>
							name={nameOf("expertPercent") as any}
							label=""
							inputProps={{ placeholder: "مثلاً 20", addonAfter: "درصد" }}
							enableGrouping={false}
							formItemProps={{ className: "contract-type-currency-field mb-0" }}
						/>
					</AlignedFormField>

					<AlignedFormField label="درصد مخابرات">
						<RHFProNumber<ContractFormValues, any>
							name={nameOf("telecomPercent") as any}
							label=""
							inputProps={{ placeholder: "مثلاً 80", addonAfter: "درصد" }}
							enableGrouping={false}
							formItemProps={{ className: "contract-type-currency-field mb-0" }}
						/>
					</AlignedFormField>

					<AlignedFormField label="درصد سهم طرف اول">
						<RHFProNumber<ContractFormValues, any>
							name={nameOf("firstPartySharePercent") as any}
							label=""
							inputProps={{ placeholder: "مثلاً 20", addonAfter: "درصد" }}
							enableGrouping={false}
							formItemProps={{ className: "contract-type-currency-field mb-0" }}
						/>
					</AlignedFormField>

					<AlignedFormField label="درصد سهم منطقه">
						<RHFProNumber<ContractFormValues, any>
							name={nameOf("regionSharePercent") as any}
							label=""
							inputProps={{ placeholder: "مثلاً 30", addonAfter: "درصد" }}
							enableGrouping={false}
							formItemProps={{ className: "contract-type-currency-field mb-0" }}
						/>
					</AlignedFormField>

					<div className="col-span-full">
						<AlignedFormField label="درصد سهم نماینده فروش">
							<RHFProNumber<ContractFormValues, any>
								name={nameOf("salesAgentSharePercent") as any}
								label=""
								inputProps={{ placeholder: "مثلاً 50", addonAfter: "درصد" }}
								enableGrouping={false}
								formItemProps={{ className: "contract-type-currency-field mb-0" }}
							/>
						</AlignedFormField>
					</div>
				</div>
			</>
		);
	}

	return (
		<>
			<SectionCard title="کارمزدها و درصدها" tone="gold">
				{renderCommissionGrid()}
				<SmsCommissionCopyDataButton />
			</SectionCard>

			{showAddenda
				? (
					<div className="mt-3">
						<ContractAddendaSection<ContractFormValues>
							title="الحاقیه‌های قرارداد (اختیاری)"
							name={sf("addenda") as ArrayPath<ContractFormValues>}
							renderAddendumFields={base => renderCommissionGrid(base)}
							contractStartYearPath={"startYear" as Path<ContractFormValues>}
							contractStartMonthPath={"startMonth" as Path<ContractFormValues>}
							contractEndYearPath={"endYear" as Path<ContractFormValues>}
							contractEndMonthPath={"endMonth" as Path<ContractFormValues>}
						/>
					</div>
				)
				: null}
		</>
	);
}
