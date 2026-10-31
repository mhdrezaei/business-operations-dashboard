export const SMS_TEMPLATE_VARIANT = "sms_client";

export const OPENAPI_VARIANT_OPTIONS = [
	{ value: "openapi_legacy", label: "قدیمی" },
	{ value: "openapi_legacy_2", label: "تفکیکی" },
];

/** Services whose template must carry an explicit variant; every other service sends none. */
export const VARIANT_REQUIRED_SERVICES = ["sms", "openapi"];
