import type { ContractServicePath } from "../api/contracts.api";
import type { ContractFormValues } from "../shared/model/contract.form.types";
import type { Row } from "../shared/utils/value-coercion";
import type { ApiPricing } from "./contract.dto";
import { collocationModeToPartnerType, normalizeCollocationLocations } from "../shared/services/traffic/traffic.collocation.mapper";
import { slaCodeFromDto } from "../shared/services/traffic/traffic.sla";
import { pickCompanyTypeToken } from "../shared/utils";
import { asRecord, asRows, toNumberOrNull } from "../shared/utils/value-coercion";
import { apiPricingToContractType } from "./pricing.mapper";

/* GET قرارداد (DTO بک‌اند) → مقادیر فرم ایجاد/ویرایش */

/** اولین مقدار غیر null بین کلیدها (DTO گاهی snake_case و گاهی camelCase است). */
function pick(row: Row, ...keys: string[]): unknown {
	return keys.map(key => row[key]).find(value => value != null);
}

function apiPricing(value: unknown) {
	return apiPricingToContractType((value ?? null) as ApiPricing | null);
}

/** قیمت‌گذاری‌ای که مستقیم روی خود ردیف (calculation_type + tiers) نشسته است. */
function rowPricing(row: Row, prefix = "") {
	return apiPricing({
		calculation_type: pick(row, `${prefix}calculation_type`, `${prefix}calculationType`) ?? null,
		tiers: pick(row, `${prefix}tiers`) ?? null,
	});
}

function servicePathToServiceCode(service: ContractServicePath): string {
	if (service === "sales-agency/outbound" || service === "sales-agency/rep-management")
		return "sales_agency";
	const raw = service.startsWith("sms/") ? "sms" : service;
	return raw.trim().toLowerCase();
}

function normalizeSmsCounterpartyType(value: unknown): "partners" | "gov_ops" | null {
	const normalized = String(value ?? "").trim().toLowerCase();
	if (normalized === "partners" || normalized === "client")
		return "partners";
	if (normalized === "gov_ops" || normalized === "vendor")
		return "gov_ops";
	return null;
}

function normalizeAddendumBase(row: Row) {
	return {
		id: toNumberOrNull(row.id) ?? undefined,
		parentAddendumId: toNumberOrNull(pick(row, "parent_addendum_id", "parentAddendumId")),
		displayAddendumNumber: pick(row, "display_addendum_number", "displayAddendumNumber") ?? undefined,
		startYear: toNumberOrNull(pick(row, "start_jy", "startYear")),
		startMonth: toNumberOrNull(pick(row, "start_jm", "startMonth")),
		endYear: toNumberOrNull(pick(row, "end_jy", "endYear")),
		endMonth: toNumberOrNull(pick(row, "end_jm", "endMonth")),
		contractNumber: pick(row, "contract_number", "contractNumber") ?? "",
		description: pick(row, "note", "description") ?? "",
		isSigned: pick(row, "is_signed", "isSigned") ?? false,
	};
}

/** نگاشت الحاقیه‌ها با حفظ ساختار درخت (`children`)؛ `mapRow` فیلدهای مخصوص سرویس را اضافه می‌کند. */
function mapAddendaTree(addenda: unknown, mapRow: (row: Row) => Row): Row[] {
	return asRows(addenda).map(row => ({
		...normalizeAddendumBase(row),
		...mapRow(row),
		children: mapAddendaTree(row.children, mapRow),
	}));
}

interface AddendaTreeNode {
	key: string
	parentKey: string | null
	order: number
	row: Row & { children: Row[] }
}

