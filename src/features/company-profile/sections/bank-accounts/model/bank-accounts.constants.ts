export const BANK_ACCOUNT_ORDERING_OPTIONS: Array<{ label: string, value: string }> = [
	{ label: "بانک (صعودی)", value: "bank_name" },
	{ label: "بانک (نزولی)", value: "-bank_name" },
	{ label: "شناسه (صعودی)", value: "id" },
	{ label: "شناسه (نزولی)", value: "-id" },
	{ label: "آخرین بروزرسانی (صعودی)", value: "updated_at" },
	{ label: "آخرین بروزرسانی (نزولی)", value: "-updated_at" },
];
