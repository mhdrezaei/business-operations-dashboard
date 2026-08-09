import type { ContractServicePath } from "../../../api/contracts.api";
import { DownOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Alert, Card, Collapse, Empty, Spin } from "antd";
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
		const activeRange = `${formatJalaliDate(contract.start_jy, contract.start_jm)} تا ${formatJalaliDate(contract.end_jy, contract.end_jm)}`;

		return {
			key: String(contract.id),
			showArrow: false,
			style: {
				borderBottom: `1px solid var(${isCurrent ? "--ant-color-primary" : "--ant-color-border"})`,
			},
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
						<span className="text-text" dir="ltr">{activeRange}</span>
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
		<Card
			size="small"
			title="قراردادهای شرکت"
			className="w-full !rounded-2xl !bg-bgContainer [&_.ant-card-body]:px-3 [&_.ant-card-body]:pb-4 [&_.ant-card-body]:pt-1 [&_.ant-card-head-title]:text-base [&_.ant-card-head-title]:font-semibold [&_.ant-card-head]:min-h-0 [&_.ant-card-head]:border-0 [&_.ant-card-head]:px-4 [&_.ant-card-head]:pb-2 [&_.ant-card-head]:pt-4"
		>
			{!service || !companyId
				? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="ابتدا سرویس و شرکت را انتخاب کنید" />
				: contractsQuery.isLoading || contractsQuery.isFetching
					? (
						<div className="flex min-h-32 items-center justify-center">
							<Spin />
						</div>
					)
					: contractsQuery.isError
						? <Alert type="error" showIcon message="دریافت قراردادهای شرکت ناموفق بود" />
						: items.length === 0
							? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="قرارداد دیگری یافت نشد" />
							: (
								<Collapse
									accordion
									items={items}
									activeKey={String(currentContractId)}
									className="!border-0 !bg-transparent [&_.ant-collapse-content-box]:!px-4 [&_.ant-collapse-content-box]:!pb-4 [&_.ant-collapse-content-box]:!pt-0 [&_.ant-collapse-content]:!border-0 [&_.ant-collapse-content]:!bg-transparent [&_.ant-collapse-header]:!px-4 [&_.ant-collapse-header]:!py-4 [&_.ant-collapse-item.ant-collapse-item-active]:!border-primary [&_.ant-collapse-item]:mb-3 [&_.ant-collapse-item]:overflow-hidden [&_.ant-collapse-item]:!rounded-2xl [&_.ant-collapse-item]:border [&_.ant-collapse-item]:border-solid [&_.ant-collapse-item]:!border-[var(--ant-color-border)] [&_.ant-collapse-item]:!bg-bgElevated [&_.ant-collapse-item:last-child]:mb-0"
									onChange={(key) => {
										const nextKey = Array.isArray(key) ? key[0] : key;
										if (!nextKey)
											return;
										const selectedContract = contractByKey.get(String(nextKey));
										if (selectedContract && selectedContract.id !== currentContractId)
											onSelect(selectedContract);
									}}
								/>
							)}
		</Card>
	);
}