/** الحاقیه‌های تخت (با parent_addendum_id) را به درخت تبدیل می‌کند و بر اساس شماره نمایشی مرتب می‌کند. */
function buildAddendaTree(addenda: unknown): Row[] {
	let anonymousId = 0;
	let order = 0;
	const nodes = new Map<string, AddendaTreeNode>();

	const collect = (items: unknown, inferredParentKey: string | null = null) => {
		for (const source of asRows(items)) {
			const id = toNumberOrNull(source.id);
			const key = id != null ? `id:${id}` : `anonymous:${anonymousId++}`;
			const explicitParentId = toNumberOrNull(pick(source, "parentAddendumId", "parent_addendum_id"));
			const parentKey = explicitParentId != null ? `id:${explicitParentId}` : inferredParentKey;
			const node: AddendaTreeNode = nodes.get(key) ?? { key, parentKey, order: order++, row: { children: [] } };

			node.parentKey = node.parentKey ?? parentKey;
			node.row = { ...node.row, ...source, children: [] };
			nodes.set(key, node);
			collect(source.children, key);
		}
	};
	collect(addenda);

	const roots: AddendaTreeNode[] = [];
	for (const node of nodes.values()) {
		const parent = node.parentKey ? nodes.get(node.parentKey) : undefined;
		if (parent && parent.key !== node.key)
			parent.row.children.push(node.row);
		else
			roots.push(node);
	}

	const collator = new Intl.Collator("fa", { numeric: true, sensitivity: "base" });
	const sortRows = (rows: Row[]) => {
		rows.sort((left, right) => {
			const leftNumber = pick(left, "displayAddendumNumber", "display_addendum_number");
			const rightNumber = pick(right, "displayAddendumNumber", "display_addendum_number");
			return leftNumber == null || rightNumber == null ? 0 : collator.compare(String(leftNumber), String(rightNumber));
		});
		rows.forEach(row => sortRows(asRows(row.children)));
	};

	const result = roots.sort((left, right) => left.order - right.order).map(node => node.row);
	sortRows(result);
	return result;
}

function asNumberList(value: unknown) {
	return (Array.isArray(value) ? value : []).map(toNumberOrNull).filter((id): id is number => id != null);
}

function normalizeTrafficLocation(location: unknown) {
	const normalized = String(location ?? "").trim().toUpperCase();
	if (normalized === "PROVINCE" || normalized === "COUNTY")
		return "COUNTY";
	return normalized === "TEHRAN" ? "TEHRAN" : null;
}

function normalizeTrafficUnit(unit: unknown): "GB/month" | "Mbps" | null {
	const normalized = String(unit ?? "").trim().toLowerCase();
	if (normalized === "gb/month")
		return "GB/month";
	return normalized === "mbps" ? "Mbps" : null;
}

/* ---------- openapi / commercial ---------- */

function normalizeOpenApiContractModel(value: unknown): "legacy" | "separated" | "package" | null {
	const model = String(value ?? "").trim().toLowerCase();
	if (["legacy", "old", "classic"].includes(model))
		return "legacy";
	if (["separated", "separate", "split", "legacy_2"].includes(model))
		return "separated";
	return model === "package" ? "package" : null;
}

function hasOpenApiSeparatedPricing(details: Row) {
	return ["wallet_charge_discount_percent", "bill_inquiry_midterm", "bill_inquiry_endterm", "receipt_register_connected", "receipt_register_disconnected"]
		.some(key => Object.prototype.hasOwnProperty.call(details, key));
}

/** BE سهم‌ها را داخل خود عملیات ثبت وصولی (receipt_register_*.karashab_share_percent) برمی‌گرداند. */
function normalizeOpenApiSeparatedPricing(details: Row) {
	const connected = asRecord(details.receipt_register_connected);
	const disconnected = asRecord(details.receipt_register_disconnected);
	return {
		walletChargeDiscountPercent: toNumberOrNull(details.wallet_charge_discount_percent),
		midPeriodBillInquiry: apiPricing(details.bill_inquiry_midterm),
		endPeriodBillInquiry: apiPricing(details.bill_inquiry_endterm),
		connectedReceiptRegister: apiPricing(connected),
		connectedKarashabSharePercent: toNumberOrNull(connected.karashab_share_percent),
		connectedPartnerSharePercent: toNumberOrNull(connected.partner_share_percent),
		disconnectedReceiptRegister: apiPricing(disconnected),
		disconnectedKarashabSharePercent: toNumberOrNull(disconnected.karashab_share_percent),
		disconnectedPartnerSharePercent: toNumberOrNull(disconnected.partner_share_percent),
	};
}

