import type { ContractServicePath } from "#src/features/contract/api/contracts.api";
import type { ContractFormValues } from "#src/features/contract/shared/model/contract.form.types";
import type { ContractSectionTone } from "#src/features/contract/shared/ui/form/components/contract-form-section-tone";

import type { ReactNode } from "react";
import { companiesByServiceQuery, servicesQuery } from "#src/features/contract/create/queries/contract.queries";
import { ContractSectionToneContext } from "#src/features/contract/shared/ui/form/components/contract-section-tone-context";
import { ContractDashedBorder } from "#src/features/contract/shared/ui/form/components/ContractDashedBorder";
import { ContractFormSection } from "#src/features/contract/shared/ui/form/components/ContractFormSection";
import { useQuery } from "@tanstack/react-query";
import { Collapse, Tag } from "antd";
import "#src/features/contract/shared/ui/form/contract-form.css";

const HIDDEN_KEYS = new Set(["rowKey", "datacenterSystemTag"]);
const CURRENCY_FIELD_KEYS = new Set(["commission", "initialCommission", "finalCommission", "minProfit", "minimumProfit"]);

const LABELS: Record<string, string> = {
	addenda: "الحاقیه‌ها",
	agent: "نماینده فروش",
	amount: "مبلغ",
	bandwidthUnitRate: "نرخ واحد پهنای باند",
	billFixedPrice: "نرخ استعلام قبض",
	billInquiry: "استعلام قبض",
	billKarashabShare: "سهم کراس‌شاپ",
	billMax: "حد بالای قبض",
	billMin: "حد پایین قبض",
	billPartnerShare: "سهم طرف قرارداد",
	calculationMode: "مدل محاسبه",
	collocationPartnerType: "نوع شریک کولوکیشن",
	contractModel: "مدل قرارداد",
	contractPricing: "نحوه محاسبه قرارداد",
	costTitles: "عنوان‌های هزینه‌ها",
	count: "تعداد",
	datacenter: "دیتاسنتر",
	datacenters: "دیتاسنترها",
	discountPercent: "درصد تخفیف",
	expensePercentage: "درصد هزینه",
	electricityAmpRate: "نرخ آمپر برق",
	electricityExemptionThreshold: "آستانه معافیت برق",
	expertPercent: "درصد کاراشاب",
	fee: "کارمزد",
	finalCommission: "کارمزد دریافتی نهایی",
	firstPartySharePercent: "درصد سهم طرف اول",
	fixedAmount: "مبلغ ثابت",
	from: "از",
	governmentRate: "سهم دولت",
	governmentRevenue: "درآمد دولت",
	hamrahAvalEn: "همراه اول - انگلیسی",
	hamrahAvalFa: "همراه اول - فارسی",
	initialCommission: "کارمزد دریافتی اولیه",
	incomePercentage: "درصد درآمد",
	irancellEn: "ایرانسل - انگلیسی",
	irancellFa: "ایرانسل - فارسی",
	ipRate: "نرخ IP",
	isOfficial: "نوع قرارداد",
	isSigned: "وضعیت امضا",
	legacyPricing: "کارمزدها و درصدها",
	operatorRevenue: "درآمد اپراتورها",
	otherEn: "سایر - انگلیسی",
	otherFa: "سایر - فارسی",
	packageMode: "نوع پکیج",
	paymentRegistration: "بهای ثبت وصولی",
	plans: "پلن‌ها",
	portItems: "پورت‌ها",
	price: "قیمت",
	profit: "تعیین کارمزد و سهم",
	provincePricing: "قرارداد ترافیک مراکز استان‌ها",
	provinceRevenuePercent: "درصد سهم درآمد مراکز استان‌ها",
	provinceUnit: "واحد مراکز استان‌ها",
	rackItems: "رک‌ها",
	rackType: "نوع رک",
	rate: "نرخ",
	realStartMonth: "ماه شروع واقعی قرارداد",
	realStartYear: "سال شروع واقعی قرارداد",
	revenuePercent: "درصد سهم درآمد",
	regionSharePercent: "درصد سهم منطقه",
	rows: "پلکان‌ها",
	salesAgentSharePercent: "درصد سهم نماینده فروش",
	sections: "بخش‌های محاسبه",
	smsFixedPrice: "نرخ فروش پیامک",
	smsMax: "حد بالای پیامک",
	smsMin: "حد پایین پیامک",
	speed: "سرعت",
	tehranPricing: "قرارداد ترافیک تهران",
	tehranRevenuePercent: "درصد سهم درآمد تهران",
	tehranUnit: "واحد تهران",
	telecomMonthlyRackRent: "اجاره ماهانه رک مخابرات",
	telecomPercent: "درصد مخابرات",
	telecomRackCount: "تعداد رک مخابرات",
	telecomUnitsPerRack: "تعداد یونیت هر رک",
	to: "تا",
	trafficPartnerSharePercent: "درصد سهم شریک ترافیک",
	trafficProfitPercent: "درصد سود ترافیک",
	type: "نوع محاسبه",
	unit: "واحد",
	unitPrice: "قیمت واحد",
	title: "عنوان هزینه",
};

