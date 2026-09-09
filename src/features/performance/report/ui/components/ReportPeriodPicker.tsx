import type { PeriodType, ReportSelectOption } from "../constants";
import SelectedMonthIcon from "#src/assets/svg/performance/selected-month.svg?react";
import { ContractDashedBorder } from "#src/features/contract/shared/ui/form/components/ContractDashedBorder";
import { CalendarOutlined, CloseOutlined, DeleteOutlined, DownOutlined, PlusOutlined, UpOutlined } from "@ant-design/icons";
import { Button, Select, Typography } from "antd";
import { useMemo, useState } from "react";
import "./report-period-picker.css";

interface ParsedPeriod {
	year: number
	month: number
	value: string
}

interface ReportPeriodPickerProps {
	yearOptions: ReportSelectOption[]
	periodOptions: ReportSelectOption[]
	periodTypeOptions: ReportSelectOption[]
	selectedPeriodType: PeriodType
	selectedPeriods: string[]
	disabled?: boolean
	onPeriodTypeChange: (value: PeriodType) => void
	onPeriodsChange: (values: string[]) => void
}

const MONTH_NAMES = [
	"فروردین",
	"اردیبهشت",
	"خرداد",
	"تیر",
	"مرداد",
	"شهریور",
	"مهر",
	"آبان",
	"آذر",
	"دی",
	"بهمن",
	"اسفند",
];

function parsePeriod(value: string | number): ParsedPeriod | null {
	const [yearRaw, monthRaw] = String(value).split("-");
	const year = Number(yearRaw);
	const month = Number(monthRaw);
	if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12)
		return null;
	return { year, month, value: `${year}-${month}` };
}

function sortPeriods(values: string[]) {
	return [...values].sort((first, second) => {
		const parsedFirst = parsePeriod(first);
		const parsedSecond = parsePeriod(second);
		if (!parsedFirst || !parsedSecond)
			return first.localeCompare(second);
		return parsedFirst.year - parsedSecond.year || parsedFirst.month - parsedSecond.month;
	});
}

