import type { CompanyTypeOption } from "#src/api/user/types";
import { filterSelectableCompanyTypes } from "#src/features/contract/shared/model/company-type-options";
import { useAccess } from "#src/hooks";
import { useMemo } from "react";

const FALLBACK_COMPANY_TYPES: Record<string, CompanyTypeOption[]> = {
	traffic: ["CP", "IXP", "TCI", "PREMIUM", "COLLOCATION"].map(key => ({ key, value: key })),
	sms: [
		{ key: "CP", value: "شرکت های cp" },
		{ key: "TELECOM", value: "شرکت های مخابراتی" },
		{ key: "NON_TELECOM", value: "شرکت های غیر مخابرات" },
		{ key: "KARASHAB", value: "کاراشابی" },
	],
	psp: [{ key: "IPG", value: "IPG" }],
};

/** گزینه‌های «نوع شرکت» یک سرویس؛ اگر سیاست دسترسی چیزی نداد مثل old به لیست ثابت برمی‌گردد. */
export function useCompanyTypeOptions(
	serviceCode: string,
	serviceId: number | null,
	action: "view" | "create",
	enabled = true,
) {
	const { getPermittedCompanyTypes } = useAccess();

	return useMemo(() => {
		if (!enabled || !serviceId)
			return [];
		const permitted = getPermittedCompanyTypes("company_profile", action, serviceId);
		const source = permitted.length ? permitted : FALLBACK_COMPANY_TYPES[serviceCode] ?? [];
		return filterSelectableCompanyTypes(serviceCode, source).map(item => ({ label: item.value, value: item.key }));
	}, [enabled, serviceCode, serviceId, action, getPermittedCompanyTypes]);
}
