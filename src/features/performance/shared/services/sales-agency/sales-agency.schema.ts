import i18next from "i18next";
import { z } from "zod";

const amount = z.preprocess(
	value => value === "" || value == null ? undefined : value,
	z.coerce.number({ message: i18next.t("performance.validation.salesAgency.amountInvalid") })
		.min(0, i18next.t("performance.validation.salesAgency.amountNegative")),
);

export function salesAgencyFieldsSchema(companyType: unknown) {
	return companyType === "OUTBOUND"
		? z.object({ total_sales: amount })
		: z.object({
			credit_total: amount,
			income: amount,
			cost_items: z.array(z.object({
				cost_title: z.string().trim().min(1, i18next.t("performance.validation.salesAgency.costTitleRequired")),
				amount,
			})).min(1, i18next.t("performance.validation.salesAgency.costItemsRequired")),
		});
}
