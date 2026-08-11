// src/features/contract-templates/create/components/editor/variables/registry.ts

export const GROUP_LABELS = {
	company_identity: "هویت شرکت",
	company_registration: "اطلاعات ثبتی و مالیاتی",
	company_contact: "آدرس و اطلاعات تماس",
	company_finance: "شرایط مالی و تسویه",
	company_management: "مدیرعامل و اشخاص کلیدی",
	company_board: "اعضای هیئت‌مدیره",
	company_bank: "حساب‌های بانکی شرکت",
	contract: "اطلاعات قرارداد",
	addendum: "اطلاعات الحاقیه",
	financial: "اطلاعات مالی",
	date: "تاریخ",
};

// 🔴 اضافه شدن یک کش برای ذخیره متغیرهای داینامیک که در آینده از API میان
export const dynamicVariableCache = new Map<string, any>();

// متغیرهای ثابت و پایه
const ALL_VARIABLES: any[] = [
	// هویت شرکت
	{ key: "company_name", label: "نام شرکت", group: "company_identity" },
	{ key: "name", label: "نام", group: "company_identity" }, // فیلد جدید بک‌اند
	{ key: "company_legal_name", label: "نام حقوقی شرکت", group: "company_identity" },
	{ key: "legal_name", label: "نام حقوقی", group: "company_identity" }, // فیلد جدید بک‌اند
	{ key: "company_brand_name", label: "نام برند شرکت", group: "company_identity" },
	{ key: "brand_name", label: "نام تجاری", group: "company_identity" }, // فیلد جدید بک‌اند
	{ key: "company_legal_person_type", label: "نوع شخصیت حقوقی", group: "company_identity" },
	{ key: "legal_person_type", label: "نوع شخصیت حقوقی", group: "company_identity" }, // فیلد جدید بک‌اند

	// اطلاعات ثبتی
	{ key: "company_national_id", label: "شناسه ملی شرکت", group: "company_registration" },
	{ key: "national_id", label: "شناسه ملی", group: "company_registration" }, // فیلد جدید بک‌اند
	{ key: "company_registration_number", label: "شماره ثبت شرکت", group: "company_registration" },
	{ key: "registration_number", label: "شماره ثبت", group: "company_registration" }, // فیلد جدید بک‌اند
	{ key: "company_registration_place", label: "محل ثبت شرکت", group: "company_registration" },
	{ key: "registration_place", label: "محل ثبت", group: "company_registration" }, // فیلد جدید بک‌اند
	{ key: "company_economic_code", label: "کد اقتصادی شرکت", group: "company_registration" },
	{ key: "tax_national_id", label: "شناسه مالیاتی", group: "company_registration" },
	{ key: "tax_registration_number", label: "شماره ثبت مالیاتی", group: "company_registration" },
	{ key: "branch_code", label: "کد شعبه", group: "company_registration" },
	{ key: "tax_file_number", label: "شماره پرونده مالیاتی", group: "company_registration" },
	{ key: "vat_status", label: "وضعیت ارزش‌افزوده", group: "company_registration" },
	{ key: "tax_office", label: "اداره مالیاتی", group: "company_registration" },
	{ key: "registration_date", label: "تاریخ ثبت", group: "company_registration" }, // فیلد جدید بک‌اند
	{ key: "official_gazette_number", label: "شماره روزنامه رسمی", group: "company_registration" }, // فیلد جدید بک‌اند
	{ key: "official_gazette_date", label: "تاریخ روزنامه رسمی", group: "company_registration" }, // فیلد جدید بک‌اند

	// آدرس و تماس (بخش ثابت)
	{ key: "company_legal_address", label: "نشانی قانونی شرکت", group: "company_contact" },
	{ key: "legal_address", label: "آدرس", group: "company_contact" }, // فیلد جدید بک‌اند
	{ key: "company_postal_code", label: "کد پستی شرکت", group: "company_contact" },
	{ key: "company_website", label: "وب‌سایت شرکت", group: "company_contact" },
	{ key: "working_hours", label: "ساعات کاری", group: "company_contact" },
	{ key: "fax", label: "فکس", group: "company_contact" }, // فیلد جدید بک‌اند

	// اطلاعات قرارداد و الحاقیه
	{ key: "contract_number", label: "شماره قرارداد / الحاقیه", group: "contract" },
	{ key: "service_name", label: "نام سرویس", group: "contract" },
	{ key: "code", label: "کد سرویس", group: "contract" }, // فیلد جدید بک‌اند
	{ key: "contract_start_date", label: "تاریخ شروع قرارداد (ماه و سال)", group: "contract" },
	{ key: "contract_end_date", label: "تاریخ پایان قرارداد (ماه و سال)", group: "contract" },
	{ key: "contract_start_jym", label: "تاریخ شروع قرارداد (عددی)", group: "contract" },
	{ key: "contract_end_jym", label: "تاریخ پایان قرارداد (عددی)", group: "contract" },
	{ key: "contract_duration_months", label: "مدت قرارداد (ماه)", group: "contract" },
	{ key: "start_jy", label: "سال شروع", group: "contract" }, // فیلد جدید بک‌اند
	{ key: "start_jm", label: "ماه شروع", group: "contract" }, // فیلد جدید بک‌اند
	{ key: "end_jy", label: "سال پایان", group: "contract" }, // فیلد جدید بک‌اند
	{ key: "end_jm", label: "ماه پایان", group: "contract" }, // فیلد جدید بک‌اند
	{ key: "note", label: "یادداشت", group: "contract" }, // فیلد جدید بک‌اند

	// اطلاعات مالی
	{ key: "financial_commitment_cap", label: "سقف تعهد مالی", group: "company_finance" }, // فیلد جدید بک‌اند
	{ key: "settlement_term", label: "شرایط تسویه", group: "company_finance" }, // فیلد جدید بک‌اند
	{ key: "openapi_bill_inquiry_calculation_type", label: "استعلام قبض - مدل محاسبه", group: "financial" }, // فیلد جدید بک‌اند
	{ key: "openapi_bill_inquiry_tiers", label: "استعلام قبض - مقدار مالی", group: "financial" }, // فیلد جدید بک‌اند
	{ key: "openapi_receipt_register_calculation_type", label: "ثبت وصولی - مدل محاسبه", group: "financial" }, // فیلد جدید بک‌اند
	{ key: "openapi_receipt_register_tiers", label: "ثبت وصولی - مقدار مالی", group: "financial" }, // فیلد جدید بک‌اند

	// تاریخ
	{ key: "today_jalali", label: "تاریخ امروز (شمسی)", group: "date" },
];

