import type { ContractServicePath } from "../../../api/contracts.api";
import { RecordListPanel } from "#src/shared/ui/record-list-panel";
import { DownOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { fetchCompanyContracts } from "../../../api/contracts.api";

interface CompanyContractDto {
	id: number
	service?: number
	service_id?: number
	contract_number?: string | null
	start_jy?: number | null
	start_jm?: number | null
	end_jy?: number | null
	end_jm?: number | null
}

interface Props {
	companyId?: number | null
	companyType?: string | null
	currentContractId: number
	service?: ContractServicePath | null
	serviceId?: number | null
	onSelect: (contract: CompanyContractDto) => void
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

function DateRange({ start, end }: { start: string, end: string }) {
	return (
		<span className="inline-flex items-center gap-1 whitespace-nowrap" dir="ltr">
			<bdi dir="ltr">{start}</bdi>
			<span dir="rtl">تا</span>
			<bdi dir="ltr">{end}</bdi>
		</span>
	);
}

export function CompanyContractsPanel({ companyId, companyType, currentContractId, service, serviceId, onSelect }: Props) {
	const contractsQuery = useQuery({
		queryKey: ["contracts", "company-contracts", service, serviceId ?? null, companyId, companyType ?? null],
		queryFn: () => fetchCompanyContracts(service!, companyId!, companyType, serviceId),
		enabled: service != null && companyId != null && companyId > 0,
	});

	const contracts = contractsQuery.data?.results ?? [];
	const contractByKey = useMemo(
		() => new Map(contracts.map(contract => [String(contract.id), contract])),
		[contracts],
	);

	const items = contracts.map((contract) => {
		const isCurrent = contract.id === currentContractId;
		const contractLabel = contract.contract_number?.trim() || formatFaNumber(contract.id);
		const activeRangeStart = formatJalaliDate(contract.start_jy, contract.start_jm);
		const activeRangeEnd = formatJalaliDate(contract.end_jy, contract.end_jm);

		return {
			key: String(contract.id),
			showArrow: false,
			label: (
				<div className="flex min-w-0 items-center justify-between gap-3">
					<span className="max-w-full truncate rounded-lg bg-primaryBgHover px-2.5 py-1 font-medium text-text">
						قرارداد شماره
						{" "}
						{contractLabel}
					</span>
					<DownOutlined
						className={`shrink-0 text-primary transition-transform ${isCurrent ? "rotate-180" : ""}`}
					/>
				</div>
			),
			children: (
				<div className="grid gap-2.5 text-sm">
					<div className="flex justify-between gap-4">
						<span className="font-medium text-textSecondary">بازه فعال</span>
						<span className="text-text"><DateRange start={activeRangeStart} end={activeRangeEnd} /></span>
					</div>
					<div className="flex justify-between gap-4">
						<span className="font-medium text-textSecondary">تاریخ شروع</span>
						<span className="text-text">{formatJalaliDate(contract.start_jy, contract.start_jm)}</span>
					</div>
					<div className="flex justify-between gap-4">
						<span className="font-medium text-textSecondary">تاریخ پایان</span>
						<span className="text-text">{formatJalaliDate(contract.end_jy, contract.end_jm)}</span>
					</div>
				</div>
			),
		};
	});

	return (
		<RecordListPanel
			title="قراردادهای شرکت"
			items={items}
			activeKey={String(currentContractId)}
			activeItemClassName="[&_.ant-collapse-item-active]:!bg-[#1f2e52]"
			loading={contractsQuery.isLoading || contractsQuery.isFetching}
			error={contractsQuery.isError}
			errorMessage="دریافت قراردادهای شرکت ناموفق بود"
			emptyDescription="قرارداد دیگری یافت نشد"
			unavailableDescription={!service || !companyId ? "ابتدا سرویس و شرکت را انتخاب کنید" : undefined}
			onSelect={(key) => {
				const selectedContract = contractByKey.get(key);
				if (selectedContract && selectedContract.id !== currentContractId)
					onSelect(selectedContract);
			}}
		/>
	);
}
