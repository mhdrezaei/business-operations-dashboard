import type { ContractServicePath } from "../../api/contracts.api";
import { dayjs } from "#src/shared/lib/dayjs-jalali";
import { RecordListPanel } from "#src/shared/ui/record-list-panel";
import { DownOutlined, EditOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Button, Tag } from "antd";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchCompanyContracts } from "../../api/contracts.api";
import { sortByStartDesc } from "../model/contract-order";
import { companyContractsRootKey } from "../queries/contract.queries";

interface CompanyContractDto {
	id: number
	service?: number
	service_id?: number
	contract_number?: string | null
	start_jy?: number | null
	start_jm?: number | null
	end_jy?: number | null
	end_jm?: number | null
	is_official?: boolean | null
	/** [from, to] — بازهٔ فعال تا انتهای زنجیرهٔ الحاقیه‌ها */
	full_active_period?: [string, string] | null
}

interface Props {
	companyId?: number | null
	companyType?: string | null
	currentContractId: number
	service?: ContractServicePath | null
	serviceId?: number | null
	/** Traffic only: restrict to official (true) / unofficial (false) contracts. */
	isOfficial?: boolean | null
	onSelect?: (contract: CompanyContractDto) => void
	/** Create-page mode: items just expand, and each shows an edit action. */
	onEdit?: (contract: CompanyContractDto) => void
}

function formatFaNumber(value: unknown) {
	if (value == null || value === "")
		return "—";
	return new Intl.NumberFormat("fa-IR", { useGrouping: false }).format(Number(value));
}

function formatJalaliDate(year?: number | null, month?: number | null) {
	if (year == null || month == null)
		return "—";
	return `${formatFaNumber(year)}/${formatFaNumber(month)}`;
}

/** بازهٔ فعال کامل (شامل الحاقیه‌ها) به‌صورت جلالی؛ بدون آن همان شروع–پایان قرارداد نمایش داده می‌شود. */
function formatFullActivePeriod(period: CompanyContractDto["full_active_period"]) {
	if (!Array.isArray(period) || period.length < 2 || !period[0] || !period[1])
		return null;
	const [from, to] = period.map(date => dayjs(date).calendar("jalali").format("YYYY/MM/DD"));
	return { start: from, end: to };
}

function DateRange({ start, end }: { start: string, end: string }) {
	const { t } = useTranslation();
	return (
		<span className="inline-flex items-center gap-1 whitespace-nowrap" dir="ltr">
			<bdi dir="ltr">{start}</bdi>
			<span dir="rtl">{t("contract.companyContracts.to")}</span>
			<bdi dir="ltr">{end}</bdi>
		</span>
	);
}

export function CompanyContractsPanel({ companyId, companyType, currentContractId, service, serviceId, isOfficial, onSelect, onEdit }: Props) {
	const { t } = useTranslation();
	const [openKey, setOpenKey] = useState<string>();
	// sms/vendor contracts are listed without a company (like the old create page)
	const companyOptional = service === "sms/vendor";
	const hasCompany = companyId != null && companyId > 0;
	const contractsQuery = useQuery({
		queryKey: [...companyContractsRootKey, service, serviceId ?? null, companyId, companyType ?? null, isOfficial ?? null],
		queryFn: () => fetchCompanyContracts(service!, hasCompany ? companyId! : null, companyType, serviceId, { isOfficial }),
		enabled: service != null && (hasCompany || companyOptional),
	});

	const contracts = useMemo(() => sortByStartDesc(contractsQuery.data?.results ?? []), [contractsQuery.data]);
	const contractByKey = useMemo(
		() => new Map(contracts.map(contract => [String(contract.id), contract])),
		[contracts],
	);

	const items = contracts.map((contract) => {
		const isCurrent = contract.id === currentContractId;
		const contractLabel = contract.contract_number?.trim() || formatFaNumber(contract.id);
		const activeRange = formatFullActivePeriod(contract.full_active_period);
		const activeRangeStart = activeRange?.start ?? formatJalaliDate(contract.start_jy, contract.start_jm);
		const activeRangeEnd = activeRange?.end ?? formatJalaliDate(contract.end_jy, contract.end_jm);

		return {
			key: String(contract.id),
			showArrow: false,
			label: (
				<div className="flex min-w-0 items-center justify-between gap-3">
					<span className="flex min-w-0 items-center gap-2">
						<span className="max-w-full truncate rounded-lg bg-primaryBgHover px-2.5 py-1 font-medium text-text">
							{t("contract.companyContracts.contractNumber")}
							{" "}
							{contractLabel}
						</span>
						{contract.is_official != null && (
							<Tag className="m-0" color={contract.is_official ? "processing" : "default"}>
								{t(contract.is_official ? "contract.createPanel.official" : "contract.createPanel.unofficial")}
							</Tag>
						)}
					</span>
					<DownOutlined
						className={`shrink-0 text-primary transition-transform ${isCurrent ? "rotate-180" : ""}`}
					/>
				</div>
			),
			children: (
				<div className="grid gap-2.5 text-sm">
					<div className="flex justify-between gap-4">
						<span className="font-medium text-textSecondary">{t("contract.companyContracts.activeRange")}</span>
						<span className="text-text"><DateRange start={activeRangeStart} end={activeRangeEnd} /></span>
					</div>
					<div className="flex justify-between gap-4">
						<span className="font-medium text-textSecondary">{t("contract.companyContracts.startDate")}</span>
						<span className="text-text">{formatJalaliDate(contract.start_jy, contract.start_jm)}</span>
					</div>
					<div className="flex justify-between gap-4">
						<span className="font-medium text-textSecondary">{t("contract.companyContracts.endDate")}</span>
						<span className="text-text">{formatJalaliDate(contract.end_jy, contract.end_jm)}</span>
					</div>
					{onEdit && (
						<Button type="link" icon={<EditOutlined />} className="min-h-11 justify-self-start px-0" onClick={() => onEdit(contract)}>
							{t("contract.createPanel.edit")}
						</Button>
					)}
				</div>
			),
		};
	});

	return (
		<RecordListPanel
			title={t("contract.companyContracts.title")}
			items={items}
			activeKey={onEdit ? openKey : String(currentContractId)}
			activeItemClassName="[&_.ant-collapse-item-active]:!bg-[#1f2e52]"
			loading={contractsQuery.isLoading || contractsQuery.isFetching}
			error={contractsQuery.isError}
			errorMessage={t("contract.companyContracts.loadFailed")}
			emptyDescription={t("contract.companyContracts.empty")}
			unavailableDescription={!service || (!hasCompany && !companyOptional) ? t("contract.companyContracts.selectFirst") : undefined}
			onSelect={(key) => {
				if (onEdit) {
					setOpenKey(key);
					return;
				}
				const selectedContract = contractByKey.get(key);
				if (selectedContract && selectedContract.id !== currentContractId)
					onSelect?.(selectedContract);
			}}
		/>
	);
}
