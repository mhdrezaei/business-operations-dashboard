import type { PredictionFormValues } from "../../../model/prediction.form.types";
import { RHFProNumber } from "#src/shared/ui/rhf-pro";
import { ProCard } from "@ant-design/pro-components";
import { Typography } from "antd";
import { useEffect } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

const INPUT_QUARTER_FIELD_NAMES = [
	"serviceFields.q1Percent",
	"serviceFields.q2Percent",
	"serviceFields.q3Percent",
] as const;

const QUARTER_FIELD_NAMES = [
	"serviceFields.q1Percent",
	"serviceFields.q2Percent",
	"serviceFields.q3Percent",
	"serviceFields.q4Percent",
] as const;

const sf = (path: string) => `serviceFields.${path}` as const;

export function QuarterDistributionSection() {
	const { t } = useTranslation();
	const { control, formState, getFieldState, setValue, trigger } = useFormContext<PredictionFormValues>();

	const [q1Percent, q2Percent, q3Percent, q4Percent] = useWatch({
		control,
		name: QUARTER_FIELD_NAMES as unknown as any,
	}) as Array<number | null | undefined>;

	const quarterError = getFieldState(sf("q1Percent") as any, formState).error?.message;
	const allInputQuarterFieldsTouched = INPUT_QUARTER_FIELD_NAMES.every(
		name => getFieldState(name as any, formState).isTouched,
	);
	const shouldShowQuarterError = !!quarterError && (formState.isSubmitted || allInputQuarterFieldsTouched);

	useEffect(() => {
		const firstThree = [q1Percent, q2Percent, q3Percent];
		if (firstThree.some(value => value == null)) {
			if (q4Percent != null) {
				setValue(sf("q4Percent") as any, null, {
					shouldDirty: false,
					shouldTouch: false,
					shouldValidate: false,
				});
			}
			return;
		}

		const completedFirstThree = firstThree.map(value => Number(value ?? 0));
		const nextQ4Percent = Math.max(
			0,
			100 - completedFirstThree.reduce((total, value) => total + value, 0),
		);
		if (q4Percent === nextQ4Percent) {
			return;
		}

		setValue(sf("q4Percent") as any, nextQ4Percent, {
			shouldDirty: true,
			shouldTouch: false,
			shouldValidate: formState.isSubmitted || allInputQuarterFieldsTouched,
		});
	}, [
		allInputQuarterFieldsTouched,
		formState.isSubmitted,
		q1Percent,
		q2Percent,
		q3Percent,
		q4Percent,
		setValue,
	]);

	useEffect(() => {
		if (!formState.isSubmitted && !allInputQuarterFieldsTouched) {
			return;
		}

		void trigger(QUARTER_FIELD_NAMES as unknown as any);
	}, [allInputQuarterFieldsTouched, formState.isSubmitted, q1Percent, q2Percent, q3Percent, q4Percent, trigger]);

	return (
		<ProCard
			bordered
			headerBordered
			className="rounded-2xl"
			title={t("prediction.sections.quarters")}
		>
			<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
				<RHFProNumber<PredictionFormValues, any>
					name={sf("q1Percent") as any}
					label={t("prediction.quarters.q1")}
					hideError
					inputProps={{ placeholder: t("prediction.placeholders.percentExample"), addonAfter: "%", maxLength: 3 }}
				/>
				<RHFProNumber<PredictionFormValues, any>
					name={sf("q2Percent") as any}
					label={t("prediction.quarters.q2")}
					hideError
					inputProps={{ placeholder: t("prediction.placeholders.percentExample"), addonAfter: "%", maxLength: 3 }}
				/>
				<RHFProNumber<PredictionFormValues, any>
					name={sf("q3Percent") as any}
					label={t("prediction.quarters.q3")}
					hideError
					inputProps={{ placeholder: t("prediction.placeholders.percentExample"), addonAfter: "%", maxLength: 3 }}
				/>
				<RHFProNumber<PredictionFormValues, any>
					name={sf("q4Percent") as any}
					label={t("prediction.quarters.q4")}
					hideError
					inputProps={{
						placeholder: t("prediction.placeholders.percentExample"),
						addonAfter: "%",
						disabled: true,
					}}
				/>
			</div>

			{shouldShowQuarterError
				? (
					<Typography.Text
						type="danger"
						className="block mt-2"
					>
						{quarterError}
					</Typography.Text>
				)
				: null}
		</ProCard>
	);
}
