import type { PredictionServiceCode } from "../../../model/prediction.form.types";
import { ContractDashedBorder } from "#src/features/contract/shared/ui/form/components/ContractDashedBorder";
import { DownOutlined, EditOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Alert, Card, Collapse, Empty, Spin, Tag } from "antd";
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
				<div className="prediction-registered-item__label">
					<span>
						پیش‌بینی سال
						{" "}
						{formatFaNumber(fiscalYear)}
					</span>
					<div className="prediction-registered-item__icons">
						<EditOutlined />
						<DownOutlined className={isCurrent ? "rotate-180" : ""} />
					</div>
				</div>
			),
			children: (
				<div className="prediction-registered-item__details">
					<ContractDashedBorder />
					<div className="prediction-registered-item__quarters">
						{quarterValues.map((value, index) => (
							<span key={index}>
								Q
								{index + 1}
								:
								{" "}
								{value}
								%
							</span>
						))}
					</div>
					<p>{row.preview}</p>
				</div>
			),
		};
	});

	return (
		<Card
			size="small"
			title={(
				<div className="prediction-registered-panel__title">
					<Tag bordered={false}>پیش‌بینی‌های ثبت‌شده</Tag>
					<span>
						(
						{formatFaNumber(records.length)}
						)
					</span>
				</div>
			)}
			className="prediction-registered-panel"
		>
			{predictionsQuery.isLoading || predictionsQuery.isFetching
				? (
					<div className="prediction-registered-panel__loading">
						<Spin />
					</div>
				)
				: predictionsQuery.isError
					? <Alert type="error" showIcon message="دریافت پیش‌بینی‌های ثبت‌شده ناموفق بود" />
					: items.length === 0
						? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="پیش‌بینی ثبت‌شده‌ای یافت نشد" />
						: (
							<Collapse
								accordion
								items={items}
								activeKey={currentRecordId ? String(currentRecordId) : undefined}
								className="prediction-registered-list"
								onChange={(key) => {
									const nextKey = Array.isArray(key) ? key[0] : key;
									if (!nextKey)
										return;
									const record = recordByKey.get(String(nextKey));
									if (record)
										onSelect(record);
								}}
							/>
						)}
		</Card>
	);
}
