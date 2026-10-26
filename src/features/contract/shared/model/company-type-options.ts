import type { ContractServicePath } from "../../api/contracts.api";

const SMS_VENDOR_COMPANY_TYPE = "VENDOR";
const PSP_COMPANY_TYPE = "IPG";

/** نوع‌های قابل‌انتخاب یک سرویس: SMS بدون VENDOR (آن «طرف قرارداد» است) و PSP فقط IPG. */
export function filterSelectableCompanyTypes<T extends { key: string }>(serviceCode: string | null | undefined, items: T[]) {
	const code = String(serviceCode ?? "").trim().toLowerCase();
	const keyOf = (item: T) => String(item.key).toUpperCase();
	if (code === "sms")
		return items.filter(item => keyOf(item) !== SMS_VENDOR_COMPANY_TYPE);
	if (code === "psp")
		return items.filter(item => keyOf(item) === PSP_COMPANY_TYPE);
	return items;
}

export function hasSmsVendorCompanyType(items: Array<{ key: string }>) {
	return items.some(item => String(item.key).toUpperCase() === SMS_VENDOR_COMPANY_TYPE);
}

/** نوع شرکتِ مورد استفاده در بررسی دسترسی: قرارداد SMS با طرف vendor با توکن `VENDOR` کنترل می‌شود. */
export function getContractAccessCompanyType(service: ContractServicePath | null | undefined, companyType?: string | null) {
	return service === "sms/vendor" ? SMS_VENDOR_COMPANY_TYPE : companyType;
}
