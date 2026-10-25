import { contractTypeSchema } from "#src/features/contract/components/contract-type/contract-type.schema";
import { i18n } from "#src/locales";
import { z } from "zod";
import { emptyToNull } from "../../model/zod-helpers";

const SHARE_TOTAL = 100;

// پیام‌ها lazy هستند تا با تغییر زبان به‌روز بمانند
const percentField = z.preprocess(
	emptyToNull,
	z.coerce.number({ error: () => i18n.t("contract.openapi.separated.invalidNumber") }).nullable(),
);

const receiptSharesKeys = [
	{ karashab: "connectedKarashabSharePercent", partner: "connectedPartnerSharePercent", titleKey: "connected" },
	{ karashab: "disconnectedKarashabSharePercent", partner: "disconnectedPartnerSharePercent", titleKey: "disconnected" },
] as const;

function isPercent(value: number) {
	return value >= 0 && value <= SHARE_TOTAL;
}

export const separatedPricingSchema = z
	.object({
		walletChargeDiscountPercent: percentField,
		midPeriodBillInquiry: contractTypeSchema,
		endPeriodBillInquiry: contractTypeSchema,
		connectedReceiptRegister: contractTypeSchema,
		connectedKarashabSharePercent: percentField,
		connectedPartnerSharePercent: percentField,
		disconnectedReceiptRegister: contractTypeSchema,
		disconnectedKarashabSharePercent: percentField,
		disconnectedPartnerSharePercent: percentField,
	})
	.superRefine((val, ctx) => {
		if (val.walletChargeDiscountPercent == null) {
			ctx.addIssue({
				code: "custom",
				path: ["walletChargeDiscountPercent"],
				message: i18n.t("contract.openapi.separated.walletRequired"),
			});
		}
		else if (!isPercent(val.walletChargeDiscountPercent)) {
			ctx.addIssue({
				code: "custom",
				path: ["walletChargeDiscountPercent"],
				message: i18n.t("contract.openapi.separated.walletRange"),
			});
		}

		// سهم کاراشاب و طرف قرارداد هر بخش ثبت وصولی باید جداگانه دقیقاً ۱۰۰ شود (مثل old)
		receiptSharesKeys.forEach(({ karashab, partner, titleKey }) => {
			const title = i18n.t(`contract.openapi.separated.${titleKey}`);
			const karashabShare = val[karashab];
			const partnerShare = val[partner];
			if (karashabShare == null || partnerShare == null) {
				ctx.addIssue({
					code: "custom",
					path: [karashabShare == null ? karashab : partner],
					message: i18n.t("contract.openapi.separated.sharesRequired", { title }),
				});
				return;
			}
			if (!isPercent(karashabShare) || !isPercent(partnerShare)) {
				ctx.addIssue({
					code: "custom",
					path: [isPercent(karashabShare) ? partner : karashab],
					message: i18n.t("contract.openapi.separated.sharesRange", { title }),
				});
				return;
			}
			if (karashabShare + partnerShare !== SHARE_TOTAL) {
				ctx.addIssue({
					code: "custom",
					path: [partner],
					message: i18n.t("contract.openapi.separated.sharesTotal", { title }),
				});
			}
		});
	});
