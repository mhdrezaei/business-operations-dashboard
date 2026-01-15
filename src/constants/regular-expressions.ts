/**
 * مجموعه الگوهاي Regex
 * @see https://any-rule.vercel.app/
 *
 * بيشتر قوانين مورد نياز را مي توان از سايت بالا ساخت و سپس در کد کپي کرد.
 */

/* ================ Divider ================== */

// اعتبارسنجي نام کاربري، 4 تا 16 کاراکتر (حروف، اعداد، زيرخط، خط تيره)
export const USERNAME_REGEXP = /^[\w-]{4,16}$/;

// فقط شامل حروف بزرگ، کوچک و اعداد
export const ALPHA_NUMERIC_ONLY_REGEXP = /^[A-Z0-9]+$/i;

/**
 * @description کد اعتبار اجتماعي يکپارچه
 * @see https://creditbj.jxj.beijing.gov.cn/credit-portal/credit_service/legal/search
 *
 * @example 91110105MA0071F38D, 91110105MADDCJMC8C, 91110101MABUT67T06
 */
export const UNIFIED_SOCIAL_CREDIT_CODE_REGEXP = /^[0-9A-HJ-NPQRTUWXY]{2}\d{6}[0-9A-HJ-NPQRTUWXY]{10}$/;

/**
 * @description شماره موبايل، فقط با 1 شروع شود
 *
 * @example 008618311006933, +8617888829981, 19119255642
 */
export const MOBILE_PHONE_REGEXP = /^(?:(?:\+|00)86)?1\d{10}$/;

export const TELEPHONE_REGEXP = /^(?:(?:\d{3}-)?\d{8}|(?:\d{4}-)?\d{7,8})(?:-\d+)?$/;
