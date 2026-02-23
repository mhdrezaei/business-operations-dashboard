export type Step = "mobile" | "otp";

export const FORM_INITIAL_VALUES = {
	mobile: "",
	otp: "",
};

export type CodeLoginFormValues = typeof FORM_INITIAL_VALUES;