const SERVICE_TITLES: Record<string, string> = {
	"openapi": "بهای ثبت وصولی و استعلام قبض",
	"traffic": "بهای ترافیک",
	"psp": "کارمزدها و درصدها",
	"commercial": "بهای هر واحد",
	"shahkar": "بهای هر واحد",
	"sales-agency/outbound": "پورسانت نمایندگی فروش",
	"sales-agency/rep-management": "مدیریت نمایندگان فروش",
	"sms/client": "درآمد اپراتورها",
	"sms/vendor": "درآمد اپراتورها",
	"sms-commission": "کارمزدها و درصدها",
};

function getTone(service: ContractServicePath): ContractSectionTone {
	if (service === "openapi")
		return "purple";
	if (service === "traffic")
		return "traffic";
	if (service === "sms-commission")
		return "gold";
	return "primary";
}

function isEmpty(value: unknown): boolean {
	if (value == null || value === "")
		return true;
	if (Array.isArray(value))
		return value.length === 0 || value.every(isEmpty);
	if (typeof value === "object")
		return Object.entries(value as Record<string, unknown>).filter(([key]) => !HIDDEN_KEYS.has(key)).every(([, item]) => isEmpty(item));
	return false;
}

function formatValue(value: unknown) {
	if (value == null || value === "")
		return "—";
	if (typeof value === "boolean")
		return <Tag color={value ? "success" : "default"}>{value ? "بله" : "خیر"}</Tag>;
	if (typeof value === "number")
		return new Intl.NumberFormat("fa-IR").format(value);
	const normalized = String(value);
	const known: Record<string, string> = {
		fixed: "ثابت",
		tier_fixed: "پلکانی ثابت",
		tier_variable: "پلکانی متغیر",
		tier_blended: "پلکانی ترکیبی",
		legacy: "قدیمی",
		package: "پکیج",
	};
	return known[normalized] ?? normalized;
}

function fieldLabel(key: string) {
	return LABELS[key] ?? key.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " ");
}

function formatFieldValue(key: string, value: unknown) {
	if (key === "isOfficial" && typeof value === "boolean")
		return <Tag color={value ? "success" : "default"}>{value ? "رسمی" : "غیررسمی"}</Tag>;
	if (key === "isSigned" && typeof value === "boolean")
		return <Tag color={value ? "success" : "default"}>{value ? "امضا شده" : "امضا نشده"}</Tag>;
	if (value != null && value !== "") {
		const isPercent = /(?:percent|percentage)$/i.test(key);
		const unit = isPercent ? "درصد" : CURRENCY_FIELD_KEYS.has(key) ? "ریال" : null;
		if (unit && !String(value).includes(unit) && !String(value).includes("%")) {
			return (
				<>
					{formatValue(value)}
					{" "}
					{unit}
				</>
			);
		}
	}
	return formatValue(value);
}