function normalizePackagePlans(packageModel: Row) {
	const firstRate = (rate: unknown) => toNumberOrNull(asRows(asRecord(rate).tiers)[0]?.rate_per_unit);
	return {
		packageMode: packageModel.mode ?? null,
		plans: asRows(packageModel.tiers).map(tier => ({
			smsMin: toNumberOrNull(tier.sms_min_inclusive),
			smsMax: toNumberOrNull(tier.sms_max_exclusive),
			smsFixedPrice: firstRate(tier.sms_sale_rate),
			billMin: toNumberOrNull(tier.bill_min_inclusive),
			billMax: toNumberOrNull(tier.bill_max_exclusive),
			billFixedPrice: firstRate(tier.bill_inquiry_rate),
			billPartnerShare: toNumberOrNull(tier.partner_share_percent),
			billKarashabShare: toNumberOrNull(tier.karashab_share_percent),
			trafficProfitPercent: toNumberOrNull(tier.traffic_profit_percent),
			trafficPartnerSharePercent: toNumberOrNull(tier.traffic_partner_share_percent),
		})),
	};
}

/** جزئیات OpenAPI (قرارداد یا الحاقیه) بر اساس مدل: legacy / separated / package. */
function normalizeOpenApiDetails(details: Row, fallbackModel?: unknown) {
	const declaredModel = normalizeOpenApiContractModel(pick(details, "contract_model", "contractModel", "openapi_model", "openapiModel") ?? fallbackModel);
	const model = declaredModel ?? (hasOpenApiSeparatedPricing(details) ? "separated" : null);

	if (model === "separated")
		return { contractModel: "separated", separatedPricing: normalizeOpenApiSeparatedPricing(details) };
	if (model === "package")
		return { contractModel: "package", ...normalizePackagePlans(asRecord(pick(details, "package_model", "packageModel"))) };
	if (model === "legacy" || details.bill_inquiry != null || details.receipt_register != null) {
		return {
			contractModel: "legacy",
			legacyPricing: {
				paymentRegistration: apiPricing(pick(details, "receipt_register", "receiptRegister")),
				billInquiry: apiPricing(pick(details, "bill_inquiry", "billInquiry")),
			},
		};
	}
	return {};
}

function openApiDetailsOf(row: Row) {
	return asRecord(pick(row, "contract_openapi_details", "contractOpenapiDetails", "contract_openapi_detail", "contractOpenapiDetail"));
}

function normalizeOpenApiServiceFields(dto: Row) {
	const details = openApiDetailsOf(dto);
	// ساختار قدیمی: bill_inquiry/receipt_register مستقیم روی خود قرارداد
	const source = Object.keys(details).length > 0 ? details : dto;
	return {
		...normalizeOpenApiDetails(source, pick(dto, "openapi_model", "openapiModel", "contract_model", "contractModel", "model")),
		addenda: mapAddendaTree(dto.addenda, (row) => {
			const rowDetails = openApiDetailsOf(row);
			const normalized = normalizeOpenApiDetails(Object.keys(rowDetails).length > 0 ? rowDetails : row);
			return normalized.contractModel === "legacy" || normalized.contractModel == null
				? { contractModel: "legacy", legacyPricing: legacyPricingOfAddendum(row, rowDetails) }
				: normalized;
		}),
	};
}

/** الحاقیه legacy: قیمت ثبت وصولی/استعلام یا قیمت مشترک روی ردیف. */
function legacyPricingOfAddendum(row: Row, details: Row) {
	const shared = pick(details, "bill_inquiry", "billInquiry", "receipt_register", "receiptRegister") ?? pick(row, "bill_inquiry", "receipt_register") ?? row;
	return {
		paymentRegistration: apiPricing(pick(details, "receipt_register", "receiptRegister") ?? row.receipt_register ?? shared),
		billInquiry: apiPricing(pick(details, "bill_inquiry", "billInquiry") ?? row.bill_inquiry ?? shared),
	};
}

function normalizeCommercialServiceFields(dto: Row) {
	const details = openApiDetailsOf(dto);
	const pricingSource = (row: Row, rowDetails: Row) => pick(rowDetails, "bill_inquiry", "billInquiry", "receipt_register", "receiptRegister") ?? pick(row, "bill_inquiry", "receipt_register");
	return {
		contractPricing: apiPricing(pricingSource(dto, details)),
		addenda: mapAddendaTree(dto.addenda, row => ({ contractPricing: apiPricing(pricingSource(row, openApiDetailsOf(row))) })),
	};
}

