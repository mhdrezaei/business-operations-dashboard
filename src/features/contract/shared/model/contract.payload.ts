import type { Row } from "../utils/value-coercion";
import type { ContractFormValues, ContractTypeValue } from "./contract.form.types";
import { contractTypeToApiPricing } from "#src/features/contract/api/pricing.mapper";
import { isTelecomFrameCode } from "../services/telecom-frame/telecom-frame.types";
import { DEFAULT_TELECOM_UNITS_PER_RACK } from "../services/traffic/traffic.collocation";
import { getDefaultTrafficUnit, hasTrafficUnit } from "../services/traffic/traffic.units";
import { asRows, toIdOrStringOrNull, toNumberOrNull, toStringOrNull } from "../utils/value-coercion";
import { mapRealStartPayload } from "./contract-dates";
import { mapTelecomFramePayload } from "./telecom-frame.payload";

type Payload = Record<string, unknown>;

/**
 * create: امضا همیشه false.
 * edit: شناسه الحاقیه‌ها حفظ می‌شود، وضعیت امضا دست‌نخورده می‌ماند و `hadRealStart` اجازه پاک‌کردن شروع واقعی را می‌دهد.
 */
export interface ContractPayloadOptions {
	mode: "create" | "edit"
	hadRealStart?: boolean
}
type ContractPayloadMode = ContractPayloadOptions["mode"];

function pricingToApi(value: unknown) {
	// مقدار خالی (null/undefined) را mapper به‌صورت null برمی‌گرداند
	return contractTypeToApiPricing(value as ContractTypeValue);
}

function mapPricingPayload(value: unknown) {
	const pricing = pricingToApi(value);
	return {
		calculation_type: pricing?.calculation_type ?? null,
		tiers: pricing?.tiers ?? [],
	};
}

function mapAddendumPeriod(row: Row) {
	return {
		start_jy: toNumberOrNull(row.startYear),
		start_jm: toNumberOrNull(row.startMonth),
		end_jy: toNumberOrNull(row.endYear),
		end_jm: toNumberOrNull(row.endMonth),
		contract_number: row.contractNumber ?? "",
		note: row.description ?? "",
	};
}

/** در ویرایش شناسه الحاقیه‌های موجود را روی خروجی هر mapper (یک‌به‌یک و هم‌ترتیب) برمی‌گرداند. */
function withAddendaIds(mapped: Row[], source: unknown): Row[] {
	const rows = asRows(source);
	return mapped.map((node, index) => {
		const id = toNumberOrNull(rows[index]?.id);
		return {
			...node,
			...(id != null ? { id } : {}),
			...(Array.isArray(node.children) ? { children: withAddendaIds(node.children as Row[], rows[index]?.children) } : {}),
		};
	});
}

/* ---------- collocation ---------- */

function mapCollocationMode(value: unknown) {
	const normalized = String(value ?? "").trim().toUpperCase();
	if (normalized === "COLLOCATION")
		return "COLO";
	return normalized === "CP" ? "CP" : null;
}

function mapRackType(value: unknown) {
	const normalized = String(value ?? "").trim().toUpperCase().replace(/_RACK$/, "");
	return ["FULL", "HALF", "QUARTER", "UNIT"].includes(normalized) ? normalized.toLowerCase() : null;
}

/** فقط آیتم‌های کامل و معتبر پورت ارسال می‌شود (مثل old). */
function mapPortItems(items: unknown) {
	return asRows(items)
		.map(item => ({
			count: toNumberOrNull(item.count),
			speed: toNumberOrNull(item.speed),
			price: toStringOrNull(item.unitPrice),
		}))
		.filter(item => Number.isInteger(item.count) && item.count! > 0 && item.speed != null && item.speed > 0 && item.price != null);
}

/** هر آیتم رک همیشه free_ampere_threshold دارد؛ در فرم این آستانه برای کل دیتاسنتر وارد می‌شود. */
function mapRackItems(items: unknown, freeAmpereThreshold: number) {
	return asRows(items)
		.map(item => ({
			rack_type: mapRackType(item.rackType),
			count: toNumberOrNull(item.count),
			price: toStringOrNull(item.unitPrice),
			free_ampere_threshold: freeAmpereThreshold,
		}))
		.filter(item => item.rack_type != null && Number.isInteger(item.count) && item.count! > 0 && item.price != null);
}