// --------------------------------------------------------
// تولید خودکار متغیرهای اسلات‌دار (تلفن، اشخاص کلیدی، حساب‌ها و ...)
// --------------------------------------------------------
const SLOT_COUNT = 10;

// ۱. تماس‌ها
const CONTACT_SLOT_GROUPS = [
	{ keyPrefix: "company_phone", labelPrefix: "تلفن شرکت" },
	{ keyPrefix: "company_mobile", labelPrefix: "موبایل شرکت" },
	{ keyPrefix: "company_fax", labelPrefix: "فکس شرکت" },
	{ keyPrefix: "company_email", labelPrefix: "ایمیل شرکت" },
];
for (const { keyPrefix, labelPrefix } of CONTACT_SLOT_GROUPS) {
	for (let n = 1; n <= SLOT_COUNT; n += 1) {
		ALL_VARIABLES.push({
			key: `${keyPrefix}_${n}_value`,
			label: `${labelPrefix} ${n}`,
			group: "company_contact",
		});
	}
}

// ۲. اشخاص (هیئت مدیره، مدیرعامل، نمایندگان و واحدهای مختلف)
const PERSON_SLOT_GROUPS = [
	{ prefix: "company_board_member", label: "عضو هیئت‌مدیره", group: "company_board" },
	{ prefix: "company_ceo", label: "مدیرعامل", group: "company_management" },
	{ prefix: "company_signatory", label: "امضادار", group: "company_management" },
	{ prefix: "company_representative", label: "نماینده", group: "company_management" },
	{ prefix: "company_finance_person", label: "واحد مالی/حسابداری", group: "company_management" },
	{ prefix: "company_contracts_person", label: "امور قراردادها", group: "company_management" },
	{ prefix: "company_commercial_person", label: "واحد تجاری", group: "company_management" },
	{ prefix: "company_other_person", label: "سایر اشخاص کلیدی", group: "company_management" },
];

const PERSON_FIELDS = [
	{ field: "full_name", label: "نام" },
	{ field: "national_id", label: "کد ملی" },
	{ field: "title", label: "سمت" },
	{ field: "role", label: "نقش" },
	{ field: "is_signatory", label: "حق امضا" },
	{ field: "official_gazette_number", label: "شماره روزنامه رسمی" },
	{ field: "official_gazette_date", label: "تاریخ روزنامه رسمی" },
];

for (const person of PERSON_SLOT_GROUPS) {
	for (let n = 1; n <= SLOT_COUNT; n += 1) {
		for (const { field, label } of PERSON_FIELDS) {
			ALL_VARIABLES.push({
				key: `${person.prefix}_${n}_${field}`,
				label: `${person.label} ${n} - ${label}`,
				group: person.group,
			});
		}
	}
}

// ۳. حساب‌های بانکی
const bankAccountFields = [
	{ field: "bank_name", label: "نام بانک" },
	{ field: "account_number", label: "شماره حساب" },
	{ field: "iban", label: "شماره شبا" },
	{ field: "card_number", label: "شماره کارت" },
	{ field: "account_holder_name", label: "نام صاحب حساب" },
];
for (let n = 1; n <= SLOT_COUNT; n += 1) {
	for (const { field, label } of bankAccountFields) {
		ALL_VARIABLES.push({
			key: `company_bank_account_${n}_${field}`,
			label: `حساب بانکی ${n} - ${label}`,
			group: "company_bank",
		});
	}
}

export function getVariable(key: string) {
	return dynamicVariableCache.get(key) || ALL_VARIABLES.find(v => v.key === key) || null;
}

export function getVariables(_params?: { kind?: string, documentKind?: string }) {
	return ALL_VARIABLES;
}
