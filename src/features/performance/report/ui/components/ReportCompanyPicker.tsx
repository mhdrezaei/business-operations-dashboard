import type { ReportSelectOption } from "../constants";
import { DashedBorder } from "#src/shared/ui/dashed-border";
import { DownOutlined, SearchOutlined, UpOutlined } from "@ant-design/icons";
import { Checkbox, Input, Spin } from "antd";
import { useMemo, useState } from "react";
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
		<section className="report-company-picker" aria-label="لیست شرکت‌ها">
			<DashedBorder />
			<div className="report-company-picker__content">
				<div className="report-company-picker__heading">
					<div className="report-company-picker__title">
						<span className="report-company-picker__search-icon" aria-hidden="true"><SearchOutlined /></span>
						<span>لیست شرکت‌ها</span>
					</div>
					<button
						type="button"
						className="report-company-picker__toggle"
						aria-label={collapsed ? "نمایش لیست شرکت‌ها" : "بستن لیست شرکت‌ها"}
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
						placeholder="جستجوی شرکت..."
						onChange={event => setSearchValue(event.target.value)}
					/>

					<div className="report-company-picker__options" aria-live="polite">
						{loading && (
							<div className="report-company-picker__empty">
								<Spin size="small" />
								<span>در حال دریافت شرکت‌ها...</span>
							</div>
						)}
						{!loading && disabled && (
							<div className="report-company-picker__empty">ابتدا فیلترهای دوره گزارش را کامل کنید.</div>
						)}
						{!loading && !disabled && visibleOptions.length === 0 && (
							<div className="report-company-picker__empty">
								{hasSearchValue ? "شرکتی با این نام پیدا نشد." : "شرکتی برای این دوره یافت نشد."}
							</div>
						)}
						{!loading && !disabled && !hasSearchValue && companyIds.length > 0 && (
							<Checkbox
								className="report-company-picker__option report-company-picker__option--all"
								checked={allCompaniesSelected}
								indeterminate={!allCompaniesSelected && selectedCompanyCount > 0}
								onChange={event => toggleAllCompanies(event.target.checked)}
							>
								انتخاب همه
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