/** پلکان تخفیف فقط برای دیتاسنتر بهشتی در فرم پر می‌شود؛ ردیف‌های خالی ارسال نمی‌شوند. */
function mapRackDiscountTiers(datacenter: Row) {
	return asRows(datacenter.rackDiscountTiers)
		.map(row => ({
			min_inclusive: toStringOrNull(row.from),
			max_exclusive: toStringOrNull(row.to),
			persentage_per_unit: toStringOrNull(row.discountPercent),
		}))
		.filter(row => row.min_inclusive != null || row.max_exclusive != null || row.persentage_per_unit != null);
}

/** هر دیتاسنتر همیشه هر ۵ دسته GLOBAL_* را می‌فرستد؛ نرخ خالی ۰ است (مثل old؛ نبودن یک دسته در BE یعنی «نرخ قرارداد پایه»). */
function mapDatacenterLocations(datacenters: unknown, partnerType: unknown, sla: string | null) {
	const collocationMode = mapCollocationMode(partnerType);
	const isCp = collocationMode === "CP";
	const rate = (value: unknown) => toNumberOrNull(value) ?? 0;

	return asRows(datacenters).flatMap((datacenter) => {
		const datacenterId = toIdOrStringOrNull(datacenter.datacenter);
		if (datacenterId == null)
			return [];

		const base = { collocation_mode: collocationMode, calculation_type: "FLAT", sla, datacenter: datacenterId };
		const freeAmpereThreshold = rate(datacenter.electricityExemptionThreshold);
		// CP همیشه TIER_SINGLE است؛ پلکان تخفیف فقط برای دیتاسنتر بهشتی در فرم پر می‌شود
		const rackDiscountTiers = isCp ? mapRackDiscountTiers(datacenter) : [];

		return [
			{ location: "GLOBAL_IP", ...base, collocation_item: "ip", tiers: { rate_per_unit: rate(datacenter.ipRate) } },
			{ location: "GLOBAL_PORT", ...base, collocation_item: "port", tiers: {}, port_items: mapPortItems(datacenter.portItems) },
			{ location: "GLOBAL_BANDWIDTH", ...base, collocation_item: "bandwidth", tiers: { rate_per_unit: rate(datacenter.bandwidthUnitRate) } },
			{
				location: "GLOBAL_AMPERE",
				...base,
				collocation_item: "ampere",
				free_ampere_threshold: freeAmpereThreshold,
				tiers: { rate_per_unit: rate(datacenter.electricityAmpRate) },
			},
			{
				location: "GLOBAL_RACK",
				...base,
				calculation_type: isCp ? "TIER_SINGLE" : "FLAT",
				collocation_item: "rack",
				tiers: rackDiscountTiers.length > 0 ? { tiers_persentage: rackDiscountTiers } : {},
				rack_items: mapRackItems(datacenter.rackItems, freeAmpereThreshold),
			},
		];
	});
}

function mapTelecomCollocationLocations(source: Row) {
	const rackCount = toStringOrNull(source.telecomRackCount);
	const monthlyRackRent = toStringOrNull(source.telecomMonthlyRackRent);
	if (rackCount == null && monthlyRackRent == null)
		return [];

	return [{
		location: "GLOBAL_COLLOCATION_COST",
		calculation_type: "FLAT",
		units_per_rack: toNumberOrNull(source.telecomUnitsPerRack) ?? DEFAULT_TELECOM_UNITS_PER_RACK,
		rack_count: rackCount,
		tiers: { cost_per_month: monthlyRackRent },
	}];
}

/* ---------- traffic ---------- */

interface TrafficLocationOptions {
	companyType: string
	/** کدام محل‌ها در قرارداد اصلی فعال‌اند (الحاقیه فقط همین محل‌ها را دارد) */
	enabled: { tehran: boolean, province: boolean }
}

function mapTrafficLocationPayload(location: "TEHRAN" | "COUNTY", pricingValue: unknown, unit: unknown, basedTire: boolean | undefined, incomePercentage: unknown, contractModel: unknown) {
	const pricing = pricingToApi(pricingValue);
	if (!pricing)
		return null;
	const normalizedIncomePercentage = toNumberOrNull(incomePercentage);

	return {
		location,
		unit: toStringOrNull(unit) ?? "GB/month",
		calculation_type: pricing.calculation_type,
		tiers: pricing.tiers ?? [],
		// در فرم تیک = «محاسبه پله بر اساس پله بالاتر» و در BE برعکس است (based_tire = not تیک)
		...(typeof basedTire === "boolean" ? { based_tire: !basedTire } : {}),
		...(normalizedIncomePercentage != null ? { income_percentage: normalizedIncomePercentage } : {}),
		...(contractModel != null ? { contract_model: contractModel } : {}),
	};
}

