import type { ContractServicePath } from "../../api/contracts.api";
import { isTelecomFrameCode } from "../services/telecom-frame/telecom-frame.types";

interface ContractServiceSelection {
	serviceCode: string | null | undefined
	companyType?: string | null
	counterpartyType?: string | null
}

const PLAIN_SERVICE_PATHS = new Set(["openapi", "traffic", "psp", "commercial", "shahkar"]);

/**
 * مسیر API قرارداد برای انتخاب فعلی فرم (ایجاد، ویرایش، کپی و پنل کناری).
 * SMS بدون طرف قرارداد و عاملیت فروش بدون نوع همکاری هنوز مسیر ندارند (null).
 */
export function resolveContractServicePath({ serviceCode, companyType, counterpartyType }: ContractServiceSelection): ContractServicePath | null {
	const code = String(serviceCode ?? "").trim().toLowerCase();
	if (!code)
		return null;

	if (code === "sms" || code.startsWith("sms/")) {
		if (code === "sms/client" || counterpartyType === "partners")
			return "sms/client";
		if (code === "sms/vendor" || counterpartyType === "gov_ops")
			return "sms/vendor";
		return null;
	}
	if (code === "sms_commission" || code === "sms-commission")
		return "sms-commission";
	if (code === "sales_agency" || code === "sales-agency") {
		const type = String(companyType ?? "").trim().toUpperCase();
		if (type === "SALES_REP_MANAGEMENT")
			return "sales-agency/rep-management";
		return type === "OUTBOUND" ? "sales-agency/outbound" : null;
	}
	if (isTelecomFrameCode(code))
		return "telecom-frame";
	return PLAIN_SERVICE_PATHS.has(code) ? code as ContractServicePath : null;
}

/** Traffic COLLOCATION contract with the telecom (gov_ops) party: the "rack cost" contract. */
export function isCollocationCostContext(context: Pick<ContractServiceSelection, "serviceCode" | "companyType" | "counterpartyType">) {
	const isCollocation = String(context.companyType ?? "").trim().toUpperCase() === "COLLOCATION";
	return String(context.serviceCode ?? "").trim().toLowerCase() === "traffic" && isCollocation && context.counterpartyType === "gov_ops";
}
