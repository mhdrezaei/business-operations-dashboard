import type { ContractFormValues } from "../../../shared/model/contract.form.types";
import { RHFProNumber, RHFProText } from "#src/shared/ui/rhf-pro";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { Alert, Button } from "antd";
import { useEffect, useRef } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { ContractFormSection } from "../../ui/form/components/ContractFormSection";

const sf = (path: string) => `serviceFields.${path}` as any;

export function SalesAgencyContractFields() {
	const { control, setValue } = useFormContext<ContractFormValues>();
	const companyType = useWatch({ control, name: "companyType" });
	const previousCompanyType = useRef(companyType);
	const { fields, append, remove } = useFieldArray({ control, name: sf("costTitles") });

	useEffect(() => {
		if (companyType === "SALES_REP_MANAGEMENT" && fields.length === 0)
			append({ title: "" });
	}, [companyType, fields.length, append]);

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
				<div className="flex flex-col gap-3">
					<div className="text-sm font-medium">عنوان‌های هزینه‌ها</div>
					{fields.map((field, index) => (
						<div key={field.id} className="flex items-end gap-3">
							<RHFProText
								name={sf(`costTitles.${index}.title`)}
								label={index === 0 ? "عنوان هزینه" : ""}
								inputProps={{ placeholder: "عنوان هزینه را وارد کنید" }}
								formItemProps={{ className: "mb-0 flex-1" }}
							/>
							{fields.length > 1
								? <Button type="text" danger aria-label={`حذف عنوان هزینه ${index + 1}`} icon={<DeleteOutlined />} onClick={() => remove(index)} />
								: null}
						</div>
					))}
					<Button className="self-start" icon={<PlusOutlined />} onClick={() => append({ title: "" })}>
						افزودن
					</Button>
				</div>
			</ContractFormSection>
		);
	}

	return <Alert type="info" message="ابتدا نوع همکاری (عاملیت فروش) را انتخاب کنید." />;
}
