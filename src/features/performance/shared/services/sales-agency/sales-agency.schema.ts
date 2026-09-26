import { z } from "zod";

const amount = z.preprocess(value => value === "" || value == null ? undefined : value, z.coerce.number().min(0, "مبلغ باید صفر یا بیشتر باشد"));

export function salesAgencyFieldsSchema(companyType: unknown) {
	return companyType === "OUTBOUND"
		? z.object({ total_sales: amount })
		: z.object({
			credit_total: amount,
			income: amount,
			cost_items: z.array(z.object({
				cost_title: z.string().trim().min(1, "عنوان هزینه را انتخاب کنید"),
				amount,
			})).min(1, "حداقل یک ردیف هزینه اضافه کنید"),
		});
}

export const salesAgencyPerformanceSchema = z.union([
	z.object({ total_sales: amount }),
	z.object({ credit_total: amount, income: amount, cost_items: z.array(z.object({ cost_title: z.string().trim().min(1), amount })).min(1) }),
]);
