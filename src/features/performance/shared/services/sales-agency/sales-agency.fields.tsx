import { performanceContractsQuery } from "#src/features/performance/shared/queries/performance.queries";
import { PerformanceFieldCard } from "#src/features/performance/shared/ui/form/components/PerformanceFieldCard";
import { RHFProNumber, RHFSelect } from "#src/shared/ui/rhf-pro";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button } from "antd";
import { useEffect, useMemo } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { salesAgencyCostTitles } from "./sales-agency.helpers";

export function SalesAgencyPerformanceFields({ prefix = "serviceFields.", companyType: fixedType, companyId: fixedCompany, serviceId: fixedService, year: fixedYear, month: fixedMonth }: {
	prefix?: string
	companyType?: string | null
	companyId?: number | null
	serviceId?: number | null
	year?: number | null
	month?: number | null
}) {
	const { control, getValues, setValue } = useFormContext();
	const [type, company, service, year, month] = useWatch({ control, name: ["companyType", "companyId", "serviceId", "year", "month"] });
	const companyType = fixedType ?? type;
	const selectedYear = fixedYear ?? year;
	const selectedMonth = fixedMonth ?? month;
	const contracts = useQuery(performanceContractsQuery({
		servicePath: companyType === "SALES_REP_MANAGEMENT" ? "sales-agency/rep-management" : null,
		companyId: fixedCompany ?? company,
		serviceId: fixedService ?? service,
	}));
	const titles = useMemo(() => salesAgencyCostTitles(contracts.data?.results ?? [], selectedYear, selectedMonth), [contracts.data, selectedYear, selectedMonth]);
	useEffect(() => {
		if (companyType === "SALES_REP_MANAGEMENT") {
			const fieldName = prefix ? `${prefix}cost_items` : "cost_items";
			const currentItems = getValues(fieldName) as Array<{ cost_title?: string, amount?: unknown }> | undefined;
			const amountByTitle = new Map((currentItems ?? []).map(item => [item.cost_title, item.amount]));
			const nextItems = titles.length
				? titles.map(cost_title => ({ cost_title, amount: amountByTitle.get(cost_title) ?? null }))
				: (currentItems?.length ? currentItems : [{ cost_title: "", amount: null }]);
			setValue(fieldName, nextItems);
		}
	}, [prefix, companyType, titles, getValues, setValue]);
	const { fields, append, remove } = useFieldArray({ control, name: `${prefix}cost_items` });
	const moneyField = (key: string, label: string) => (
		<PerformanceFieldCard key={key} title={label}>
			<RHFProNumber name={`${prefix}${key}`} label="" enableGrouping decimal inputProps={{ "aria-label": label, "placeholder": key === "income" ? "مثلاً 1212" : "مثلاً 500000000", "addonAfter": "ریال" }} formItemProps={{ className: "mb-0" }} />
		</PerformanceFieldCard>
	);
	if (companyType === "OUTBOUND")
		return moneyField("total_sales", "فروش کل ماه (ریال)");
	if (companyType !== "SALES_REP_MANAGEMENT")
		return <Alert type="info" message="ابتدا نوع همکاری (عاملیت فروش) را انتخاب کنید." />;
	return (
		<div className="space-y-4">
			<div className="performance-field-grid">
				{moneyField("credit_total", "اعتبار کل ماهیانه (ریال)")}
				{moneyField("income", "درآمد کل (ریال)")}
			</div>
			<PerformanceFieldCard title="هزینه‌ها" headerExtra={<Button icon={<PlusOutlined />} onClick={() => append({ cost_title: "", amount: null })}>افزودن ردیف</Button>}>
				{contracts.isError && <Alert type="error" message="دریافت عنوان‌های هزینه ناموفق بود." />}
				{fields.map((field, index) => (
					<div key={field.id} className="grid grid-cols-[1fr_1fr_auto] items-start gap-3">
						<RHFSelect name={`${prefix}cost_items.${index}.cost_title`} label="عنوان هزینه" options={titles.map(title => ({ label: title, value: title }))} loading={contracts.isLoading} selectProps={{ placeholder: titles.length ? "انتخاب کنید" : "عنوان هزینه‌ای برای این بازه یافت نشد" }} />
						<RHFProNumber name={`${prefix}cost_items.${index}.amount`} label="مبلغ (ریال)" enableGrouping decimal inputProps={{ placeholder: "مثلاً 20000" }} />
						<Button className="mt-7" type="text" danger aria-label={`حذف ردیف ${index + 1}`} icon={<DeleteOutlined />} onClick={() => remove(index)} />
					</div>
				))}
			</PerformanceFieldCard>
		</div>
	);
}
