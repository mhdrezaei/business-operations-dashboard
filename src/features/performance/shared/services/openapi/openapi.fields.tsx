import type { PerformanceFormValues } from "../../model/performance.form.types";
import { RHFProNumber } from "#src/shared/ui/rhf-pro";
import { ProCard } from "@ant-design/pro-components";
import { useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";

const sf = (path: string) => `serviceFields.${path}` as const;

function FieldGrid({ children }: { children: React.ReactNode }) {
	return (
		<div
			style={{
				display: "grid",
				gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
				gap: 12,
			}}
		>
			{children}
		</div>
	);
}

export function OpenApiPerformanceFields() {
	const { control } = useFormContext<PerformanceFormValues>();
	const contractModel = useWatch({ control, name: "contractModel" });

	const modelLabel = useMemo(() => {
		if (contractModel === "legacy")
			return "قدیمی";
		if (contractModel === "package")
			return "بسته‌ای";
		return "-";
	}, [contractModel]);

	if (!contractModel) {
		return (
			<ProCard bordered headerBordered style={{ borderRadius: 8 }}>
				<div style={{ opacity: 0.8 }}>
					برای ماه انتخاب‌شده قرارداد فعالی پیدا نشد.
				</div>
			</ProCard>
		);
	}

	return (
		<ProCard
			bordered
			headerBordered
			style={{ borderRadius: 8 }}
			title={(
				<div style={{ display: "flex", gap: 8 }}>
					<span>مدل قرارداد OpenAPI:</span>
					<strong>{modelLabel}</strong>
				</div>
			)}
		>
			{contractModel === "legacy"
				? (
					<FieldGrid>
						<RHFProNumber<PerformanceFormValues, any>
							name={sf("billInquiryValue") as any}
							label="مقدار عملکرد استعلام قبض"
							inputProps={{ placeholder: "مثلاً 60000" }}
							enableGrouping
							enableWordsTooltip
						/>

						<RHFProNumber<PerformanceFormValues, any>
							name={sf("receiptRegisterValue") as any}
							label="مقدار عملکرد ثبت وصولی"
							inputProps={{ placeholder: "مثلاً 80000" }}
							enableGrouping
							enableWordsTooltip
						/>
					</FieldGrid>
				)
				: null}

			{contractModel === "package"
				? (
					<FieldGrid>
						<RHFProNumber<PerformanceFormValues, any>
							name={sf("billInquiryValue") as any}
							label="مقدار عملکرد استعلام قبض"
							inputProps={{ placeholder: "مثلاً 60000" }}
							enableGrouping
							enableWordsTooltip
						/>

						<RHFProNumber<PerformanceFormValues, any>
							name={sf("trafficRevenue") as any}
							label="درآمد ترافیک"
							inputProps={{ placeholder: "مثلاً 120000000" }}
							enableGrouping
							enableWordsTooltip
						/>

						<RHFProNumber<PerformanceFormValues, any>
							name={sf("trafficPackageCount") as any}
							label="تعداد بسته ترافیک"
							inputProps={{ placeholder: "مثلاً 450" }}
							enableGrouping
							enableWordsTooltip
						/>

						<RHFProNumber<PerformanceFormValues, any>
							name={sf("irancellFa") as any}
							label="مقدار عملکرد ایرانسل - فارسی"
							inputProps={{ placeholder: "مثلاً 100000" }}
							enableGrouping
							enableWordsTooltip
						/>

						<RHFProNumber<PerformanceFormValues, any>
							name={sf("irancellEn") as any}
							label="مقدار عملکرد ایرانسل - انگلیسی"
							inputProps={{ placeholder: "مثلاً 100000" }}
							enableGrouping
							enableWordsTooltip
						/>

						<RHFProNumber<PerformanceFormValues, any>
							name={sf("mciFa") as any}
							label="مقدار عملکرد همراه اول - فارسی"
							inputProps={{ placeholder: "مثلاً 100000" }}
							enableGrouping
							enableWordsTooltip
						/>

						<RHFProNumber<PerformanceFormValues, any>
							name={sf("mciEn") as any}
							label="مقدار عملکرد همراه اول - انگلیسی"
							inputProps={{ placeholder: "مثلاً 100000" }}
							enableGrouping
							enableWordsTooltip
						/>

						<RHFProNumber<PerformanceFormValues, any>
							name={sf("otherFa") as any}
							label="مقدار عملکرد سایر - فارسی"
							inputProps={{ placeholder: "مثلاً 100000" }}
							enableGrouping
							enableWordsTooltip
						/>

						<RHFProNumber<PerformanceFormValues, any>
							name={sf("otherEn") as any}
							label="مقدار عملکرد سایر - انگلیسی"
							inputProps={{ placeholder: "مثلاً 100000" }}
							enableGrouping
							enableWordsTooltip
						/>
					</FieldGrid>
				)
				: null}
		</ProCard>
	);
}
