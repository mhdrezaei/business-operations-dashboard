import type { Resolver } from "react-hook-form";
import type { InternalProfileFormValues } from "../../model/internal/company-internal.mappers";

import {
	RHFProText,
	RHFProTextArea,
	RHFSelect,
} from "#src/shared/ui/rhf-pro";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Card, Form } from "antd";
import React, { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";

import { INFO_VERIFICATION_STATUS_OPTIONS } from "../../../company-info/model/company-info.constants";
import { internalProfileSchema } from "../../model/internal/company-internal.schema";

interface Props {
	disabled: boolean
	defaultValues: InternalProfileFormValues
	onSubmit: (values: InternalProfileFormValues) => void | Promise<void>
}

export default function InternalProfileForm({ disabled, defaultValues, onSubmit }: Props) {
	const methods = useForm<InternalProfileFormValues>({
		defaultValues,
		resolver: zodResolver(internalProfileSchema as any) as unknown as Resolver<InternalProfileFormValues>,
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
				<Card variant="outlined" title={"\u0627\u0637\u0644\u0627\u0639\u0627\u062A \u062F\u0627\u062E\u0644\u06CC"} className="bg-bgMask">
					<div className="grid grid-cols-2 gap-x-4">
						<RHFProText name="internal_code" label={"\u06A9\u062F \u062F\u0627\u062E\u0644\u06CC"} inputProps={{ placeholder: "\u06A9\u062F \u062F\u0627\u062E\u0644\u06CC", disabled }} />

						<RHFSelect
							name="info_verification_status"
							label={"\u0648\u0636\u0639\u06CC\u062A \u062A\u0627\u06CC\u06CC\u062F \u0627\u0637\u0644\u0627\u0639\u0627\u062A"}
							selectProps={{ placeholder: "\u062F\u0631 \u0627\u0646\u062A\u0638\u0627\u0631", allowClear: true, disabled }}
							options={INFO_VERIFICATION_STATUS_OPTIONS}
						/>

						<div className="col-span-2">
							<RHFProTextArea name="internal_note" label={"\u06CC\u0627\u062F\u062F\u0627\u0634\u062A \u062F\u0627\u062E\u0644\u06CC"} textAreaProps={{ rows: 4, disabled }} />
						</div>
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