/* ---------- sms ---------- */

const SMS_OPERATOR_FIELDS: Record<string, { FA: string, EN: string }> = {
	IRANCELL: { FA: "irancellFa", EN: "irancellEn" },
	MCI: { FA: "hamrahAvalFa", EN: "hamrahAvalEn" },
	OTHER: { FA: "otherFa", EN: "otherEn" },
};

function normalizeSmsOperatorRevenue(operatorRevenue: unknown) {
	const normalized: Record<string, ReturnType<typeof apiPricing>> = {};
	for (const row of asRows(operatorRevenue)) {
		const operator = String(row.operator ?? "").trim().toUpperCase();
		const language = String(row.language ?? "").trim().toUpperCase() === "EN" ? "EN" : "FA";
		const field = SMS_OPERATOR_FIELDS[operator]?.[language];
		if (field)
			normalized[field] = apiPricing(row);
	}
	return normalized;
}

/** فقط فیلدهای طرف فعال بارگذاری می‌شود: vendor نرخ دولت، client درآمد دولت و سود. */
function normalizeSmsRates(source: Row, isVendor: boolean) {
	const operatorRevenue = normalizeSmsOperatorRevenue(pick(source, "operator_rates", "operator_revenue", "operatorRevenue"));
	if (isVendor)
		return { operatorRevenue, governmentRate: apiPricing(pick(source, "government_rate", "governmentRate", "government_revenue", "governmentRevenue")) };

	const profit = asRecord(source.profit);
	return {
		operatorRevenue,
		governmentRevenue: apiPricing(pick(source, "government_revenue", "governmentRevenue")),
		...(source.profit != null
			? { profit: { pricing: apiPricing(profit), minProfit: toNumberOrNull(pick(profit, "min_profit_amount", "minProfit")) } }
			: {}),
	};
}

function normalizeSmsAddendaFromDto(addenda: unknown, isVendor: boolean): Row[] {
	const list = asRows(addenda);

	// قالب قدیمی BE: هر الحاقیه چند ردیف component دارد
	if (list.some(item => typeof item.component === "string")) {
		const groups = new Map<string, Row[]>();
		for (const row of list) {
			const period = ["start_jy", "start_jm", "end_jy", "end_jm", "contract_number"].map(key => row[key] ?? "").join("-");
			const key = String(pick(row, "display_addendum_number", "displayAddendumNumber") ?? period);
			groups.set(key, [...(groups.get(key) ?? []), row]);
		}

		return [...groups.values()].map((rows) => {
			const componentOf = (component: string) => rows.find(row => String(row.component ?? "").toUpperCase() === component);
			const government = componentOf("GOVERNMENT");
			const profit = componentOf("PROFIT");
			return {
				...normalizeAddendumBase(rows[0]),
				...normalizeSmsRates({
					operator_revenue: rows.filter(row => String(row.component ?? "").toUpperCase() === "OPERATOR"),
					government_revenue: government,
					government_rate: government,
					profit,
				}, isVendor),
				children: normalizeSmsAddendaFromDto(rows.flatMap(row => asRows(row.children)), isVendor),
			};
		});
	}

	return mapAddendaTree(addenda, row => normalizeSmsRates(row, isVendor));
}

function normalizeSmsServiceFields(dto: Row, isVendor: boolean) {
	return {
		isOfficial: pick(dto, "is_official", "isOfficial", "is_signed") ?? true,
		...normalizeSmsRates(dto, isVendor),
		addenda: normalizeSmsAddendaFromDto(dto.addenda, isVendor),
	};
}

function normalizeSmsCommissionFields(source: Row) {
	return {
		initialCommission: toNumberOrNull(pick(source, "initial_receive_fee", "initialReceiveFee")),
		finalCommission: toNumberOrNull(pick(source, "final_receive_fee", "finalReceiveFee")),
		expertPercent: toNumberOrNull(pick(source, "karashab_percent", "karashabPercent")),
		telecomPercent: toNumberOrNull(pick(source, "mokhaberat_percent", "mokhaberatPercent")),
		firstPartySharePercent: toNumberOrNull(pick(source, "first_side_percent", "firstSidePercent")),
		regionSharePercent: toNumberOrNull(pick(source, "area_percent", "areaPercent")),
		salesAgentSharePercent: toNumberOrNull(pick(source, "sales_agent_percent", "salesAgentPercent")),
	};
}

