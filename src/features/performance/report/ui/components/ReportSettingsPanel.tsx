import type { ReportAggregationKey, ReportAuditColumnKey, ReportSelectOption } from "../constants";
import type { ReportFinancialColumnKey } from "../export";
import FilterIcon from "#src/assets/svg/performance/report-filter.svg?react";
import FinanceIcon from "#src/assets/svg/performance/report-finance.svg?react";
import SumIcon from "#src/assets/svg/performance/report-sum.svg?react";
import { DashedBorder } from "#src/shared/ui/dashed-border";
import { DownOutlined, UpOutlined } from "@ant-design/icons";
import { Switch } from "antd";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import "./report-settings-panel.css";

interface ReportSettingsPanelProps {
	financialOptions: ReportSelectOption[]
	aggregationOptions: ReportSelectOption[]
	auditOptions: ReportSelectOption[]
	selectedFinancialColumns: ReportFinancialColumnKey[]
	selectedAggregation: ReportAggregationKey[]
	selectedAuditColumns: ReportAuditColumnKey[]
	disabled?: boolean
	auditDisabled?: boolean
	aggregationDisabledKeys?: ReportAggregationKey[]
	onFinancialColumnsChange: (values: ReportFinancialColumnKey[]) => void
	onAggregationChange: (values: ReportAggregationKey[]) => void
	onAuditColumnsChange: (values: ReportAuditColumnKey[]) => void
}

interface SettingCardProps<T extends string> {
	title: string
	icon: React.ReactNode
	options: ReportSelectOption[]
	selectedValues: T[]
	disabled?: boolean
	showSelectAll?: boolean
	footerKeys?: string[]
	disabledKeys?: string[]
	onChange: (values: T[]) => void
}

function SettingCard<T extends string>({
	title,
	icon,
	options,
	selectedValues,
	disabled = false,
	showSelectAll = false,
	footerKeys = [],
	disabledKeys,
	onChange,
}: SettingCardProps<T>) {
	const { t } = useTranslation();
	const values = useMemo(() => options.map(option => String(option.value) as T), [options]);
	const selectedSet = useMemo(() => new Set(selectedValues), [selectedValues]);
	const allSelected = values.length > 0 && values.every(value => selectedSet.has(value));
	const footerSet = useMemo(() => new Set(footerKeys), [footerKeys]);
	const mainOptions = options.filter(option => !footerSet.has(String(option.value)));
	const footerOptions = options.filter(option => footerSet.has(String(option.value)));

	const toggleValue = (value: T, checked: boolean) => {
		const nextSet = new Set(selectedValues);
		if (checked)
			nextSet.add(value);
		else
			nextSet.delete(value);
		onChange(values.filter(optionValue => nextSet.has(optionValue)));
	};

	const renderOption = (option: ReportSelectOption) => {
		const value = String(option.value) as T;
		return (
			<label key={value} className="report-settings-panel__row">
				<span>{option.label}</span>
				<Switch
					size="small"
					aria-label={String(option.label)}
					checked={selectedSet.has(value)}
					disabled={disabled || !!disabledKeys?.includes(value)}
					onChange={checked => toggleValue(value, checked)}
				/>
			</label>
		);
	};

	return (
		<section className="report-settings-panel__card" aria-label={title} aria-disabled={disabled}>
			<DashedBorder />
			<div className="report-settings-panel__card-content">
				<div className="report-settings-panel__card-title">
					{icon}
					<span>{title}</span>
				</div>
				<div className="report-settings-panel__rows">
					{showSelectAll && (
						<label className="report-settings-panel__row report-settings-panel__row--all">
							<span>{t("performance.labels.selectAll")}</span>
							<Switch
								size="small"
								aria-label={`${title} - ${t("performance.labels.selectAll")}`}
								checked={allSelected}
								disabled={disabled || values.length === 0}
								onChange={checked => onChange(checked ? values : [])}
							/>
						</label>
					)}
					{mainOptions.map(renderOption)}
					{footerOptions.length > 0 && (
						<div className="report-settings-panel__footer-rows">
							{footerOptions.map(renderOption)}
						</div>
					)}
				</div>
			</div>
		</section>
	);
}

export function ReportSettingsPanel({
	financialOptions,
	aggregationOptions,
	auditOptions,
	selectedFinancialColumns,
	selectedAggregation,
	selectedAuditColumns,
	disabled = false,
	auditDisabled = false,
	aggregationDisabledKeys,
	onFinancialColumnsChange,
	onAggregationChange,
	onAuditColumnsChange,
}: ReportSettingsPanelProps) {
	const { t } = useTranslation();
	const [collapsed, setCollapsed] = useState(false);

	return (
		<section className="report-settings-panel" aria-label={t("performance.reportPage.settings.title")}>
			<button
				type="button"
				className="report-settings-panel__accordion-header"
				aria-expanded={!collapsed}
				aria-controls="report-settings-panel-content"
				onClick={() => setCollapsed(current => !current)}
			>
				<span className="report-settings-panel__badge">{t("performance.reportPage.settings.title")}</span>
				<span className="report-settings-panel__divider" aria-hidden="true" />
				<span className="report-settings-panel__toggle" aria-hidden="true">
					{collapsed ? <DownOutlined /> : <UpOutlined />}
				</span>
			</button>

			<div id="report-settings-panel-content" className="report-settings-panel__body" hidden={collapsed}>
				<SettingCard<ReportFinancialColumnKey>
					title={t("performance.reportPage.settings.financialColumns")}
					icon={<FinanceIcon />}
					options={financialOptions}
					selectedValues={selectedFinancialColumns}
					disabled={disabled}
					showSelectAll
					footerKeys={["rial", "total"]}
					onChange={onFinancialColumnsChange}
				/>
				<div className="report-settings-panel__side">
					<SettingCard<ReportAggregationKey>
						title={t("performance.reportPage.settings.aggregation")}
						icon={<SumIcon />}
						options={aggregationOptions}
						selectedValues={selectedAggregation}
						disabled={disabled}
						showSelectAll
						disabledKeys={aggregationDisabledKeys}
						onChange={onAggregationChange}
					/>
					<SettingCard<ReportAuditColumnKey>
						title={t("performance.reportPage.settings.auditColumns")}
						icon={<FilterIcon />}
						options={auditOptions}
						selectedValues={auditDisabled ? [] : selectedAuditColumns}
						disabled={disabled || auditDisabled}
						onChange={onAuditColumnsChange}
					/>
				</div>
			</div>
		</section>
	);
}
