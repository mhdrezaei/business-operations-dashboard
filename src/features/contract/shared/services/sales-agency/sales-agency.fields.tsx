import type { ContractFormValues } from "../../../shared/model/contract.form.types";
import { fetchSalesAgencyExpenseTitles } from "#src/features/contract/api/contracts.api";
import { RHFProNumber, RHFSelect } from "#src/shared/ui/rhf-pro";
import { PlusOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button } from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { ContractFormSection } from "../../ui/form/components/ContractFormSection";

const sf = (path: string) => `serviceFields.${path}` as any;

export function SalesAgencyContractFields() {
	const { control, getValues, setValue } = useFormContext<ContractFormValues>();
	const companyType = useWatch({ control, name: "companyType" });
	const previousCompanyType = useRef(companyType);
	const [searchText, setSearchText] = useState("");
	const [addedTitles, setAddedTitles] = useState<string[]>([]);
	const expenseTitles = useQuery({
		queryKey: ["admin", "sales-agency-expense-titles"],
		enabled: companyType === "SALES_REP_MANAGEMENT",
		queryFn: fetchSalesAgencyExpenseTitles,
	});
	const costTitleOptions = useMemo(
		() => [...new Set([...(expenseTitles.data ?? []), ...addedTitles])]
			.map(title => ({ label: title, value: title })),
		[expenseTitles.data, addedTitles],
	);
	const rememberTitles = (value: unknown) => {
		if (!Array.isArray(value))
			return;
		const titles = value.filter((title): title is string => typeof title === "string").map(title => title.trim()).filter(Boolean);
		setAddedTitles(current => [...new Set([...current, ...titles])]);
	};

	useEffect(() => {
		if (previousCompanyType.current !== companyType) {
			if (companyType === "OUTBOUND") {
				setValue(sf("costTitles"), [], { shouldDirty: true, shouldValidate: false });
			}
			else if (companyType === "SALES_REP_MANAGEMENT") {
				setValue(sf("incomePercentage"), null, { shouldDirty: true, shouldValidate: false });
				setValue(sf("expensePercentage"), null, { shouldDirty: true, shouldValidate: false });
			}
			previousCompanyType.current = companyType;
		}
	}, [companyType, setValue]);

	if (companyType === "OUTBOUND") {
		return (
			<ContractFormSection title="پورسانت نمایندگی فروش" className="w-full">
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<RHFProNumber
						name={sf("incomePercentage")}
						label="درصد درآمد"
						inputProps={{ addonAfter: "%", placeholder: "مثلاً 20" }}
					/>
					<RHFProNumber
						name={sf("expensePercentage")}
						label="درصد هزینه"
						inputProps={{ addonAfter: "%", placeholder: "مثلاً 20" }}
					/>
				</div>
			</ContractFormSection>
		);
	}

	if (companyType === "SALES_REP_MANAGEMENT") {
		return (
			<ContractFormSection title="مدیریت نمایندگان فروش" className="w-full">
				<div className="flex flex-col gap-2">
					<div className="text-sm font-medium">عنوان‌های هزینه‌ها</div>
					<div className="flex items-start gap-2">
						<RHFSelect
							name={sf("costTitles")}
							options={costTitleOptions}
							loading={expenseTitles.isLoading}
							formItemProps={{ className: "mb-0 min-w-0 flex-1" }}
							selectProps={{
								mode: "tags",
								showSearch: true,
								searchValue: searchText,
								onSearch: setSearchText,
								placeholder: "عنوان هزینه را بنویسید یا انتخاب کنید",
								notFoundContent: "موردی یافت نشد. برای افزودن مورد جدید Enter بزنید.",
							}}
							onValueChange={(value) => {
								rememberTitles(value);
								setSearchText("");
							}}
						/>
						<Button
							className="shrink-0"
							icon={<PlusOutlined />}
							disabled={!searchText.trim()}
							onClick={() => {
								const title = searchText.trim();
								if (!title)
									return;
								const current = getValues(sf("costTitles")) as string[] | undefined;
								const nextTitles = [...new Set([...(current ?? []), title])];
								setValue(sf("costTitles"), nextTitles, { shouldDirty: true, shouldValidate: true });
								rememberTitles(nextTitles);
								setSearchText("");
							}}
						>
							افزودن
						</Button>
					</div>
					{expenseTitles.isError && <Alert type="error" message="دریافت عنوان‌های هزینه ناموفق بود." />}
				</div>
			</ContractFormSection>
		);
	}

	return <Alert type="info" message="ابتدا نوع همکاری (عاملیت فروش) را انتخاب کنید." />;
}
