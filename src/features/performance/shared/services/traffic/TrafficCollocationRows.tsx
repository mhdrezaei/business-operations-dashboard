import type { CollocationDatacenter, CollocationPartnerType, CollocationRow } from "./traffic-collocation";
import { FieldCard } from "#src/shared/ui/dashed-card";
import { DeleteOutlined } from "@ant-design/icons";
import { Button, Select, Tag, Typography } from "antd";
import { useMemo } from "react";
import { useFormContext, useFormState, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { buildCollocationRow, COLLOCATION_ROW_METRICS, missingCollocationDatacenters } from "./traffic-collocation";
import { TrafficMetricField } from "./TrafficMetricField";

interface TrafficCollocationRowsProps {
	/** مسیر آرایه ردیف‌ها در فرم (مثلاً `serviceFields.collocationRows`) */
	name: string
	/** دیتاسنترهای قابل انتخاب (طبق قرارداد) */
	datacenters: CollocationDatacenter[]
	partnerType: CollocationPartnerType | null | undefined
	loading?: boolean
}

/** ویرایشگر ردیف‌های مصرف دیتاسنتر (IP، پهنای‌باند، آمپر) برای عملکرد ترافیک COLLOCATION. */
export function TrafficCollocationRows({ name, datacenters, partnerType, loading }: TrafficCollocationRowsProps) {
	const { t } = useTranslation();
	const { control, setValue, getFieldState } = useFormContext();
	const formState = useFormState({ control, name });
	const rows = (useWatch({ control, name }) as CollocationRow[] | undefined) ?? [];
	const addOptions = useMemo(
		() => missingCollocationDatacenters(rows, datacenters).map(item => ({ label: item.datacenterName, value: item.datacenter })),
		[rows, datacenters],
	);
	const error = formState.isSubmitted ? getFieldState(name, formState).error?.message : undefined;

	function addRow(datacenter: number) {
		const selected = datacenters.find(item => item.datacenter === datacenter);
		if (!selected || rows.some(row => row.datacenter === datacenter))
			return;
		setValue(name, [...rows, buildCollocationRow(selected)], { shouldDirty: true, shouldValidate: false });
	}

	function removeRow(datacenter: number) {
		setValue(name, rows.filter(row => row.datacenter !== datacenter), { shouldDirty: true, shouldValidate: formState.isSubmitted });
	}

	return (
		<div className="performance-traffic-locations">
			{loading
				? <Typography.Text type="secondary">{t("performance.traffic.collocation.loadingContracts")}</Typography.Text>
				: rows.length < 1
					? <Typography.Text type="secondary">{t("performance.traffic.collocation.noRows")}</Typography.Text>
					: rows.map((row, index) => (
						<FieldCard
							key={row.datacenter}
							title={row.datacenterName}
							className="performance-traffic-location"
							extra={(
								<div className="flex items-center gap-2">
									{partnerType ? <Tag>{partnerType}</Tag> : null}
									<Button size="small" danger icon={<DeleteOutlined />} onClick={() => removeRow(row.datacenter)}>
										{t("common.delete")}
									</Button>
								</div>
							)}
						>
							<div className="performance-traffic-location__fields">
								{COLLOCATION_ROW_METRICS.map(metric => (
									<TrafficMetricField
										key={metric}
										name={`${name}.${index}.${metric}`}
										label={t(`performance.traffic.collocation.metrics.${metric}`)}
										decimal
									/>
								))}
							</div>
						</FieldCard>
					))}
			{error ? <Typography.Text type="danger">{error}</Typography.Text> : null}
			<div className="performance-traffic-location__field">
				<label className="performance-traffic-location__label" htmlFor={`${name}-add`}>{t("performance.traffic.collocation.addDatacenter")}</label>
				<Select
					id={`${name}-add`}
					value={null}
					showSearch
					optionFilterProp="label"
					options={addOptions}
					disabled={loading || addOptions.length < 1}
					placeholder={addOptions.length < 1 ? t("performance.traffic.collocation.noMoreDatacenters") : t("performance.traffic.collocation.addDatacenterPlaceholder")}
					onChange={addRow}
				/>
			</div>
		</div>
	);
}