/** جفت تهران/مراکز استان با قیمت‌گذاری، برای قرارداد اصلی و الحاقیه‌ها. */
function mapTrafficLocationPair(source: Row, { companyType, enabled }: TrafficLocationOptions) {
	const isIxp = companyType === "IXP";
	const isPremium = companyType === "PREMIUM";
	const build = (location: "TEHRAN" | "COUNTY", prefix: "tehran" | "province") => mapTrafficLocationPayload(
		location,
		source[`${prefix}Pricing`],
		hasTrafficUnit(companyType) ? source[`${prefix}Unit`] : null,
		isIxp ? source[`${prefix}BasedTire`] === true : undefined,
		isPremium ? source[`${prefix}RevenuePercent`] : null,
		isIxp ? source[`${prefix}ContractModel`] ?? "LEGACY" : undefined,
	);

	return [
		enabled.tehran ? build("TEHRAN", "tehran") : null,
		enabled.province ? build("COUNTY", "province") : null,
	].filter(Boolean);
}

/** قرارداد غیررسمی: فقط محل‌های فعال با واحد (بدون قیمت‌گذاری). تهران پیش‌فرض فعال و استان پیش‌فرض غیرفعال است. */
function mapUnofficialTrafficLocations(serviceFields: Row, companyType: string) {
	const unit = (value: unknown) => toStringOrNull(value) ?? getDefaultTrafficUnit(companyType) ?? null;

	return [
		serviceFields.tehranEnabled !== false ? { location: "TEHRAN", unit: unit(serviceFields.tehranUnit) } : null,
		serviceFields.provinceEnabled === true ? { location: "COUNTY", unit: unit(serviceFields.provinceUnit) } : null,
	].filter(Boolean);
}

interface CollocationAddendaOptions {
	isTelecom: boolean
	partnerType: unknown
}

function mapTrafficAddenda(
	addenda: unknown,
	options: TrafficLocationOptions,
	collocation: CollocationAddendaOptions,
): Row[] {
	return asRows(addenda).map((row) => {
		const locations = options.companyType === "COLLOCATION"
			? collocation.isTelecom
				? mapTelecomCollocationLocations(row)
				: mapDatacenterLocations(row.datacenters, collocation.partnerType, toStringOrNull(row.sla))
			: mapTrafficLocationPair(row, options);

		return {
			...mapAddendumPeriod(row),
			locations,
			children: mapTrafficAddenda(row.children, options, collocation),
		};
	});
}

/* ---------- sms ---------- */

const SMS_OPERATOR_RATE_KEYS = [
	{ operator: "IRANCELL", language: "FA", key: "irancellFa" },
	{ operator: "IRANCELL", language: "EN", key: "irancellEn" },
	{ operator: "MCI", language: "FA", key: "hamrahAvalFa" },
	{ operator: "MCI", language: "EN", key: "hamrahAvalEn", fallbackKey: "hamrahAvalFa" },
	{ operator: "OTHER", language: "FA", key: "otherFa" },
	{ operator: "OTHER", language: "EN", key: "otherEn" },
] as const;

function mapSmsOperatorRates(operatorRevenueValue: unknown) {
	const operatorRevenue = (operatorRevenueValue ?? {}) as Row;
	return SMS_OPERATOR_RATE_KEYS.map(entry => ({
		operator: entry.operator,
		language: entry.language,
		...mapPricingPayload(operatorRevenue[entry.key] ?? ("fallbackKey" in entry ? operatorRevenue[entry.fallbackKey] : undefined)),
	}));
}

function mapSmsProfitPayload(profit: unknown) {
	const source = (profit ?? {}) as Row;
	const minProfit = toStringOrNull(source.minProfit);
	return {
		...mapPricingPayload(source.pricing),
		...(minProfit != null ? { min_profit_amount: minProfit } : {}),
	};
}

/** بدنهٔ نرخ‌های SMS (قرارداد یا الحاقیه): vendor نرخ اپراتور/دولت و client درآمد/سود دارد. */
function mapSmsRates(source: Row, isVendor: boolean) {
	if (isVendor) {
		return {
			operator_rates: mapSmsOperatorRates(source.operatorRevenue),
			government_rate: mapPricingPayload(source.governmentRate),
		};
	}
	return {
		operator_revenue: mapSmsOperatorRates(source.operatorRevenue),
		government_revenue: mapPricingPayload(source.governmentRevenue),
		profit: mapSmsProfitPayload(source.profit),
	};
}

