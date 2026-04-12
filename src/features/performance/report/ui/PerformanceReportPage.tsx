import type { ActionType, ProColumns, ProFormInstance } from "@ant-design/pro-components";
import type { PerformanceReportRow, PerformanceReportSummary } from "../model/performance.report.types";
import type { ReportSelectOption, ReportServiceOption } from "./constants";
import { BasicContent, BasicTable } from "#src/components";
import { fetchPerformanceReport } from "#src/features/performance/api/performances.api";
import { normalizeServiceCode } from "#src/features/performance/shared/model/performance.helpers";
import {
	companiesByServiceQuery,
	performanceReportAvailabilityQuery,
	servicesQuery,
} from "#src/features/performance/shared/queries/performance.queries";
import { MONTH_OPTIONS } from "#src/features/performance/shared/ui/form/constants/jalali-date-options";
import { useAccess } from "#src/hooks";
import { useQuery } from "@tanstack/react-query";
import { Space, Typography } from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	getPerformanceReportColumns,
} from "./constants";

interface ParsedPeriod {
	period: string
	year: number
	month: number
}

function parsePeriod(period: string): ParsedPeriod | null {
	const text = String(period ?? "").trim();
	if (!text)
		return null;

	const [yearRaw, monthRaw] = text.split("-");
	const year = Number(yearRaw);
	const month = Number(monthRaw);
	if (!Number.isFinite(year) || !Number.isFinite(month))
		return null;
	if (month < 1 || month > 12)
		return null;

	return {
		period: `${year}-${month}`,
		year,
		month,
	};
}

function sortPeriods(periods: string[]) {
	return [...periods].sort((a, b) => {
		const parsedA = parsePeriod(a);
		const parsedB = parsePeriod(b);
		if (!parsedA || !parsedB)
			return String(a).localeCompare(String(b));
		if (parsedA.year !== parsedB.year)
			return parsedA.year - parsedB.year;
		return parsedA.month - parsedB.month;
	});
}

function normalizePeriods(values: unknown) {
	if (!Array.isArray(values))
		return [];

	const dedup = new Set<string>();
	values.forEach((item) => {
		const parsed = parsePeriod(String(item ?? ""));
		if (!parsed)
			return;
		dedup.add(parsed.period);
	});

	return sortPeriods(Array.from(dedup));
}

function normalizeNumberList(values: unknown) {
	if (!Array.isArray(values))
		return [];

	const dedup = new Set<number>();
	values.forEach((item) => {
		const numeric = Number(item);
		if (Number.isInteger(numeric) && numeric > 0)
			dedup.add(numeric);
	});

	return Array.from(dedup);
}

function formatSummaryNumber(value: number | null | undefined) {
	if (value == null)
		return "-";
	return Number(value).toLocaleString("en-US");
}

