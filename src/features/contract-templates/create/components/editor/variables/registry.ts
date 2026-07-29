// src/features/contract-templates/create/components/editor/variables/registry.ts
export const GROUP_LABELS = {
	company_identity: "هویت شرکت",
	company_registration: "اطلاعات ثبتی و مالیاتی",
	company_contact: "آدرس و اطلاعات تماس",
	company_finance: "شرایط مالی و تسویه",
	company_management: "مدیرعامل و نمایندگان",
	company_board: "اعضای هیئت‌مدیره",
	company_bank: "حساب‌های بانکی شرکت",
	contract: "اطلاعات قرارداد",
	addendum: "اطلاعات الحاقیه",
	financial: "اطلاعات مالی",
	date: "تاریخ",
};

// متغیرهای ثابت و پایه
const ALL_VARIABLES: any[] = [
	// هویت شرکت
	{ key: "company_name", label: "نام شرکت", group: "company_identity" },
	{ key: "company_legal_name", label: "نام حقوقی شرکت", group: "company_identity" },
	{ key: "company_brand_name", label: "نام برند شرکت", group: "company_identity" },
	{ key: "company_legal_person_type", label: "نوع شخصیت حقوقی", group: "company_identity" },

	// اطلاعات ثبتی
	{ key: "company_national_id", label: "شناسه ملی شرکت", group: "company_registration" },
	{ key: "company_registration_number", label: "شماره ثبت شرکت", group: "company_registration" },
	{ key: "company_registration_place", label: "محل ثبت شرکت", group: "company_registration" },
	{ key: "company_economic_code", label: "کد اقتصادی شرکت", group: "company_registration" },
	{ key: "tax_national_id", label: "شناسه مالیاتی", group: "company_registration" },
	{ key: "tax_registration_number", label: "شماره ثبت مالیاتی", group: "company_registration" },
	{ key: "branch_code", label: "کد شعبه", group: "company_registration" },
	{ key: "tax_file_number", label: "شماره پرونده مالیاتی", group: "company_registration" },
	{ key: "vat_status", label: "وضعیت ارزش‌افزوده", group: "company_registration" },
	{ key: "tax_office", label: "اداره مالیاتی", group: "company_registration" },

	// آدرس و تماس (بخش ثابت)
	{ key: "company_legal_address", label: "نشانی قانونی شرکت", group: "company_contact" },
	{ key: "company_postal_code", label: "کد پستی شرکت", group: "company_contact" },
	{ key: "company_website", label: "وب‌سایت شرکت", group: "company_contact" },
	{ key: "working_hours", label: "ساعات کاری", group: "company_contact" },

	// اطلاعات قرارداد
	{ key: "contract_number", label: "شماره قرارداد", group: "contract" },
	{ key: "service_name", label: "نام سرویس", group: "contract" },
	{ key: "contract_start_date", label: "تاریخ شروع قرارداد (ماه و سال)", group: "contract" },
	{ key: "contract_end_date", label: "تاریخ پایان قرارداد (ماه و سال)", group: "contract" },
	{ key: "contract_start_jym", label: "تاریخ شروع قرارداد (عددی)", group: "contract" },
	{ key: "contract_end_jym", label: "تاریخ پایان قرارداد (عددی)", group: "contract" },
	{ key: "contract_duration_months", label: "مدت قرارداد (ماه)", group: "contract" },

	// تاریخ
	{ key: "today_jalali", label: "تاریخ امروز (شمسی)", group: "date" },
];

// --------------------------------------------------------
// تولید خودکار متغیرهای اسلات‌دار (تلفن، فکس، هیئت مدیره و ...)
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

// ۲. اعضای هیئت مدیره
const boardMemberFields = [
	{ field: "full_name", label: "نام" },
	{ field: "national_id", label: "کد ملی" },
	{ field: "title", label: "عنوان" },
	{ field: "is_signatory", label: "صاحب امضا" },
];
for (let n = 1; n <= SLOT_COUNT; n += 1) {
	for (const { field, label } of boardMemberFields) {
		ALL_VARIABLES.push({
			key: `company_board_member_${n}_${field}`,
			label: `عضو هیئت‌مدیره ${n} - ${label}`,
			group: "company_board",
		});
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

// --------------------------------------------------------
// توابع خروجی
// --------------------------------------------------------

export function getVariable(key: string) {
	return ALL_VARIABLES.find(v => v.key === key) || null;
}

export function getVariables(params?: { kind?: string, documentKind?: string }) {
	console.warn(params);
	return ALL_VARIABLES;
}
