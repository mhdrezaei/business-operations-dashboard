import type { Resolver } from "react-hook-form";
import type { LegalProfileFormValues } from "../../model/legal/company-legal.mappers";

import {
	RHFProDate,
	RHFProText,
	RHFSelect,
} from "#src/shared/ui/rhf-pro";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Card, Form } from "antd";
import React, { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";

import { LEGAL_PERSON_TYPE_OPTIONS } from "../../../company-info/model/company-info.constants";
import { legalProfileSchema } from "../../model/legal/company-legal.schema";

interface Props {
	disabled: boolean
	defaultValues: LegalProfileFormValues
	onSubmit: (values: LegalProfileFormValues) => void | Promise<void>
}

export default function LegalProfileForm({ disabled, defaultValues, onSubmit }: Props) {
	const methods = useForm<LegalProfileFormValues>({
		defaultValues,
		resolver: zodResolver(legalProfileSchema as any) as unknown as Resolver<LegalProfileFormValues>,
		mode: "onChange",
	});

	const {
		handleSubmit,
		reset,
		formState: { isDirty, isValid, isSubmitting },
	} = methods;

	useEffect(() => {
		reset(defaultValues);
	}, [defaultValues, reset]);

	const isChanged = isDirty;
	return (
		<Form layout="vertical" className="space-y-4">
			<FormProvider {...methods}>
				<Card variant="outlined" title={"\u0627\u0637\u0644\u0627\u0639\u0627\u062A \u062B\u0628\u062A\u06CC \u0648 \u062D\u0642\u0648\u0642\u06CC"} className="bg-bgMask">
					<div className="grid grid-cols-2 gap-x-4">
						<RHFProText name="national_id" label={"\u0634\u0646\u0627\u0633\u0647 \u0645\u0644\u06CC"} inputProps={{ placeholder: "\u0634\u0646\u0627\u0633\u0647 \u0645\u0644\u06CC", disabled }} />
						<RHFProText name="tax_national_id" label={"\u0634\u0646\u0627\u0633\u0647 \u0645\u0627\u0644\u06CC\u0627\u062A\u06CC"} inputProps={{ placeholder: "\u0634\u0646\u0627\u0633\u0647 \u0645\u0627\u0644\u06CC\u0627\u062A\u06CC", disabled }} />

						<RHFSelect
							name="legal_person_type"
							label={"\u0646\u0648\u0639 \u0634\u062E\u0635\u06CC\u062A \u062D\u0642\u0648\u0642\u06CC"}
							selectProps={{ placeholder: "\u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0646\u06CC\u062F", allowClear: true, disabled }}
							options={LEGAL_PERSON_TYPE_OPTIONS}
						/>

						<RHFProText name="registration_number" label={"\u0634\u0645\u0627\u0631\u0647 \u062B\u0628\u062A"} inputProps={{ placeholder: "\u0634\u0645\u0627\u0631\u0647 \u062B\u0628\u062A", disabled }} />
						<RHFProText name="tax_registration_number" label={"\u0634\u0645\u0627\u0631\u0647 \u062B\u0628\u062A \u0645\u0627\u0644\u06CC\u0627\u062A\u06CC"} inputProps={{ placeholder: "\u0634\u0645\u0627\u0631\u0647 \u062B\u0628\u062A \u0645\u0627\u0644\u06CC\u0627\u062A\u06CC", disabled }} />

						<RHFProText name="registration_place" label={"\u0645\u062D\u0644 \u062B\u0628\u062A"} inputProps={{ placeholder: "\u0645\u062D\u0644 \u062B\u0628\u062A", disabled }} />
						<RHFProDate name="registration_date" label={"\u062A\u0627\u0631\u06CC\u062E \u062B\u0628\u062A"} itemProps={{ placeholder: "\u062A\u0627\u0631\u06CC\u062E \u062B\u0628\u062A", disabled }} />

						<RHFProText name="branch_code" label={"\u06A9\u062F \u0634\u0639\u0628\u0647"} inputProps={{ placeholder: "\u06A9\u062F \u0634\u0639\u0628\u0647", disabled }} />
					</div>
				</Card>

				<Button
					type="primary"
					loading={isSubmitting}
					disabled={disabled || !isChanged || !isValid}
					onClick={handleSubmit(values => onSubmit(values))}
				>
					{"\u0630\u062E\u06CC\u0631\u0647 \u062A\u063A\u06CC\u06CC\u0631\u0627\u062A"}
				</Button>
			</FormProvider>
		</Form>
	);
}