export default function PerformanceReportPage() {
	const { t } = useTranslation();
	const { getPermittedServiceIds } = useAccess();

	const actionRef = useRef<ActionType>(null);
	const formRef = useRef<ProFormInstance | undefined>(undefined);

	const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
	const [selectedServiceCode, setSelectedServiceCode] = useState<string | null>(null);
	const [selectedYear, setSelectedYear] = useState<number | null>(null);
	const [selectedPeriods, setSelectedPeriods] = useState<string[]>([]);
	const [summary, setSummary] = useState<PerformanceReportSummary>(null);

	const permittedViewIdsFromPerformances = getPermittedServiceIds("performances", "view");
	const permittedViewIdsFromContracts = getPermittedServiceIds("contracts", "view");
	const permittedViewServiceIdsList = permittedViewIdsFromPerformances.length > 0
		? permittedViewIdsFromPerformances
		: permittedViewIdsFromContracts;

	const permittedViewServiceIds = useMemo(
		() => new Set(permittedViewServiceIdsList),
		[permittedViewServiceIdsList.join(",")],
	);

	const services = useQuery(servicesQuery());
	const companies = useQuery(companiesByServiceQuery(selectedServiceId));
	const availabilityBase = useQuery(performanceReportAvailabilityQuery({
		serviceId: selectedServiceId,
	}));
	const availabilityByPeriods = useQuery({
		...performanceReportAvailabilityQuery({
			serviceId: selectedServiceId,
			shPeriods: selectedPeriods,
		}),
		enabled: !!selectedServiceId && selectedPeriods.length > 0,
	});

	const serviceOptions: ReportServiceOption[] = useMemo(() => {
		return (services.data?.results ?? [])
			.filter(service => permittedViewServiceIds.has(Number(service.id)))
			.map((service) => {
				const code = normalizeServiceCode(service.code);
				return {
					label: service.name,
					value: service.id,
					code,
				};
			});
	}, [services.data, permittedViewServiceIdsList.join(",")]);

	useEffect(() => {
		if (!selectedServiceId)
			return;
		if (permittedViewServiceIds.has(selectedServiceId))
			return;

		setSelectedServiceId(null);
		setSelectedServiceCode(null);
		setSelectedYear(null);
		setSelectedPeriods([]);
		setSummary(null);
		formRef.current?.setFieldsValue({
			service_id: undefined,
			sh_year: undefined,
			sh_periods: undefined,
			company_ids: undefined,
		});
	}, [selectedServiceId, permittedViewServiceIdsList.join(",")]);

	const selectedServiceName = useMemo(() => {
		if (!selectedServiceId)
			return null;
		return serviceOptions.find(item => item.value === selectedServiceId)?.label ?? null;
	}, [selectedServiceId, serviceOptions]);

	const availablePeriods = useMemo(() => {
		const fromApi = availabilityBase.data?.periods ?? [];
		const dedup = new Set<string>();
		fromApi.forEach((item) => {
			const parsed = parsePeriod(String(item ?? ""));
			if (!parsed)
				return;
			dedup.add(parsed.period);
		});
		return sortPeriods(Array.from(dedup));
	}, [availabilityBase.data]);

	const yearOptions: ReportSelectOption[] = useMemo(() => {
		const years = new Set<number>();
		availablePeriods.forEach((period) => {
			const parsed = parsePeriod(period);
			if (!parsed)
				return;
			years.add(parsed.year);
		});
		return Array.from(years)
			.sort((a, b) => b - a)
			.map(year => ({ label: String(year), value: year }));
	}, [availablePeriods]);

	const periodOptions: ReportSelectOption[] = useMemo(() => {
		if (!selectedYear)
			return [];

		return availablePeriods
			.map((period) => {
				const parsed = parsePeriod(period);
				if (!parsed || parsed.year !== selectedYear)
					return null;
				const monthName = MONTH_OPTIONS.find(item => item.value === parsed.month)?.label ?? String(parsed.month);
				return {
					value: parsed.period,
					label: `${monthName} (${parsed.year}/${parsed.month})`,
				} satisfies ReportSelectOption;
			})
			.filter(Boolean) as ReportSelectOption[];
	}, [availablePeriods, selectedYear]);

	const availableCompanyIds = useMemo(() => {
		if (selectedPeriods.length > 0) {
			return availabilityByPeriods.data?.company_ids ?? [];
		}
		return availabilityBase.data?.company_ids ?? [];
	}, [selectedPeriods.join(","), availabilityBase.data, availabilityByPeriods.data]);

	const companyOptions: ReportSelectOption[] = useMemo(() => {
		if (!selectedServiceId)
			return [];
		if (selectedPeriods.length > 0 && !availabilityByPeriods.data)
			return [];
		if (selectedPeriods.length === 0 && !availabilityBase.data)
			return [];

		const companiesList = companies.data?.results ?? [];
		const availableSet = new Set(availableCompanyIds.map(id => Number(id)));
		return companiesList
			.filter(company => availableSet.has(Number(company.id)))
			.map(company => ({
				label: company.name,
				value: company.id,
			}));
	}, [
		selectedServiceId,
		selectedPeriods.join(","),
		availabilityBase.data,
		availabilityByPeriods.data,
		companies.data,
		availableCompanyIds.join(","),
	]);

	const setSelectedService = (serviceId: number | null, serviceCode: string | null) => {
		setSelectedServiceId(serviceId);
		setSelectedServiceCode(serviceCode ? normalizeServiceCode(serviceCode) : null);
		setSelectedYear(null);
		setSelectedPeriods([]);
		setSummary(null);

		formRef.current?.setFieldsValue({
			sh_year: undefined,
			sh_periods: undefined,
			company_ids: undefined,
		});

		actionRef.current?.reload?.();
	};

	const handleYearChange = (year: number | null) => {
		setSelectedYear(year);
		setSelectedPeriods([]);
		setSummary(null);
		formRef.current?.setFieldsValue({
			sh_periods: undefined,
			company_ids: undefined,
		});
	};

	const handlePeriodsChange = (periods: string[]) => {
		setSelectedPeriods(periods);
		setSummary(null);
		formRef.current?.setFieldsValue({
			company_ids: undefined,
		});
	};

	const isPeriodDisabled = !selectedServiceId || !selectedYear || availabilityBase.isLoading;
	const isCompanyDisabled = !selectedServiceId || selectedPeriods.length === 0 || companies.isLoading || (selectedPeriods.length > 0 && availabilityByPeriods.isFetching);

	const columns: ProColumns<PerformanceReportRow>[] = useMemo(() => {
		return getPerformanceReportColumns({
			t,
			selectedServiceName,
			serviceOptions,
			yearOptions,
			periodOptions,
			companyOptions,
			isPeriodDisabled,
			isCompanyDisabled,
			onServiceChange: setSelectedService,
			onYearChange: handleYearChange,
			onPeriodsChange: handlePeriodsChange,
		});
	}, [
		t,
		selectedServiceName,
		serviceOptions,
		yearOptions,
		periodOptions,
		companyOptions,
		isPeriodDisabled,
		isCompanyDisabled,
	]);

	return (
		<BasicContent className="h-full">
			<BasicTable<PerformanceReportRow>
				adaptive
				rowKey={record => String(record.id)}
				columns={columns}
				actionRef={actionRef}
				formRef={formRef}
				request={async (params) => {
					if (!selectedServiceId || !selectedServiceCode) {
						setSummary(null);
						return {
							data: [],
							total: 0,
							success: true,
						};
					}

					const formValues = params as Record<string, unknown>;
					const periods = normalizePeriods(formValues.sh_periods);
					if (periods.length === 0) {
						setSummary(null);
						return {
							data: [],
							total: 0,
							success: true,
						};
					}

					const companyIds = normalizeNumberList(formValues.company_ids);

					const response = await fetchPerformanceReport({
						service_id: selectedServiceId,
						service_code: selectedServiceCode,
						sh_periods: periods.join(","),
						company_ids: companyIds.length > 0 ? companyIds.join(",") : undefined,
						page: params.current ?? 1,
						page_size: params.pageSize ?? 20,
						total: true,
					});

					setSummary(response.totals ?? null);

					return {
						data: response.results,
						total: response.count,
						success: true,
					};
				}}
				headerTitle={t("performance.titles.performanceReport")}
				toolBarRender={() => {
					if (!summary)
						return [];

					return [
						<Space key="summary" size={16}>
							<Typography.Text>{`${t("performance.summary.totalCount")}: ${formatSummaryNumber(summary.value)}`}</Typography.Text>
							<Typography.Text>{`${t("performance.summary.totalIncome")}: ${formatSummaryNumber(summary.income_financial)}`}</Typography.Text>
							<Typography.Text>{`${t("performance.summary.totalExpense")}: ${formatSummaryNumber(summary.expense_financial)}`}</Typography.Text>
							<Typography.Text>{`${t("performance.summary.totalProfit")}: ${formatSummaryNumber(summary.profit_financial)}`}</Typography.Text>
						</Space>,
					];
				}}
			/>
		</BasicContent>
	);
}