function normalizeSmsCommissionServiceFields(dto: Row) {
	return {
		agent: toNumberOrNull(pick(dto, "sales_agent", "salesAgent", "agent")),
		...normalizeSmsCommissionFields(dto),
		addenda: mapAddendaTree(dto.addenda, normalizeSmsCommissionFields),
	};
}

/* ---------- shahkar ---------- */

/** نرخ مشتریان جدید فقط با `new_customer_calculation_type` مشخص می‌شود (BE فلگ جدا برنمی‌گرداند). */
function normalizeNewCustomerRate(source: Row) {
	const hasNewCustomerType = Boolean(pick(source, "new_customer_calculation_type", "newCustomerCalculationType"));
	const hasNewCustomerRate = hasNewCustomerType || asRows(pick(source, "new_customer_tiers", "newCustomerTiers")).length > 0;
	return {
		hasNewCustomerRate,
		...(hasNewCustomerRate
			? {
				newCustomerPricing: apiPricing({
					calculation_type: pick(source, "new_customer_calculation_type", "newCustomerCalculationType") ?? null,
					tiers: pick(source, "new_customer_tiers", "newCustomerTiers") ?? null,
				}),
			}
			: {}),
	};
}

function normalizeShahkarServiceFields(dto: Row) {
	return {
		isSigned: pick(dto, "is_signed", "isSigned") ?? false,
		contractPricing: rowPricing(dto),
		...normalizeNewCustomerRate(dto),
		addenda: mapAddendaTree(dto.addenda, row => ({ contractPricing: rowPricing(row), ...normalizeNewCustomerRate(row) })),
	};
}

/* ---------- traffic ---------- */

/** BE based_tire را معکوس «محاسبه پله بر اساس پله بالاتر» نگه می‌دارد. */
function normalizeBasedTire(location: Row | undefined) {
	return !(pick(location ?? {}, "based_tire", "basedTire") ?? true);
}

function findTrafficLocation(locations: Row[], target: "TEHRAN" | "COUNTY") {
	return locations.find(location => normalizeTrafficLocation(location.location) === target);
}

/** فیلدهای یک محل (تهران یا استان) در قرارداد اصلی یا الحاقیه. */
function normalizeTrafficLocationFields(location: Row | undefined, prefix: "tehran" | "province", withPricing: boolean) {
	return {
		[`${prefix}Pricing`]: location && withPricing ? rowPricing(location) : undefined,
		[`${prefix}Unit`]: normalizeTrafficUnit(location?.unit),
		[`${prefix}BasedTire`]: normalizeBasedTire(location),
		[`${prefix}ContractModel`]: pick(location ?? {}, "contract_model", "contractModel") ?? "LEGACY",
		[`${prefix}RevenuePercent`]: toNumberOrNull(pick(location ?? {}, "income_percentage", "incomePercentage")),
	};
}

function normalizeTrafficAddendaFromDto(addenda: unknown, isCollocation: boolean): Row[] {
	return mapAddendaTree(addenda, (row) => {
		if (isCollocation) {
			const collocation = normalizeCollocationLocations(row.locations);
			return {
				sla: slaCodeFromDto(row.sla),
				datacenters: collocation.datacenters,
				telecomRackCount: collocation.telecomRackCount,
				telecomUnitsPerRack: collocation.telecomUnitsPerRack,
				telecomMonthlyRackRent: collocation.telecomMonthlyRackRent,
			};
		}
		const locations = asRows(row.locations).length > 0 ? asRows(row.locations) : [row];
		return {
			...normalizeTrafficLocationFields(findTrafficLocation(locations, "TEHRAN"), "tehran", true),
			...normalizeTrafficLocationFields(findTrafficLocation(locations, "COUNTY"), "province", true),
		};
	});
}

