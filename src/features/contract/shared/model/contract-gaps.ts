import { isCollocationCostContext } from "./contract-service-path";

interface ContractGapsSelection {
	serviceCode: string | null | undefined
	counterpartyType: string | null | undefined
	companyId: number | null | undefined
	companyType: string | null | undefined
}

const SMS_VENDOR_COMPANY_TYPE = "VENDOR";

/**
 * BE فقط برای SMS طرف اپراتورها/دولت (`company_type=VENDOR`) و هزینه رک کولوکیشن مخابرات
 * (`company_type=COLLOCATION`) گپ را بدون شرکت می‌دهد؛ `company_type` فقط برای ترافیک و vendor ارسال می‌شود.
 */
export function resolveContractGapsScope({ serviceCode, counterpartyType, companyId, companyType }: ContractGapsSelection) {
	const isSmsVendor = serviceCode === "sms" && counterpartyType === "gov_ops";
	const allowWithoutCompany = isSmsVendor || isCollocationCostContext({ serviceCode, companyType, counterpartyType });

	return {
		companyId: allowWithoutCompany ? null : companyId,
		companyType: isSmsVendor ? SMS_VENDOR_COMPANY_TYPE : serviceCode === "traffic" ? companyType : null,
		allowWithoutCompany,
	};
}
