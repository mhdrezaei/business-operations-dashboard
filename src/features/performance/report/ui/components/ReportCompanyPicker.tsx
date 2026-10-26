import type { ReportSelectOption } from "../constants";
import { DashedBorder } from "#src/shared/ui/dashed-border";
import { DownOutlined, SearchOutlined, UpOutlined } from "@ant-design/icons";
import { Checkbox, Input, Spin } from "antd";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import "./report-company-picker.css";

interface ReportCompanyPickerProps {
	options: ReportSelectOption[]
	selectedCompanyIds: number[]
	disabled?: boolean
	loading?: boolean
	onChange: (companyIds: number[]) => void
}

function normalizeSearchValue(value: string) {
	return value.trim().toLocaleLowerCase("fa");
}

export function ReportCompanyPicker({
	options,
	selectedCompanyIds,
	disabled = false,
	loading = false,
	onChange,
}: ReportCompanyPickerProps) {
	const { t } = useTranslation();
	const [collapsed, setCollapsed] = useState(false);
	const [searchValue, setSearchValue] = useState("");
	const selectedSet = useMemo(() => new Set(selectedCompanyIds), [selectedCompanyIds]);
	const companyIds = useMemo(() => options.map(option => Number(option.value)), [options]);
	const selectedCompanyCount = companyIds.filter(companyId => selectedSet.has(companyId)).length;
	const allCompaniesSelected = companyIds.length > 0 && selectedCompanyCount === companyIds.length;
	const hasSearchValue = normalizeSearchValue(searchValue).length > 0;
	const visibleOptions = useMemo(() => {
		const query = normalizeSearchValue(searchValue);
		if (!query)
			return options;
		return options.filter(option => normalizeSearchValue(option.label).includes(query));
	}, [options, searchValue]);

	const toggleCompany = (companyId: number, checked: boolean) => {
		const next = new Set(selectedCompanyIds);
		if (checked)
			next.add(companyId);
		else
			next.delete(companyId);
		onChange(options.map(option => Number(option.value)).filter(companyIdValue => next.has(companyIdValue)));
	};

	const toggleAllCompanies = (checked: boolean) => {
		onChange(checked ? companyIds : []);
	};

	return (
		<section className="report-company-picker" aria-label={t("performance.reportPage.companyPicker.title")}>
			<DashedBorder />
			<div className="report-company-picker__content">
				<div className="report-company-picker__heading">
					<div className="report-company-picker__title">
						<span className="report-company-picker__search-icon" aria-hidden="true"><SearchOutlined /></span>
						<span>{t("performance.reportPage.companyPicker.title")}</span>
					</div>
					<button
						type="button"
						className="report-company-picker__toggle"
						aria-label={collapsed ? t("performance.reportPage.companyPicker.show") : t("performance.reportPage.companyPicker.hide")}
						aria-expanded={!collapsed}
						aria-controls="report-company-picker-content"
						onClick={() => setCollapsed(current => !current)}
					>
						{collapsed ? <DownOutlined /> : <UpOutlined />}
					</button>
				</div>

				<div id="report-company-picker-content" className="report-company-picker__body" hidden={collapsed}>
					<Input
						allowClear
						className="report-company-picker__search"
						value={searchValue}
						disabled={disabled || loading}
						placeholder={t("performance.reportPage.companyPicker.searchPlaceholder")}
						onChange={event => setSearchValue(event.target.value)}
					/>

					<div className="report-company-picker__options" aria-live="polite">
						{loading && (
							<div className="report-company-picker__empty">
								<Spin size="small" />
								<span>{t("performance.placeholders.loadingCompanies")}</span>
							</div>
						)}
						{!loading && disabled && (
							<div className="report-company-picker__empty">{t("performance.reportPage.companyPicker.completeFilters")}</div>
						)}
						{!loading && !disabled && visibleOptions.length === 0 && (
							<div className="report-company-picker__empty">
								{hasSearchValue ? t("performance.reportPage.companyPicker.noSearchResult") : t("performance.reportPage.companyPicker.noCompanies")}
							</div>
						)}
						{!loading && !disabled && !hasSearchValue && companyIds.length > 0 && (
							<Checkbox
								className="report-company-picker__option report-company-picker__option--all"
								checked={allCompaniesSelected}
								indeterminate={!allCompaniesSelected && selectedCompanyCount > 0}
								onChange={event => toggleAllCompanies(event.target.checked)}
							>
								{t("performance.labels.selectAll")}
							</Checkbox>
						)}
						{!loading && !disabled && visibleOptions.map((option) => {
							const companyId = Number(option.value);
							return (
								<Checkbox
									key={companyId}
									className="report-company-picker__option"
									checked={selectedSet.has(companyId)}
									onChange={event => toggleCompany(companyId, event.target.checked)}
								>
									{option.label}
								</Checkbox>
							);
						})}
					</div>
				</div>
			</div>
		</section>
	);
}