function normalizeTrafficServiceFields(dto: Row) {
	const locations = asRows(dto.locations);
	const tehranLocation = findTrafficLocation(locations, "TEHRAN");
	const countyLocation = findTrafficLocation(locations, "COUNTY");
	const isOfficial = pick(dto, "is_official", "isOfficial") ?? true;
	const collocation = normalizeCollocationLocations(locations);

	return {
		isOfficial,
		// قرارداد غیررسمی قیمت ندارد؛ فقط فعال بودن محل‌ها مهم است
		tehranEnabled: tehranLocation != null,
		provinceEnabled: countyLocation != null,
		collocationPartnerType: collocation.partnerType ?? collocationModeToPartnerType(dto.collocation_mode),
		sla: slaCodeFromDto(dto.sla),
		datacenters: collocation.datacenters,
		telecomRackCount: collocation.telecomRackCount,
		telecomUnitsPerRack: collocation.telecomUnitsPerRack,
		telecomMonthlyRackRent: collocation.telecomMonthlyRackRent,
		...normalizeTrafficLocationFields(tehranLocation, "tehran", isOfficial !== false),
		...normalizeTrafficLocationFields(countyLocation, "province", isOfficial !== false),
		addenda: normalizeTrafficAddendaFromDto(dto.addenda, pickCompanyTypeToken(pick(dto, "company_type", "traffic_company_type")) === "COLLOCATION"),
	};
}

/* ---------- sales agency ---------- */

function normalizeSalesAgencyAddendumFields(row: Row) {
	const titles = pick(row, "cost_titles", "cost_title_names");
	return {
		incomePercentage: toNumberOrNull(row.revenue_percent),
		expensePercentage: toNumberOrNull(row.cost_percent),
		costTitles: Array.isArray(titles) ? titles.map(title => String(title)) : [],
	};
}

function normalizeSalesAgencyServiceFields(dto: Row, companyType: string | null) {
	const addenda = mapAddendaTree(dto.addenda, normalizeSalesAgencyAddendumFields);
	if (companyType === "SALES_REP_MANAGEMENT") {
		const titles = pick(dto, "cost_titles", "cost_title_names", "costTitles", "costTitleNames");
		return {
			addenda,
			costTitles: Array.isArray(titles)
				? titles.map(title => String(title != null && typeof title === "object" ? pick(title as Row, "title", "name", "cost_title", "expense_title") ?? "" : title ?? ""))
				: [],
		};
	}

	return {
		addenda,
		incomePercentage: toNumberOrNull(pick(dto, "revenue_percent", "income_percentage", "incomePercentage")),
		expensePercentage: toNumberOrNull(pick(dto, "cost_percent", "expense_percentage", "expensePercentage")),
	};
}

/* ---------- telecom frame ---------- */

function normalizeTelecomFrameContractTypes(rows: unknown) {
	return asRows(rows).map(row => ({
		contractType: row.contract_type,
		revenue: toNumberOrNull(row.revenue),
		manHours: toNumberOrNull(row.man_hours),
	}));
}

function normalizeTelecomFramePenalty(penalty: unknown) {
	const row = asRecord(penalty);
	return {
		hasPenalty: penalty != null,
		penalty: penalty != null
			? {
				initialGraceDays: toNumberOrNull(row.initial_grace_days),
				toleranceDays: toNumberOrNull(row.tolerance_days),
				penaltyPercent: toNumberOrNull(row.penalty_percent),
			}
			: null,
	};
}

function normalizeTelecomFrameServiceFields(dto: Row) {
	return {
		contractTypes: normalizeTelecomFrameContractTypes(dto.contract_types),
		boPersonIds: asNumberList(dto.bo_person_ids),
		poPersonIds: asNumberList(dto.po_person_ids),
		...normalizeTelecomFramePenalty(dto.penalty),
		statusTimeline: asRows(dto.status_timeline).map(row => ({
			id: toNumberOrNull(row.id) ?? undefined,
			status: row.status,
			startDate: row.start_date ?? "",
			endDateExclusive: row.end_date_exclusive ?? "",
			note: row.note ?? "",
		})),
		addenda: mapAddendaTree(dto.addenda, row => ({ contractTypes: normalizeTelecomFrameContractTypes(row.contract_types) })),
	};
}

/* ---------- entry ---------- */