function FieldRows({ fields, showLastDivider = false }: { fields: Array<[string, ReactNode]>, showLastDivider?: boolean }) {
	const rows = Array.from({ length: Math.ceil(fields.length / 2) }, (_, rowIndex) => fields.slice(rowIndex * 2, rowIndex * 2 + 2));

	return (
		<div className="flex flex-col">
			{rows.map((row, rowIndex) => {
				const hasDivider = rowIndex < rows.length - 1 || showLastDivider;
				const dividerClass = hasDivider ? "border-b border-[var(--ant-color-split)]" : "";

				return (
					<div
						key={row.map(([label]) => label).join("-")}
						className={`grid grid-cols-1 gap-x-8 md:grid-cols-2 ${dividerClass}`}
					>
						{row.map(([label, value]) => (
							<div key={label} className="flex min-h-14 items-center justify-between gap-4 py-2">
								<span className="text-sm text-[var(--ant-color-text-secondary)]">
									{label}
									:
								</span>
								<span className="text-sm font-medium text-[var(--ant-color-text)]">{value}</span>
							</div>
						))}
					</div>
				);
			})}
		</div>
	);
}

interface PricingValue {
	type?: string | null
	fixedAmount?: number | null
	rows?: Array<{ from?: number | null, to?: number | null, fee?: number | null }>
	sections?: Array<{ mode?: string | null, rows?: Array<{ from?: number | null, to?: number | null, fee?: number | null }> }>
}

function isPricingValue(value: unknown): value is PricingValue {
	return value != null && typeof value === "object" && "type" in value;
}

function PricingRows({ rows }: { rows: PricingValue["rows"] }) {
	if (!rows?.length)
		return null;

	return (
		<div className="mt-4 overflow-x-auto">
			<div className="min-w-[520px]">
				<div className="grid grid-cols-3 gap-3">
					{["شروع بازه", "پایان بازه", "مبلغ هر واحد"].map(title => <div key={title} className="rounded-md bg-[var(--contract-section-accent-bg)] px-3 py-1.5 text-center text-sm font-semibold text-[var(--contract-section-accent-color)]">{title}</div>)}
				</div>
				{rows.map(row => (
					<div key={JSON.stringify(row)} className="mt-2 grid grid-cols-3 gap-3 border-b border-[var(--ant-color-split)] py-2 text-center text-sm last:border-b-0">
						<span>{formatValue(row.from)}</span>
						<span>{formatValue(row.to)}</span>
						<span>
							{formatValue(row.fee)}
							{" "}
							ریال
						</span>
					</div>
				))}
			</div>
		</div>
	);
}

function PricingTierContent({ value }: { value: PricingValue }) {
	const type = value.type ?? "fixed";
	if (type === "tier_fixed" || type === "tier_variable")
		return <PricingRows rows={value.rows} />;
	if (type !== "tier_blended")
		return null;

	return (
		<div className="mt-4 flex flex-col gap-3">
			{value.sections?.map((section, index) => (
				<div key={JSON.stringify(section)} className="rounded-xl bg-[var(--ant-color-fill-quaternary)] p-4">
					<Tag bordered={false} className="!bg-[var(--contract-section-accent-bg)] !text-[var(--contract-section-accent-color)]">
						بخش
						{index + 1}
						:
						{section.mode === "variable" ? "متغیر" : "ثابت"}
					</Tag>
					<PricingRows rows={section.rows} />
				</div>
			))}
		</div>
	);
}

function PricingDetails({ value, aside }: { value: PricingValue, aside?: ReactNode }) {
	const typeLabels: Record<string, string> = {
		fixed: "ثابت",
		tier_fixed: "پلکانی ثابت",
		tier_variable: "پلکانی متغیر",
		tier_blended: "پلکانی ترکیبی",
	};
	const type = value.type ?? "fixed";
	const hasValueFields = type === "fixed" || aside != null;

	return (
		<div>
			<div className="flex flex-wrap items-center gap-3">
				<Tag bordered={false} className="!m-0 !bg-[var(--ant-color-primary-bg-hover)] !px-3 !py-1 !text-[var(--ant-color-text)]">
					مدل محاسبه:
					{" "}
					{typeLabels[type] ?? type}
				</Tag>
				{hasValueFields
					? (
						<div className={`grid min-w-0 flex-1 border-b border-[var(--ant-color-split)] ${type === "fixed" && aside != null ? "md:grid-cols-2" : "grid-cols-1"}`}>
							{type === "fixed"
								? (
									<div className="flex min-h-10 w-full items-center justify-between gap-4 px-3 text-sm">
										<span className="text-[var(--ant-color-text-secondary)]">مبلغ هر واحد:</span>
										<span className="font-medium">
											{formatValue(value.fixedAmount)}
											{" "}
											ریال
										</span>
									</div>
								)
								: null}
							{aside}
						</div>
					)
					: null}
			</div>
			<PricingTierContent value={value} />
		</div>
	);
}