function mapSmsAddenda(addenda: unknown, isVendor: boolean): Row[] {
	return asRows(addenda).map(row => ({
		...mapAddendumPeriod(row),
		...mapSmsRates(row, isVendor),
		children: mapSmsAddenda(row.children, isVendor),
	}));
}

function mapSmsCommissionFields(source: Row) {
	return {
		initial_receive_fee: toStringOrNull(source.initialCommission),
		final_receive_fee: toStringOrNull(source.finalCommission),
		karashab_percent: toStringOrNull(source.expertPercent),
		mokhaberat_percent: toStringOrNull(source.telecomPercent),
		first_side_percent: toStringOrNull(source.firstPartySharePercent),
		area_percent: toStringOrNull(source.regionSharePercent),
		sales_agent_percent: toStringOrNull(source.salesAgentSharePercent),
	};
}

function mapSmsCommissionAddenda(addenda: unknown): Row[] {
	return asRows(addenda).map(row => ({
		...mapAddendumPeriod(row),
		...mapSmsCommissionFields(row),
		children: mapSmsCommissionAddenda(row.children),
	}));
}

/* ---------- openapi / commercial / shahkar / sales agency ---------- */

function mapOpenApiSeparatedDetails(pricing: Row = {}) {
	return {
		openapi_model: "SEPARATED",
		contract_model: "LEGACY_2",
		wallet_charge_discount_percent: toStringOrNull(pricing.walletChargeDiscountPercent),
		bill_inquiry_midterm: pricingToApi(pricing.midPeriodBillInquiry),
		bill_inquiry_endterm: pricingToApi(pricing.endPeriodBillInquiry),
		receipt_register_connected: {
			...pricingToApi(pricing.connectedReceiptRegister),
			karashab_share_percent: toStringOrNull(pricing.connectedKarashabSharePercent),
			partner_share_percent: toStringOrNull(pricing.connectedPartnerSharePercent),
		},
		receipt_register_disconnected: {
			...pricingToApi(pricing.disconnectedReceiptRegister),
			karashab_share_percent: toStringOrNull(pricing.disconnectedKarashabSharePercent),
			partner_share_percent: toStringOrNull(pricing.disconnectedPartnerSharePercent),
		},
	};
}

function mapOpenApiPackageDetails(source: Row) {
	const fixedRate = (value: unknown) => ({
		calculation_type: "FLAT",
		tiers: [{ min_inclusive: null, max_exclusive: null, rate_per_unit: toStringOrNull(value) }],
	});
	return {
		contract_model: "PACKAGE",
		package_model: {
			mode: source.packageMode ?? "OR",
			tiers: asRows(source.plans).map(plan => ({
				sms_min_inclusive: toNumberOrNull(plan.smsMin),
				sms_max_exclusive: toNumberOrNull(plan.smsMax),
				bill_min_inclusive: toNumberOrNull(plan.billMin),
				bill_max_exclusive: toNumberOrNull(plan.billMax),
				partner_share_percent: toStringOrNull(plan.billPartnerShare),
				karashab_share_percent: toStringOrNull(plan.billKarashabShare),
				traffic_profit_percent: toStringOrNull(plan.trafficProfitPercent),
				traffic_partner_share_percent: toStringOrNull(plan.trafficPartnerSharePercent),
				bill_inquiry_rate: fixedRate(plan.billFixedPrice),
				sms_sale_rate: fixedRate(plan.smsFixedPrice),
			})),
		},
	};
}

/** جزئیات OpenAPI قرارداد یا الحاقیه بر اساس مدل (legacy / separated / package). */
function mapOpenApiDetails(source: Row) {
	if (source.contractModel === "separated")
		return mapOpenApiSeparatedDetails(source.separatedPricing as Row | undefined);
	if (source.contractModel === "package")
		return mapOpenApiPackageDetails(source);
	return mapOpenApiLegacyPricingDetails(source.legacyPricing as Row | undefined, source.contractPricing);
}

function mapOpenApiLegacyPricingDetails(legacyPricing: Row | undefined, sharedPricing: unknown = null) {
	return {
		openapi_model: "LEGACY",
		contract_model: "LEGACY",
		receipt_register: pricingToApi(legacyPricing?.paymentRegistration ?? sharedPricing),
		bill_inquiry: pricingToApi(legacyPricing?.billInquiry ?? sharedPricing),
	};
}

