import type { PredictionServiceCode } from "../../../model/prediction.form.types";
import { RecordListPanel } from "#src/shared/ui/record-list-panel";
import { DownOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { predictionServiceRegistry } from "../../../services/registry";

interface Props {
	serviceId: number
	serviceCode: PredictionServiceCode
	serviceLabel: string
	companyType?: string | null
	currentRecordId?: number | null
	onSelect: (record: unknown) => void
}

function formatFaNumber(value: unknown) {
	if (value == null || value === "")
		return "—";
	const number = Number(value);
	if (!Number.isFinite(number))
		return String(value);
	return new Intl.NumberFormat("fa-IR").format(number);
}

function formatFaYear(value: unknown) {
	if (value == null || value === "")
		return "—";
	const number = Number(value);
	if (!Number.isFinite(number))
		return String(value);
	return new Intl.NumberFormat("fa-IR", { useGrouping: false }).format(number);
}

function readRecordValue(record: unknown, key: string) {
	return record && typeof record === "object" ? (record as Record<string, unknown>)[key] : null;
}

export function RegisteredPredictionsPanel({
	serviceId,
	serviceCode,
	serviceLabel,
	companyType,
	currentRecordId,
	onSelect,
}: Props) {
	const module = predictionServiceRegistry[serviceCode];
	const predictionsQuery = useQuery({
		queryKey: module?.getYearsQueryKey(serviceId, companyType) ?? ["predictions", "registered", serviceId, serviceCode, companyType],
		queryFn: () => module!.fetchYears(serviceId, companyType),
		enabled: !!module && serviceId > 0,
		staleTime: 30 * 1000,
	});
	const records = predictionsQuery.data?.results ?? [];
	const recordByKey = useMemo(
		() => new Map(records.map(record => [String(readRecordValue(record, "id")), record])),
		[records],
	);

	const items = records.map((record) => {
		const id = Number(readRecordValue(record, "id"));
		const fiscalYear = readRecordValue(record, "fiscal_year");
		const row = module!.toListRow(record, {
			serviceCode,
			serviceId,
			serviceLabel,
		});
		const isCurrent = id === currentRecordId;
		const quarterValues = ["q1_percent", "q2_percent", "q3_percent", "q4_percent"]
			.map(key => formatFaNumber(readRecordValue(record, key)));

		return {
			key: String(id),
			showArrow: false,
			label: (
				<div className="flex min-w-0 items-center justify-between gap-3">
					<span className="max-w-full truncate rounded-lg bg-primaryBgHover px-2.5 py-1 font-medium text-text">
						پیش‌بینی سال
						{" "}
						{formatFaYear(fiscalYear)}
					</span>
					<DownOutlined
						className={`shrink-0 text-primary transition-transform ${isCurrent ? "rotate-180" : ""}`}
					/>
				</div>
			),
			children: (
				<div className="grid gap-2.5 text-sm">
					{quarterValues.map((value, index) => (
						<div key={`q${index + 1}`} className="flex justify-between gap-4">
							<span className="font-medium text-textSecondary">
								کوارتر
								{" "}
								{formatFaNumber(index + 1)}
							</span>
							<span className="text-text" dir="ltr">
								{value}
								%
							</span>
						</div>
					))}
					<div className="flex justify-between gap-4">
						<span className="shrink-0 font-medium text-textSecondary">جزئیات</span>
						<span className="min-w-0 text-start leading-7 text-text">{row.preview}</span>
					</div>
				</div>
			),
		};
	});

	return (
		<RecordListPanel
			title={`پیش‌بینی‌های ثبت‌شده (${formatFaNumber(records.length)})`}
			items={items}
			activeKey={currentRecordId ? String(currentRecordId) : undefined}
			loading={predictionsQuery.isLoading || predictionsQuery.isFetching}
			error={predictionsQuery.isError}
			errorMessage="دریافت پیش‌بینی‌های ثبت‌شده ناموفق بود"
			emptyDescription="پیش‌بینی ثبت‌شده‌ای یافت نشد"
			onSelect={(key) => {
				const record = recordByKey.get(key);
				if (record)
					onSelect(record);
			}}
		/>
	);
}
