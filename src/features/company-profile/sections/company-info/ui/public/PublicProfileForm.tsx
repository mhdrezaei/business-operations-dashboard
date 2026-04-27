import type { Resolver } from "react-hook-form";
import type { PublicProfileFormValues } from "../../model/public/company-public.mappers";

import {
	RHFProText,
	RHFProTextArea,
} from "#src/shared/ui/rhf-pro";
import RHFFieldArrayText from "#src/shared/ui/rhf-pro/fields/RHFFieldArrayText.js";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Card, Form } from "antd";
import React, { useEffect } from "react";

import { FormProvider, useForm } from "react-hook-form";
import CompanyInfoMapField from "../../../company-info/ui/CompanyInfoMapField";
import CompanyInfoSocialLinksField from "../../../company-info/ui/CompanyInfoSocialLinksField";

import { publicProfileSchema } from "../../model/public/company-public.schema";

interface Props {
	disabled: boolean
	defaultValues: PublicProfileFormValues
	onSubmit: (values: PublicProfileFormValues) => void | Promise<void>
}

export default function PublicProfileForm({ disabled, defaultValues, onSubmit }: Props) {
	const methods = useForm<PublicProfileFormValues>({
		defaultValues,
		resolver: zodResolver(publicProfileSchema as any) as unknown as Resolver<PublicProfileFormValues>,
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
				<Card bordered title={"\u0627\u0637\u0644\u0627\u0639\u0627\u062A \u0639\u0645\u0648\u0645\u06CC \u0634\u0631\u06A9\u062A"} className="bg-bgMask">
					<div className="grid grid-cols-2 gap-x-4">
						<RHFProText
							name="legal_name"
							label={"\u0646\u0627\u0645 \u062D\u0642\u0648\u0642\u06CC"}
							inputProps={{ placeholder: "\u0646\u0627\u0645 \u062D\u0642\u0648\u0642\u06CC", disabled }}
						/>
						<RHFProText
							name="brand_name"
							label={"\u0646\u0627\u0645 \u0628\u0631\u0646\u062F"}
							inputProps={{ placeholder: "\u0646\u0627\u0645 \u0628\u0631\u0646\u062F", disabled }}
						/>
					</div>
				</Card>

				<Card bordered title={"\u0622\u062F\u0631\u0633 \u0648 \u0646\u0642\u0634\u0647"} className="bg-bgMask">
					<div className="grid grid-cols-2 gap-x-4">
						<RHFProText
							name="postal_code"
							label={"\u06A9\u062F \u067E\u0633\u062A\u06CC"}
							inputProps={{ placeholder: "\u06A9\u062F \u067E\u0633\u062A\u06CC", disabled }}
						/>
						<RHFProText
							name="map_address"
							label={"\u0622\u062F\u0631\u0633 \u0631\u0648\u06CC \u0646\u0642\u0634\u0647"}
							inputProps={{ placeholder: "\u0622\u062F\u0631\u0633 \u0631\u0648\u06CC \u0646\u0642\u0634\u0647", disabled }}
						/>

						<div className="col-span-2">
							<RHFProTextArea
								name="legal_address"
								label={"\u0622\u062F\u0631\u0633 \u062D\u0642\u0648\u0642\u06CC"}
								textAreaProps={{ disabled }}
							/>
						</div>

						<div className="col-span-2">
							<CompanyInfoMapField disabled={disabled} />
						</div>
					</div>
				</Card>

				<Card bordered title={"\u0631\u0627\u0647\u200C\u0647\u0627\u06CC \u0627\u0631\u062A\u0628\u0627\u0637\u06CC"} className="bg-bgMask">
					<div className="grid grid-cols-2 gap-x-4">
						<RHFFieldArrayText name="phone" label={"\u062A\u0644\u0641\u0646"} disabled={disabled} />
						<RHFFieldArrayText name="mobile" label={"\u0645\u0648\u0628\u0627\u06CC\u0644"} disabled={disabled} />
						<RHFFieldArrayText name="email" label={"\u0627\u06CC\u0645\u06CC\u0644"} disabled={disabled} />
						<RHFFieldArrayText name="fax" label={"\u0641\u06A9\u0633"} disabled={disabled} />

						<RHFProText
							name="website"
							label={"\u0648\u0628\u0633\u0627\u06CC\u062A"}
							inputProps={{ placeholder: "\u0648\u0628\u0633\u0627\u06CC\u062A", disabled }}
						/>
						<RHFProText
							name="working_hours"
							label={"\u0633\u0627\u0639\u0627\u062A \u06A9\u0627\u0631\u06CC"}
							inputProps={{ placeholder: "\u0633\u0627\u0639\u0627\u062A \u06A9\u0627\u0631\u06CC", disabled }}
						/>
					</div>
				</Card>

				<Card bordered title={"\u0634\u0628\u06A9\u0647\u200C\u0647\u0627\u06CC \u0627\u062C\u062A\u0645\u0627\u0639\u06CC"} className="bg-bgMask">
					<div className="mt-6">
						<CompanyInfoSocialLinksField disabled={disabled} />
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
