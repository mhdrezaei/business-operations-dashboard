import type { ContractFormValues } from "../model/contract.form.types";
import { i18n } from "#src/locales";
import { queryClient } from "#src/shared/lib/query-client";
import { isCollocationCostContext } from "../model/contract-service-path";
import { collocationCostCompanyQuery } from "./contract.queries";

/** شرکت قرارداد؛ برای قرارداد هزینه رک مخابرات (بدون انتخاب شرکت) شرکت سراسری از BE پیدا می‌شود. */
export async function resolveContractCompanyId(values: ContractFormValues) {
	if (!isCollocationCostContext(values) || values.companyId != null)
		return values.companyId ?? null;
	if (values.serviceId == null)
		return null;

	const companyId = await queryClient.fetchQuery(collocationCostCompanyQuery(values.serviceId));
	if (companyId == null)
		throw new Error(i18n.t("contract.create.costCompanyMissing"));
	return companyId;
}