function normalizeServiceFields(dto: Row, serviceCode: string | null, companyType: string | null, isSmsVendor: boolean): Row {
	switch (serviceCode) {
		case "openapi":
			return normalizeOpenApiServiceFields(dto);
		case "sms":
			return normalizeSmsServiceFields(dto, isSmsVendor);
		case "sms-commission":
		case "sms_commission":
			return normalizeSmsCommissionServiceFields(dto);
		case "shahkar":
			return normalizeShahkarServiceFields(dto);
		case "commercial":
			return normalizeCommercialServiceFields(dto);
		case "traffic":
			return normalizeTrafficServiceFields(dto);
		case "telecom_frame":
		case "telecom-frame":
			return normalizeTelecomFrameServiceFields(dto);
		case "sales_agency":
		case "sales-agency":
			return normalizeSalesAgencyServiceFields(dto, companyType);
		default:
			// PSP و سرویس‌های بدون فیلد اختصاصی: فقط فیلدهای پایه فرم دارند
			return {};
	}
}

export function contractDetailToFormValues(dtoInput: unknown, service: ContractServicePath): ContractFormValues {
	const dto = asRecord(dtoInput);
	const nested = (key: string) => asRecord(dto[key]);
	const serviceId = toNumberOrNull(pick(dto, "service_id", "serviceId") ?? nested("service").id ?? dto.service);
	const companyId = toNumberOrNull(pick(dto, "company_id", "companyId") ?? nested("company").id ?? dto.company);

	const routeCompanyType = service === "sales-agency/outbound"
		? "OUTBOUND"
		: service === "sales-agency/rep-management" ? "SALES_REP_MANAGEMENT" : null;
	const companyType = pickCompanyTypeToken(pick(dto, "company_type", "traffic_company_type")) ?? routeCompanyType;
	const smsPathParty = service === "sms/client" ? "partners" : service === "sms/vendor" ? "gov_ops" : null;
	const smsCounterpartyType = normalizeSmsCounterpartyType(pick(dto, "sms_party", "counterparty_type", "counterpartyType")) ?? smsPathParty;

	const serviceCodeRaw = dto.service_code ?? nested("service").code ?? servicePathToServiceCode(service);
	const serviceCode = typeof serviceCodeRaw === "string" ? serviceCodeRaw.trim().toLowerCase() : null;

	const normalizedFields = normalizeServiceFields(dto, serviceCode, companyType, smsCounterpartyType === "gov_ops");
	const serviceFields: Row = {
		...normalizedFields,
		// شروع واقعی برای همه سرویس‌ها (فقط وقتی شروع قرارداد دقیقاً ۱۴۰۴/۴ است معنا دارد)
		realStartYear: toNumberOrNull(asRecord(pick(dto, "real_start", "realStart")).real_start_jy),
		realStartMonth: toNumberOrNull(asRecord(pick(dto, "real_start", "realStart")).real_start_jm),
		...(Array.isArray(normalizedFields.addenda) ? { addenda: buildAddendaTree(normalizedFields.addenda) } : {}),
	};

	// ترافیک کولوکیشن: وجود ردیف هزینه رک یعنی قرارداد شرکت مخابرات (gov_ops)، وگرنه شرکای تجاری
	const counterpartyType = serviceCode === "traffic" && companyType === "COLLOCATION"
		? serviceFields.telecomRackCount != null || serviceFields.telecomMonthlyRackRent != null ? "gov_ops" : "partners"
		: smsCounterpartyType;

	return {
		serviceId,
		serviceCode: serviceCode as ContractFormValues["serviceCode"],
		companyId,
		companyType,
		counterpartyType,

		startYear: toNumberOrNull(pick(dto, "start_jy", "startYear")),
		startMonth: toNumberOrNull(pick(dto, "start_jm", "startMonth")),
		endYear: toNumberOrNull(pick(dto, "end_jy", "endYear")),
		endMonth: toNumberOrNull(pick(dto, "end_jm", "endMonth")),
		contractNumber: String(pick(dto, "contract_number", "contractNumber", "contract_no") ?? ""),

		description: String(pick(dto, "note", "description") ?? ""),
		documents: Array.isArray(dto.documents) ? dto.documents : [],
		serviceFields,
	};
}