function mapOpenApiAddenda(addenda: unknown): Row[] {
	return asRows(addenda).map(row => ({
		...mapAddendumPeriod(row),
		contract_openapi_details: mapOpenApiDetails(row),
		children: mapOpenApiAddenda(row.children),
	}));
}

function mapCommercialAddenda(addenda: unknown): Row[] {
	return asRows(addenda).map(row => ({
		...mapAddendumPeriod(row),
		contract_openapi_details: mapOpenApiLegacyPricingDetails(undefined, row.contractPricing),
		children: mapCommercialAddenda(row.children),
	}));
}

/** در ویرایش، خاموش‌شدن نرخ مشتریان جدید باید صریحاً null بفرستد (BE فقط با null پاک می‌کند). */
function mapNewCustomerRate(source: Row, mode: ContractPayloadMode) {
	const newCustomerPricing = source.hasNewCustomerRate === true ? mapPricingPayload(source.newCustomerPricing) : null;
	if (newCustomerPricing)
		return { new_customer_calculation_type: newCustomerPricing.calculation_type, new_customer_tiers: newCustomerPricing.tiers };
	return mode === "edit" ? { new_customer_calculation_type: null, new_customer_tiers: null } : {};
}

function mapShahkarAddenda(addenda: unknown, mode: ContractPayloadMode): Row[] {
	return asRows(addenda).map(row => ({
		...mapAddendumPeriod(row),
		...mapNewCustomerRate(row, mode),
		...mapPricingPayload(row.contractPricing),
		children: mapShahkarAddenda(row.children, mode),
	}));
}

function toCostTitleNames(titles: unknown) {
	return (Array.isArray(titles) ? titles : [])
		.map(item => String(item ?? "").trim())
		.filter(Boolean);
}

function mapSalesAgencyAddenda(addenda: unknown, companyType: string): Row[] {
	return asRows(addenda).map((row) => {
		const costTitleNames = toCostTitleNames(row.costTitles);
		return {
			...mapAddendumPeriod(row),
			...(companyType === "OUTBOUND"
				? { revenue_percent: toStringOrNull(row.incomePercentage), cost_percent: toStringOrNull(row.expensePercentage) }
				: costTitleNames.length > 0 ? { cost_title_names: costTitleNames } : {}),
			children: mapSalesAgencyAddenda(row.children, companyType),
		};
	});
}

/* ---------- entry ---------- */

/** امضا (قرارداد و الحاقیه) فقط با مجوز مربوط ثبت می‌شود: ایجاد همیشه false و ویرایش وضعیت قبلی را دست نمی‌زند. */
function mapMainSignature(mode: ContractPayloadMode) {
	return mode === "create" ? { is_signed: false } : {};
}

/** الحاقیه‌های جدید (در همهٔ سرویس‌ها و سطوح تو در تو) مثل old با is_signed=false ثبت می‌شوند. */
function withNewAddendaSignature(addenda: Row[], mode: ContractPayloadMode): Row[] {
	if (mode !== "create")
		return addenda;
	return addenda.map(row => ({ ...row, is_signed: false, children: withNewAddendaSignature(asRows(row.children), mode) }));
}

