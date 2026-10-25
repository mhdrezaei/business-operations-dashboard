import type { ArrayPath, Path } from "react-hook-form";
import type { ContractFormValues } from "../../../shared/model/contract.form.types";
import { fetchSalesAgencyExpenseTitles } from "#src/features/contract/api/contracts.api";
import { ContractAddendaSection } from "#src/features/contract/components/addenda/ContractAddendaSection";
import { RHFProNumber, RHFSelect } from "#src/shared/ui/rhf-pro";
import { SectionCard as ContractFormSection } from "#src/shared/ui/section-card";
import { PlusOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button } from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

const sf = (path: string) => `serviceFields.${path}` as any;

/** انتخاب عنوان‌های هزینه (مدیریت نمایندگان فروش)؛ هم برای قرارداد اصلی و هم برای هر الحاقیه. */
function CostTitlesSelect({ name }: { name: string }) {
	const { t } = useTranslation();
	const { getValues, setValue } = useFormContext<ContractFormValues>();
	const [searchText, setSearchText] = useState("");
	const [addedTitles, setAddedTitles] = useState<string[]>([]);
	const expenseTitles = useQuery({
		queryKey: ["admin", "sales-agency-expense-titles"],
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

	return (
		<div className="flex flex-col gap-2">
			<div className="text-sm font-medium">{t("contract.salesAgency.costTitles")}</div>
			<div className="flex items-start gap-2">
				<RHFSelect
					name={name as any}
					options={costTitleOptions}
					loading={expenseTitles.isLoading}
					formItemProps={{ className: "mb-0 min-w-0 flex-1" }}
					selectProps={{
						mode: "tags",
						showSearch: true,
						searchValue: searchText,
						onSearch: setSearchText,
						placeholder: t("contract.salesAgency.costTitlePlaceholder"),
						notFoundContent: t("contract.salesAgency.costTitleNotFound"),
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
						const current = getValues(name as any) as string[] | undefined;
						const nextTitles = [...new Set([...(current ?? []), title])];
						setValue(name as any, nextTitles as any, { shouldDirty: true, shouldValidate: true });
						rememberTitles(nextTitles);
						setSearchText("");
					}}
				>
					{t("contract.salesAgency.add")}
				</Button>
			</div>
			{expenseTitles.isError && <Alert type="error" message={t("contract.salesAgency.costTitlesLoadFailed")} />}
		</div>
	);
}

/** درصد درآمد/هزینه (OUTBOUND)؛ هم برای قرارداد اصلی و هم برای هر الحاقیه. */
function OutboundPercentFields({ incomeName, expenseName }: { incomeName: string, expenseName: string }) {
	const { t } = useTranslation();
	return (
		<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
			<RHFProNumber
				name={incomeName as any}
				label={t("contract.salesAgency.income")}
				inputProps={{ addonAfter: "%", placeholder: t("contract.salesAgency.percentPlaceholder") }}
			/>
			<RHFProNumber
				name={expenseName as any}
				label={t("contract.salesAgency.expense")}
				inputProps={{ addonAfter: "%", placeholder: t("contract.salesAgency.percentPlaceholder") }}
			/>
		</div>
	);
}

export function SalesAgencyContractFields() {
	const { t } = useTranslation();
	const { control, setValue } = useFormContext<ContractFormValues>();
	const companyType = useWatch({ control, name: "companyType" });
	const previousCompanyType = useRef(companyType);
	const startYear = useWatch({ control, name: "startYear" });
	const startMonth = useWatch({ control, name: "startMonth" });
	const endYear = useWatch({ control, name: "endYear" });
	const endMonth = useWatch({ control, name: "endMonth" });
	const showAddenda = startYear != null && startMonth != null && endYear != null && endMonth != null;

	useEffect(() => {
		if (previousCompanyType.current !== companyType) {
			if (companyType === "OUTBOUND") {
				setValue(sf("costTitles"), [], { shouldDirty: true, shouldValidate: false });
			}
			else if (companyType === "SALES_REP_MANAGEMENT") {
				setValue(sf("incomePercentage"), null, { shouldDirty: true, shouldValidate: false });
				setValue(sf("expensePercentage"), null, { shouldDirty: true, shouldValidate: false });
			}
			setValue(sf("addenda"), [], { shouldDirty: true, shouldValidate: false });
			previousCompanyType.current = companyType;
		}
	}, [companyType, setValue]);

	if (companyType !== "OUTBOUND" && companyType !== "SALES_REP_MANAGEMENT")
		return <Alert type="info" message={t("contract.salesAgency.selectType")} />;

	const isOutbound = companyType === "OUTBOUND";

	return (
		<>
			<ContractFormSection title={t(isOutbound ? "contract.salesAgency.outboundTitle" : "contract.salesAgency.repTitle")} className="w-full">
				{isOutbound
					? <OutboundPercentFields incomeName={sf("incomePercentage")} expenseName={sf("expensePercentage")} />
					: <CostTitlesSelect name={sf("costTitles")} />}
			</ContractFormSection>

			{showAddenda
				? (
					<div className="mt-3 w-full">
						<ContractAddendaSection<ContractFormValues>
							title={t("contract.addenda.title")}
							name={sf("addenda") as ArrayPath<ContractFormValues>}
							renderAddendumFields={base => isOutbound
								? <OutboundPercentFields incomeName={`${base}.incomePercentage`} expenseName={`${base}.expensePercentage`} />
								: <CostTitlesSelect name={`${base}.costTitles`} />}
							contractStartYearPath={"startYear" as Path<ContractFormValues>}
							contractStartMonthPath={"startMonth" as Path<ContractFormValues>}
							contractEndYearPath={"endYear" as Path<ContractFormValues>}
							contractEndMonthPath={"endMonth" as Path<ContractFormValues>}
						/>
					</div>
				)
				: null}
		</>
	);
}