export function ReportPeriodPicker({
	yearOptions,
	periodOptions,
	periodTypeOptions,
	selectedPeriodType,
	selectedPeriods,
	disabled = false,
	onPeriodTypeChange,
	onPeriodsChange,
}: ReportPeriodPickerProps) {
	const [collapsed, setCollapsed] = useState(false);
	const [draftYear, setDraftYear] = useState<number | null>(null);
	const [draftMonths, setDraftMonths] = useState<number[]>([]);

	const parsedOptions = useMemo(
		() => periodOptions.map(option => parsePeriod(option.value)).filter((item): item is ParsedPeriod => item !== null),
		[periodOptions],
	);
	const selectedPeriodSet = useMemo(() => new Set(selectedPeriods), [selectedPeriods]);
	const periodLabels = useMemo(() => {
		return periodOptions.reduce<Record<string, string>>((labels, option) => {
			labels[String(option.value)] = option.label;
			return labels;
		}, {});
	}, [periodOptions]);
	const monthLabels = useMemo(() => {
		return periodOptions.reduce<Record<number, string>>((labels, option) => {
			const parsed = parsePeriod(option.value);
			if (parsed && labels[parsed.month] == null)
				labels[parsed.month] = option.label.split(" (")[0];
			return labels;
		}, {});
	}, [periodOptions]);

	const validDraftYear = useMemo(() => {
		const allowedYears = new Set(yearOptions.map(option => Number(option.value)));
		return draftYear != null && allowedYears.has(draftYear) ? draftYear : null;
	}, [draftYear, yearOptions]);
	const validDraftMonths = useMemo(
		() => draftMonths.filter(month => parsedOptions.some(period => period.year === validDraftYear && period.month === month)),
		[draftMonths, parsedOptions, validDraftYear],
	);
	const availableMonths = useMemo(() => {
		if (validDraftYear == null)
			return [];
		return Array.from(new Set(
			parsedOptions
				.filter(period => period.year === validDraftYear)
				.map(period => period.month),
		)).sort((first, second) => first - second);
	}, [parsedOptions, validDraftYear]);
	const allMonthsSelected = availableMonths.length > 0 && availableMonths.every(month => validDraftMonths.includes(month));

	const addablePeriods = useMemo(() => {
		const values = parsedOptions
			.filter(period => period.year === validDraftYear && validDraftMonths.includes(period.month))
			.map(period => period.value)
			.filter(value => !selectedPeriodSet.has(value));
		return sortPeriods(values);
	}, [validDraftYear, validDraftMonths, parsedOptions, selectedPeriodSet]);

	const toggleMonth = (month: number) => {
		setDraftMonths(current => validDraftMonths.includes(month)
			? current.filter(value => value !== month)
			: [...validDraftMonths, month]);
	};

	const selectAllMonths = () => {
		setDraftMonths(availableMonths);
	};

	const addPeriods = () => {
		if (addablePeriods.length === 0)
			return;
		onPeriodsChange(sortPeriods([...selectedPeriods, ...addablePeriods]));
		setDraftYear(null);
		setDraftMonths([]);
	};

	const removePeriod = (period: string) => {
		onPeriodsChange(selectedPeriods.filter(value => value !== period));
	};

	return (
		<section className="report-period-picker" aria-label="انتخاب دوره و بازه گزارش">
			<button
				type="button"
				className="report-period-picker__accordion-header"
				aria-expanded={!collapsed}
				aria-controls="report-period-picker-content"
				onClick={() => setCollapsed(current => !current)}
			>
				<span className="report-period-picker__badge">دوره و بازه گزارش</span>
				<span className="report-period-picker__divider" aria-hidden="true" />
				<span className="report-period-picker__toggle" aria-hidden="true">
					{collapsed ? <DownOutlined /> : <UpOutlined />}
				</span>
			</button>

			<div id="report-period-picker-content" className="report-period-picker__body" hidden={collapsed}>
				<div className="report-period-picker__controls">
					<div className="report-period-picker__fields">
						<label className="report-period-picker__field">
							<span>نوع دوره</span>
							<Select
								value={selectedPeriodType}
								options={periodTypeOptions}
								disabled={disabled}
								onChange={value => onPeriodTypeChange(String(value) as PeriodType)}
							/>
						</label>
						<label className="report-period-picker__field">
							<span>انتخاب سال</span>
							<Select
								allowClear
								value={validDraftYear ?? undefined}
								options={yearOptions}
								disabled={disabled || yearOptions.length === 0}
								placeholder={disabled ? "ابتدا سرویس را انتخاب کنید" : "سال را انتخاب کنید"}
								onChange={(value) => {
									setDraftYear(value == null ? null : Number(value));
									setDraftMonths([]);
								}}
							/>
						</label>
					</div>

					<div className="report-period-picker__months" aria-label="انتخاب ماه">
						<div className="report-period-picker__months-heading">
							<span className="report-period-picker__months-label">انتخاب ماه</span>
							<Button
								type="link"
								size="small"
								className="report-period-picker__select-all"
								disabled={availableMonths.length === 0 || allMonthsSelected}
								onClick={selectAllMonths}
							>
								انتخاب همه
							</Button>
						</div>
						<div className="report-period-picker__month-grid">
							{MONTH_NAMES.map((fallbackName, index) => {
								const month = index + 1;
								const name = monthLabels[month] ?? fallbackName;
								const monthAvailable = validDraftYear != null && parsedOptions.some(period => period.year === validDraftYear && period.month === month);
								const selected = validDraftMonths.includes(month);
								return (
									<button
										key={name}
										type="button"
										className="report-period-picker__month"
										aria-pressed={selected}
										disabled={!monthAvailable}
										onClick={() => toggleMonth(month)}
									>
										{name}
									</button>
								);
							})}
						</div>
					</div>

					<Button className="report-period-picker__add" type="primary" icon={<PlusOutlined />} disabled={addablePeriods.length === 0} onClick={addPeriods}>
						افزودن تاریخ
					</Button>
				</div>

				<div className="report-period-picker__selection" aria-live="polite">
					<ContractDashedBorder />
					<div className="report-period-picker__selection-heading">
						<div className="report-period-picker__selection-title">
							<SelectedMonthIcon aria-hidden="true" />
							<div className="report-period-picker__selection-copy">
								<Typography.Text strong>دوره‌های انتخاب‌شده</Typography.Text>
								<Typography.Text type="secondary">{selectedPeriods.length > 0 ? `${selectedPeriods.length} دوره` : "هنوز دوره‌ای اضافه نشده است"}</Typography.Text>
							</div>
						</div>
						{selectedPeriods.length > 0 && (
							<Button type="text" danger icon={<DeleteOutlined />} onClick={() => onPeriodsChange([])}>
								حذف همه
							</Button>
						)}
					</div>

					{selectedPeriods.length > 0
						? (
							<div className="report-period-picker__chips">
								{selectedPeriods.map(period => (
									<span key={period} className="report-period-picker__chip">
										<span>{periodLabels[period] ?? period}</span>
										<button type="button" aria-label={`حذف دوره ${periodLabels[period] ?? period}`} onClick={() => removePeriod(period)}>
											<CloseOutlined />
										</button>
									</span>
								))}
							</div>
						)
						: (
							<div className="report-period-picker__empty">
								<CalendarOutlined aria-hidden="true" />
								<span>سال و ماه را انتخاب کنید، سپس «افزودن تاریخ» را بزنید.</span>
							</div>
						)}
				</div>
			</div>
		</section>
	);
}