function TrafficLocationDetails({ pricing, unit, revenuePercent }: { pricing: unknown, unit: unknown, revenuePercent: unknown }) {
	if (!isPricingValue(pricing))
		return null;

	const type = pricing.type ?? "fixed";
	const typeLabels: Record<string, string> = {
		fixed: "ثابت",
		tier_fixed: "پلکانی ثابت",
		tier_variable: "پلکانی متغیر",
		tier_blended: "پلکانی ترکیبی",
	};

	return (
		<div>
			<div className={`grid grid-cols-1 border-b border-[var(--ant-color-split)] ${type === "fixed" ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
				<div className="flex min-h-12 w-full items-center px-3">
					<Tag bordered={false} className="!m-0 !bg-[var(--ant-color-primary-bg-hover)] !px-3 !py-1 !text-[var(--ant-color-text)]">
						مدل محاسبه:
						{" "}
						{typeLabels[type] ?? type}
					</Tag>
				</div>
				{type === "fixed"
					? (
						<div className="flex min-h-12 w-full items-center justify-between gap-2 px-3 text-sm">
							<span className="text-[var(--ant-color-text-secondary)]">مبلغ هر واحد:</span>
							<span className="font-medium">
								{formatValue(pricing.fixedAmount)}
								{" "}
								ریال
							</span>
						</div>
					)
					: null}
				<div className="flex min-h-12 w-full items-center justify-between gap-2 px-3 text-sm">
					<span className="text-[var(--ant-color-text-secondary)]">واحد:</span>
					<span className="font-medium">{formatValue(unit)}</span>
				</div>
				<div className="flex min-h-12 w-full items-center justify-between gap-2 px-3 text-sm">
					<span className="text-[var(--ant-color-text-secondary)]">درصد سهم درآمد:</span>
					<span className="font-medium">{formatValue(revenuePercent)}</span>
				</div>
			</div>
			<PricingTierContent value={pricing} />
		</div>
	);
}

function ValueGrid({ data, tone, level = 0 }: { data: Record<string, unknown>, tone: ContractSectionTone, level?: number }) {
	const entries = Object.entries(data).filter(([key, value]) => !HIDDEN_KEYS.has(key) && !isEmpty(value));
	const simple = entries.filter(([, value]) => typeof value !== "object" || value == null);
	const complex = entries.filter(([, value]) => value != null && typeof value === "object");

	return (
		<div className="flex flex-col gap-4">
			{simple.length > 0
				? <FieldRows fields={simple.map(([key, value]) => [fieldLabel(key), formatFieldValue(key, value)])} />
				: null}
			{complex.map(([key, value]) => {
				if (isPricingValue(value)) {
					return (
						<div key={key}>
							{key === "contractPricing" ? null : <div className="mb-2 text-sm font-semibold">{fieldLabel(key)}</div>}
							<PricingDetails value={value} />
						</div>
					);
				}
				const items = Array.isArray(value) ? value : [value];
				return (
					<div key={key} className={level > 0 ? "rounded-xl bg-[var(--ant-color-fill-quaternary)] p-4" : ""}>
						<div className="mb-3 text-sm font-semibold text-[var(--ant-color-text)]">{fieldLabel(key)}</div>
						<div className="flex flex-col gap-3">
							{items.map((item, index) => (
								<ContractFormSection key={`${key}-${JSON.stringify(item)}`} title={items.length > 1 ? `${fieldLabel(key)} ${index + 1}` : fieldLabel(key)} tone={key === "addenda" ? "addenda" : tone} defaultExpanded={index === 0}>
									<ValueGrid data={item as Record<string, unknown>} tone={tone} level={level + 1} />
								</ContractFormSection>
							))}
						</div>
					</div>
				);
			})}
		</div>
	);
}

function PricingSection({ title, value, tone }: { title: string, value: unknown, tone: ContractSectionTone }) {
	if (!isPricingValue(value) || isEmpty(value))
		return null;

	return (
		<ContractFormSection title={title} tone={tone} defaultExpanded>
			<PricingDetails value={value} />
		</ContractFormSection>
	);
}

function FixedOperatorPricing({ title, value }: { title: string, value: PricingValue }) {
	return (
		<div className="flex min-h-16 w-full flex-wrap items-center justify-between gap-3 px-3 py-2">
			<span className="text-sm font-semibold text-[var(--ant-color-text)]">{title}</span>
			<div className="flex flex-wrap items-center gap-3">
				<Tag bordered={false} className="!m-0 !bg-[var(--ant-color-primary-bg-hover)] !px-3 !py-1 !text-[var(--ant-color-text)]">
					مدل محاسبه: ثابت
				</Tag>
				<div className="flex items-center gap-3 text-sm">
					<span className="text-[var(--ant-color-text-secondary)]">مبلغ هر واحد:</span>
					<span className="font-medium">
						{formatValue(value.fixedAmount)}
						{" "}
						ریال
					</span>
				</div>
			</div>
		</div>
	);
}

function SmsOperatorRevenueDetails({ data }: { data: Record<string, unknown> }) {
	const groups = [
		[{ key: "irancellEn", title: "ایرانسل - انگلیسی" }, { key: "irancellFa", title: "ایرانسل - فارسی" }],
		[{ key: "hamrahAvalEn", title: "همراه اول - انگلیسی" }, { key: "hamrahAvalFa", title: "همراه اول - فارسی" }],
		[{ key: "otherEn", title: "سایر - انگلیسی" }, { key: "otherFa", title: "سایر - فارسی" }],
	];

	return (
		<div>
			{groups.map((group, groupIndex) => {
				const entries = group
					.map(item => ({ ...item, value: data[item.key] }))
					.filter(item => isPricingValue(item.value) && !isEmpty(item.value)) as Array<{ key: string, title: string, value: PricingValue }>;
				if (entries.length === 0)
					return null;

				const allFixed = entries.every(item => (item.value.type ?? "fixed") === "fixed");
				return (
					<div key={group[0].key} className={groupIndex < groups.length - 1 ? "border-b border-[var(--ant-color-split)]" : ""}>
						{allFixed
							? (
								<div className="grid grid-cols-1 md:grid-cols-2">
									{entries.map(item => <FixedOperatorPricing key={item.key} title={item.title} value={item.value} />)}
								</div>
							)
							: (
								<div className="flex flex-col gap-4 py-3">
									{entries.map(item => (
										<div key={item.key}>
											<div className="mb-2 text-sm font-semibold">{item.title}</div>
											<PricingDetails value={item.value} />
										</div>
									))}
								</div>
							)}
					</div>
				);
			})}
		</div>
	);
}

function ServiceDetails({ data, service, tone }: { data: Record<string, unknown>, service: ContractServicePath, tone: ContractSectionTone }) {
	if (service === "openapi") {
		const legacyPricing = data.legacyPricing as Record<string, unknown> | undefined;
		if (data.contractModel === "legacy" && legacyPricing) {
			return (
				<>
					<PricingSection title="بهای ثبت وصولی" value={legacyPricing.paymentRegistration} tone="purple" />
					<PricingSection title="بهای استعلام قبض" value={legacyPricing.billInquiry} tone="purple" />
				</>
			);
		}

		const plans = Array.isArray(data.plans) ? data.plans as Array<Record<string, unknown>> : [];
		return plans.length === 0
			? null
			: (
				<ContractFormSection title="پلن‌ها" tone="purple" defaultExpanded>
					<Collapse
						defaultActiveKey={["0"]}
						items={plans.map((plan, index) => ({
							key: String(index),
							label: `پلن بسته ${index + 1}`,
							children: <ValueGrid data={plan} tone="purple" />,
						}))}
					/>
				</ContractFormSection>
			);
	}

	if (service === "commercial" || service === "shahkar")
		return <PricingSection title="بهای هر واحد" value={data.contractPricing} tone={tone} />;

	if (service === "traffic") {
		const baseFields = Object.fromEntries(Object.entries(data).filter(([key]) => ![
			"tehranPricing",
			"tehranUnit",
			"tehranRevenuePercent",
			"provincePricing",
			"provinceUnit",
			"provinceRevenuePercent",
		].includes(key)));
		return (
			<ContractFormSection title="بهای ترافیک" tone="traffic" defaultExpanded>
				{isEmpty(baseFields) ? null : <ValueGrid data={baseFields} tone="traffic" />}
				{isEmpty(data.tehranPricing)
					? null
					: (
						<div className="mt-3">
							<ContractFormSection title="قرارداد ترافیک تهران" tone="traffic" defaultExpanded>
								<TrafficLocationDetails pricing={data.tehranPricing} unit={data.tehranUnit} revenuePercent={data.tehranRevenuePercent} />
							</ContractFormSection>
						</div>
					)}
				{isEmpty(data.provincePricing)
					? null
					: (
						<div className="mt-3">
							<ContractFormSection title="قرارداد ترافیک مراکز استان‌ها" tone="traffic" defaultExpanded>
								<TrafficLocationDetails pricing={data.provincePricing} unit={data.provinceUnit} revenuePercent={data.provinceRevenuePercent} />
							</ContractFormSection>
						</div>
					)}
			</ContractFormSection>
		);
	}

	if (service === "sales-agency/outbound" || service === "sales-agency/rep-management") {
		return <ContractFormSection title={SERVICE_TITLES[service]} tone={tone} defaultExpanded><ValueGrid data={data} tone={tone} /></ContractFormSection>;
	}

	if (service === "sms/client" || service === "sms/vendor") {
		const operatorRevenue = data.operatorRevenue as Record<string, unknown> | undefined;
		const governmentPricing = service === "sms/client" ? data.governmentRevenue : data.governmentRate;
		const profit = data.profit as Record<string, unknown> | undefined;

		return (
			<>
				{operatorRevenue && !isEmpty(operatorRevenue)
					? <ContractFormSection title="درآمد اپراتورها" tone={tone} defaultExpanded><SmsOperatorRevenueDetails data={operatorRevenue} /></ContractFormSection>
					: null}
				<PricingSection title="سهم دولت" value={governmentPricing} tone={tone} />
				{service === "sms/client" && profit && !isEmpty(profit)
					? (
						<ContractFormSection title="تعیین کارمزد و سهم" tone={tone} defaultExpanded>
							{isPricingValue(profit.pricing)
								? (
									<PricingDetails
										value={profit.pricing}
										aside={isEmpty(profit.minProfit)
											? null
											: (
												<div className="flex min-h-10 w-full items-center justify-between gap-4 px-3 text-sm">
													<span className="text-[var(--ant-color-text-secondary)]">حداقل کارمزد:</span>
													<span className="font-medium">
														{formatValue(profit.minProfit)}
														{" "}
														ریال
													</span>
												</div>
											)}
									/>
								)
								: null}
						</ContractFormSection>
					)
					: null}
			</>
		);
	}

	const visibleData = Object.fromEntries(Object.entries(data).filter(([key]) => key !== "isSigned"));
	return isEmpty(visibleData)
		? null
		: <ContractFormSection title={SERVICE_TITLES[service]} tone={tone} defaultExpanded><ValueGrid data={visibleData} tone={tone} /></ContractFormSection>;
}

function AddendumServiceDetails({ data, service, tone }: { data: Record<string, unknown>, service: ContractServicePath, tone: ContractSectionTone }) {
	if (service === "commercial" || service === "shahkar")
		return <PricingSection title="نوع محاسبه" value={data.contractPricing} tone={tone} />;

	if (service === "openapi") {
		const legacyPricing = data.legacyPricing as Record<string, unknown> | undefined;
		return legacyPricing
			? (
				<>
					<PricingSection title="بهای ثبت وصولی" value={legacyPricing.paymentRegistration} tone="purple" />
					<PricingSection title="بهای استعلام قبض" value={legacyPricing.billInquiry} tone="purple" />
				</>
			)
			: null;
	}

	if (service === "traffic") {
		const excludedKeys = new Set([
			"tehranPricing",
			"tehranUnit",
			"tehranRevenuePercent",
			"provincePricing",
			"provinceUnit",
			"provinceRevenuePercent",
		]);
		const baseFields = Object.fromEntries(Object.entries(data).filter(([key]) => !excludedKeys.has(key)));
		return (
			<>
				{isEmpty(baseFields) ? null : <ValueGrid data={baseFields} tone="traffic" />}
				{isEmpty(data.tehranPricing)
					? null
					: <ContractFormSection title="قرارداد ترافیک تهران" tone="traffic" defaultExpanded><TrafficLocationDetails pricing={data.tehranPricing} unit={data.tehranUnit} revenuePercent={data.tehranRevenuePercent} /></ContractFormSection>}
				{isEmpty(data.provincePricing)
					? null
					: <ContractFormSection title="قرارداد ترافیک مراکز استان‌ها" tone="traffic" defaultExpanded><TrafficLocationDetails pricing={data.provincePricing} unit={data.provinceUnit} revenuePercent={data.provinceRevenuePercent} /></ContractFormSection>}
			</>
		);
	}

	if (service === "sms-commission") {
		const fields = Object.entries(data)
			.filter(([key, value]) => !HIDDEN_KEYS.has(key) && !isEmpty(value))
			.map(([key, value]) => [fieldLabel(key), formatFieldValue(key, value)] as [string, ReactNode]);
		return <FieldRows fields={fields} />;
	}

	if (service === "psp")
		return <ValueGrid data={data} tone={tone} />;

	return <ServiceDetails data={data} service={service} tone={tone} />;
}

const ADDENDUM_META_KEYS = new Set([
	"id",
	"displayAddendumNumber",
	"display_addendum_number",
	"parentAddendumId",
	"parent_addendum_id",
	"startYear",
	"startMonth",
	"endYear",
	"endMonth",
	"contractNumber",
	"description",
	"isSigned",
	"children",
]);

function addendumDate(year: unknown, month: unknown) {
	if (year == null || month == null)
		return "—";

	const numericYear = Number(year);
	const numericMonth = Number(month);
	const formattedYear = Number.isFinite(numericYear)
		? new Intl.NumberFormat("fa-IR", { useGrouping: false }).format(numericYear)
		: String(year);
	const formattedMonth = Number.isFinite(numericMonth)
		? new Intl.NumberFormat("fa-IR", { minimumIntegerDigits: 2, useGrouping: false }).format(numericMonth)
		: String(month);

	return `${formattedYear}/${formattedMonth}`;
}

function DateRange({ start, end }: { start: string, end: string }) {
	return (
		<span className="inline-flex items-center gap-1 whitespace-nowrap" dir="ltr">
			<bdi dir="ltr">{start}</bdi>
			<span dir="rtl">تا</span>
			<bdi dir="ltr">{end}</bdi>
		</span>
	);
}

function AddendumItem({ addendum, index, service, prefix, tone }: { addendum: Record<string, unknown>, index: number, service: ContractServicePath, prefix?: string, tone: ContractSectionTone }) {
	const explicitNumber = addendum.displayAddendumNumber ?? addendum.display_addendum_number;
	const displayNumber = String(explicitNumber ?? (prefix ? `${prefix}.${index + 1}` : index + 1));
	const startDate = addendumDate(addendum.startYear, addendum.startMonth);
	const endDate = addendumDate(addendum.endYear, addendum.endMonth);
	const remainingFields = Object.fromEntries(Object.entries(addendum).filter(([key]) => !ADDENDUM_META_KEYS.has(key)));
	const children = Array.isArray(addendum.children) ? addendum.children as Array<Record<string, unknown>> : [];

	return (
		<div>
			<div className="contract-addenda-item">
				<ContractDashedBorder />
				<Collapse
					className="contract-addenda-collapse"
					defaultActiveKey={index === 0 ? ["item"] : []}
					items={[{
						key: "item",
						label: (
							<div className="flex items-center gap-[10px] font-bold">
								<span className="contract-addenda-item-badge">{displayNumber}</span>
								<span className="inline-flex items-center gap-1 font-medium opacity-75" dir="ltr">
									<span>(</span>
									<DateRange start={startDate} end={endDate} />
									<span>)</span>
								</span>
							</div>
						),
						children: (
							<div className="contract-addenda-content">
								<FieldRows
									fields={[
										["مدت زمان الحاقیه", <DateRange key="addendum-period" start={startDate} end={endDate} />],
										["شماره قرارداد الحاقیه", addendum.contractNumber ? String(addendum.contractNumber) : "—"],
									]}
									showLastDivider
								/>
								{isEmpty(remainingFields) ? null : <div className="mt-4 flex flex-col gap-3"><AddendumServiceDetails data={remainingFields} service={service} tone={tone} /></div>}
								{addendum.description
									? (
										<div className="mt-4 border-t border-[var(--ant-color-split)] pt-4">
											<div className="mb-2 text-sm text-[var(--ant-color-text-secondary)]">توضیح الحاقیه:</div>
											<div className="text-sm leading-7">{String(addendum.description)}</div>
										</div>
									)
									: null}
							</div>
						),
					}]}
				/>
			</div>
			{children.length > 0
				? (
					<div className="contract-addenda-tree-branch relative mt-6 flex flex-col gap-6 pr-6">
						{children.map((child, childIndex) => <AddendumItem key={String(child.id ?? child.displayAddendumNumber ?? JSON.stringify(child))} addendum={child} index={childIndex} service={service} prefix={displayNumber} tone={tone} />)}
					</div>
				)
				: null}
		</div>
	);
}

function AddendaDetails({ addenda, service, tone }: { addenda: unknown[], service: ContractServicePath, tone: ContractSectionTone }) {
	return (
		<div className="flex flex-col gap-6">
			{addenda.map((item, index) => {
				const addendum = item as Record<string, unknown>;
				return <AddendumItem key={String(addendum.id ?? addendum.displayAddendumNumber ?? JSON.stringify(addendum))} addendum={addendum} index={index} service={service} tone={tone} />;
			})}
		</div>
	);
}

function resolveName(detail: Record<string, unknown>, directKeys: string[], objectKey: string) {
	for (const key of directKeys) {
		const direct = detail[key];
		if (typeof direct === "string" && direct.trim())
			return direct;
	}
	const object = detail[objectKey];
	if (object && typeof object === "object")
		return String((object as Record<string, unknown>).name ?? "");
	return "";
}

export function ContractReadOnlyDetails({ values, detail, service }: { values: ContractFormValues, detail: Record<string, unknown>, service: ContractServicePath }) {
	const tone = getTone(service);
	const services = useQuery(servicesQuery());
	const companies = useQuery(companiesByServiceQuery(values.serviceId));
	const contractStartDate = addendumDate(values.startYear, values.startMonth);
	const contractEndDate = addendumDate(values.endYear, values.endMonth);
	const { addenda, ...serviceFields } = values.serviceFields as Record<string, unknown>;
	const serviceFromList = services.data?.results.find(item => Number(item.id) === Number(values.serviceId))?.name;
	const companyFromList = companies.data?.results.find(item => Number(item.id) === Number(values.companyId))?.name;
	const serviceName = resolveName(detail, ["service_name", "serviceName"], "service") || serviceFromList || "—";
	const companyName = resolveName(detail, ["company_name", "companyName"], "company") || companyFromList || "—";

	return (
		<div className="flex w-full flex-col gap-6">
			<ContractFormSection title="اطلاعات پایه قرارداد" tone="primary" defaultExpanded>
				<FieldRows fields={[
					["نوع سرویس", serviceName],
					["شرکت", companyName],
					["مدت زمان قرارداد", <DateRange key="period" start={contractStartDate} end={contractEndDate} />],
					["شماره قرارداد", values.contractNumber || "—"],
				]}
				/>
			</ContractFormSection>

			{isEmpty(serviceFields) ? null : <ServiceDetails data={serviceFields} service={service} tone={tone} />}

			{values.description ? <ContractFormSection title="اطلاعات تکمیلی" tone="blue" defaultExpanded><div className="text-sm leading-7 text-[var(--ant-color-text)]">{values.description}</div></ContractFormSection> : null}

			{isEmpty(addenda)
				? null
				: (
					<ContractSectionToneContext.Provider value="addenda">
						<ContractFormSection title="الحاقیه‌های قرارداد" tone="addenda" defaultExpanded>
							<AddendaDetails addenda={addenda as unknown[]} service={service} tone={tone} />
						</ContractFormSection>
					</ContractSectionToneContext.Provider>
				)}
		</div>
	);
}
