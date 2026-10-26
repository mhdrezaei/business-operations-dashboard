import { addendumSchema } from "#src/features/contract/components/addenda/addenda.schema";
import { i18n } from "#src/locales";
import { z } from "zod";
import { toNumberOrNull } from "../../utils/value-coercion";
import { TELECOM_FRAME_CONTRACT_TYPES, TELECOM_FRAME_STATUSES } from "./telecom-frame.types";

const nullableNumberSchema = z.preprocess(
	value => (value === "" || value == null ? null : value),
	z.number().nullable(),
);

const contractTypeRowSchema = z.object({
	contractType: z.enum(TELECOM_FRAME_CONTRACT_TYPES),
	revenue: nullableNumberSchema,
	manHours: nullableNumberSchema,
});

const penaltySchema = z.object({
	initialGraceDays: nullableNumberSchema,
	toleranceDays: nullableNumberSchema,
	penaltyPercent: nullableNumberSchema,
});

const statusRowSchema = z.object({
	id: z.number().int().positive().optional(),
	status: z.enum(TELECOM_FRAME_STATUSES),
	startDate: z.string().default(""),
	endDateExclusive: z.string().default(""),
	note: z.string().default(""),
});

type Path = Array<string | number>;

function addIssue(ctx: z.RefinementCtx, path: Path, key: string) {
	ctx.addIssue({ code: "custom", path, message: i18n.t(`contract.telecomFrame.errors.${key}`) });
}

/** حداقل یک نوع، درآمد مثبت و نفر ساعت غیرمنفی؛ هم برای قرارداد اصلی و هم هر الحاقیه. */
export function validateTelecomFrameContractTypes(rows: unknown, ctx: z.RefinementCtx, path: Path, requiredKey: string) {
	const list = Array.isArray(rows) ? rows as Array<Record<string, unknown>> : [];
	if (list.length === 0) {
		addIssue(ctx, path, requiredKey);
		return;
	}
	list.forEach((row, index) => {
		const revenue = toNumberOrNull(row?.revenue);
		if (revenue == null || revenue <= 0)
			addIssue(ctx, [...path, index, "revenue"], "revenuePositive");
		const manHours = toNumberOrNull(row?.manHours);
		if (manHours == null || manHours < 0)
			addIssue(ctx, [...path, index, "manHours"], "manHoursNonNegative");
	});
}

function validateAddenda(addenda: unknown, ctx: z.RefinementCtx, path: Path) {
	(Array.isArray(addenda) ? addenda : []).forEach((addendum, index) => {
		const row = (addendum ?? {}) as Record<string, unknown>;
		const rowPath = [...path, index];
		validateTelecomFrameContractTypes(row.contractTypes, ctx, [...rowPath, "contractTypes"], "addendumContractTypesRequired");
		validateAddenda(row.children, ctx, [...rowPath, "children"]);
	});
}

export const telecomFrameServiceFieldsSchema = z
	.object({
		contractTypes: z.array(contractTypeRowSchema).default([]),
		boPersonIds: z.array(z.number().int().positive()).default([]),
		poPersonIds: z.array(z.number().int().positive()).default([]),
		hasPenalty: z.boolean().default(false),
		penalty: penaltySchema.nullable().optional(),
		statusTimeline: z.array(statusRowSchema).default([]),
		addenda: z.array(addendumSchema).default([]).optional(),
	})
	.superRefine((val, ctx) => {
		validateTelecomFrameContractTypes(val.contractTypes, ctx, ["contractTypes"], "contractTypesRequired");

		if (val.hasPenalty) {
			(["initialGraceDays", "toleranceDays", "penaltyPercent"] as const).forEach((field) => {
				const value = toNumberOrNull(val.penalty?.[field]);
				if (value == null || value < 0)
					addIssue(ctx, ["penalty", field], "penaltyFieldInvalid");
			});
		}

		val.statusTimeline.forEach((row, index) => {
			if (row.startDate && row.endDateExclusive && row.startDate >= row.endDateExclusive)
				addIssue(ctx, ["statusTimeline", index, "endDateExclusive"], "endAfterStart");
		});

		validateAddenda(val.addenda, ctx, ["addenda"]);
	})
	.passthrough();