/** بدنهٔ مخصوص هر سرویس (بدون فیلدهای پایه). */
function mapServicePayload(values: ContractFormValues, serviceCode: string, mode: ContractPayloadMode): Payload {
	const serviceFields = (values.serviceFields ?? {}) as Row;
	const addenda = serviceFields.addenda;
	const companyType = String(values.companyType ?? "").trim().toUpperCase();

	if (serviceCode === "sms") {
		const isVendor = values.counterpartyType !== "partners";
		return {
			...mapSmsRates(serviceFields, isVendor),
			...(isVendor ? {} : { is_official: serviceFields.isOfficial ?? true }),
			addenda: mapSmsAddenda(addenda, isVendor),
		};
	}

	if (serviceCode === "sms-commission" || serviceCode === "sms_commission") {
		return {
			sales_agent: toNumberOrNull(serviceFields.agent),
			...mapSmsCommissionFields(serviceFields),
			addenda: mapSmsCommissionAddenda(addenda),
		};
	}

	if (isTelecomFrameCode(serviceCode))
		return mapTelecomFramePayload(serviceFields, mode);

	if (serviceCode === "shahkar") {
		return {
			...mapMainSignature(mode),
			...mapPricingPayload(serviceFields.contractPricing),
			...mapNewCustomerRate(serviceFields, mode),
			addenda: mapShahkarAddenda(addenda, mode),
		};
	}

	if (serviceCode === "commercial") {
		return {
			contract_openapi_details: mapOpenApiLegacyPricingDetails(undefined, serviceFields.contractPricing),
			addenda: mapCommercialAddenda(addenda),
		};
	}

	if (serviceCode === "traffic") {
		const isCollocation = companyType === "COLLOCATION";
		const isTelecom = values.counterpartyType === "gov_ops";
		const isOfficial = isCollocation || (serviceFields.isOfficial ?? true) !== false;
		const enabled = { tehran: serviceFields.tehranPricing != null, province: serviceFields.provincePricing != null };
		const sla = toStringOrNull(serviceFields.sla);
		const locations = isCollocation
			? isTelecom ? mapTelecomCollocationLocations(serviceFields) : mapDatacenterLocations(serviceFields.datacenters, serviceFields.collocationPartnerType, sla)
			: isOfficial ? mapTrafficLocationPair(serviceFields, { companyType, enabled }) : mapUnofficialTrafficLocations(serviceFields, companyType);

		return {
			...mapMainSignature(mode),
			is_official: isOfficial,
			locations,
			...(isCollocation && !isTelecom ? { sla } : {}),
			// قرارداد غیررسمی الحاقیه ندارد (مثل old)
			...(isOfficial ? { addenda: mapTrafficAddenda(addenda, { companyType, enabled }, { isTelecom, partnerType: serviceFields.collocationPartnerType }) } : {}),
		};
	}

	if (serviceCode === "sales_agency" || serviceCode === "sales-agency") {
		return {
			...(companyType === "OUTBOUND"
				? { revenue_percent: toStringOrNull(serviceFields.incomePercentage), cost_percent: toStringOrNull(serviceFields.expensePercentage) }
				: {}),
			...(companyType === "SALES_REP_MANAGEMENT" ? { cost_title_names: toCostTitleNames(serviceFields.costTitles) } : {}),
			addenda: mapSalesAgencyAddenda(addenda, companyType),
		};
	}

	if (serviceCode === "openapi") {
		return {
			openapi_model: { separated: "SEPARATED", package: "PACKAGE" }[String(serviceFields.contractModel)] ?? "LEGACY",
			contract_openapi_details: mapOpenApiDetails(serviceFields),
			addenda: mapOpenApiAddenda(addenda),
		};
	}

	// PSP: فقط فیلدهای پایه و company_type (مثل old)
	return mapMainSignature(mode);
}

/** `resolvedCompanyId` شرکت نهایی است (برای قرارداد مخابرات قبلاً از BE پیدا می‌شود). */
export function formValuesToApiPayload(values: ContractFormValues, resolvedCompanyId: number | null, { mode, hadRealStart = false }: ContractPayloadOptions = { mode: "create" }): Payload {
	const serviceCode = typeof values.serviceCode === "string" ? values.serviceCode.trim().toLowerCase() : "";
	const serviceFields = (values.serviceFields ?? {}) as Row;
	const isSmsVendor = serviceCode === "sms" && values.counterpartyType !== "partners";
	const realStart = mapRealStartPayload(
		{ startYear: values.startYear, startMonth: values.startMonth },
		{ year: serviceFields.realStartYear, month: serviceFields.realStartMonth },
	);

	const servicePayload = mapServicePayload(values, serviceCode, mode);
	const addenda = mode === "edit" && servicePayload.addenda
		? withAddendaIds(servicePayload.addenda as Row[], serviceFields.addenda)
		: servicePayload.addenda && withNewAddendaSignature(servicePayload.addenda as Row[], mode);

	return {
		service: values.serviceId ?? null,
		// SMS طرف اپراتورها/دولت شرکت ندارد
		...(isSmsVendor ? {} : { company: resolvedCompanyId }),
		start_jy: values.startYear ?? null,
		start_jm: values.startMonth ?? null,
		end_jy: values.endYear ?? null,
		end_jm: values.endMonth ?? null,
		contract_number: values.contractNumber ?? "",
		note: values.description ?? "",
		// ویرایش: اگر قرارداد شروع واقعی داشت و حالا خالی شد، BE فقط با null صریح پاکش می‌کند (مثل old)
		...(realStart ? { real_start: realStart } : mode === "edit" && hadRealStart ? { real_start: null } : {}),
		...(values.companyType != null ? { company_type: values.companyType } : {}),
		...(values.counterpartyType != null && serviceCode === "sms" ? { sms_party: values.counterpartyType } : {}),
		...servicePayload,
		...(addenda === undefined ? {} : { addenda }),
	};
}
