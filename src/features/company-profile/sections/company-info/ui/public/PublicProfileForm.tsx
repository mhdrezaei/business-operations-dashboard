import type { Resolver } from "react-hook-form";
import type { PublicProfileFormValues } from "../../model/public/company-public.mappers";

import {
	RHFProText,
	RHFProTextArea,
} from "#src/shared/ui/rhf-pro";
import { SectionCard } from "#src/shared/ui/section-card";

import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "antd";
import React, { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";

import CompanyInfoMapField from "../../../company-info/ui/CompanyInfoMapField";
import CompanyInfoSocialLinksField from "../../../company-info/ui/CompanyInfoSocialLinksField";
import { publicProfileSchema } from "../../model/public/company-public.schema";
import { ProfileFormActions } from "../ProfileFormActions";
import SortableContactField, { ContactMethodCard } from "./CompanyContactFields";

import AtSignIcon from "./icons/at-sign.svg?react";
import ClockCheckIcon from "./icons/clock-check.svg?react";
import LinkIcon from "./icons/link.svg?react";
import PhoneIcon from "./icons/phone-01.svg?react";
import PrinterIcon from "./icons/printer.svg?react";
import TelephoneIcon from "./icons/telephone.svg?react";
import TvIcon from "./icons/tv-03.svg?react";

interface Props {
	disabled: boolean
	submitDisabled: boolean
	hasProfile: boolean
	deleteDisabled: boolean
	defaultValues: PublicProfileFormValues
	onSubmit: (values: PublicProfileFormValues) => void | Promise<void>
	onDelete: () => void | Promise<void>
}

export default function PublicProfileForm({ disabled, submitDisabled, hasProfile, deleteDisabled, defaultValues, onSubmit, onDelete }: Props) {
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
				<SectionCard title={"\u0627\u0637\u0644\u0627\u0639\u0627\u062A \u0639\u0645\u0648\u0645\u06CC \u0634\u0631\u06A9\u062A"} tone="primary" className="company-profile-section company-profile-section--general">
					<div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
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
				</SectionCard>

				<SectionCard title={"\u0622\u062F\u0631\u0633 \u0648 \u0646\u0642\u0634\u0647"} tone="purple" className="company-profile-section company-profile-section--address">
					<div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
						<div className="md:col-span-2">
							<RHFProTextArea
								name="legal_address"
								label={"\u0622\u062F\u0631\u0633 \u062D\u0642\u0648\u0642\u06CC"}
								textAreaProps={{ disabled }}
							/>
						</div>

						<div className="md:col-span-2">
							<CompanyInfoMapField disabled={disabled} />
						</div>
					</div>
				</SectionCard>

				<SectionCard title={"\u0631\u0627\u0647\u200C\u0647\u0627\u06CC \u0627\u0631\u062A\u0628\u0627\u0637\u06CC"} tone="geekblue" className="company-profile-section company-profile-section--contact">
					<div className="company-contact-fields">
						<SortableContactField name="phone" label={"\u062A\u0644\u0641\u0646"} icon={<TelephoneIcon />} disabled={disabled} />
						<SortableContactField name="mobile" label={"\u0645\u0648\u0628\u0627\u06CC\u0644"} icon={<PhoneIcon />} disabled={disabled} />
						<SortableContactField name="email" label={"\u0627\u06CC\u0645\u06CC\u0644"} icon={<AtSignIcon />} disabled={disabled} />
						<SortableContactField name="fax" label={"\u0641\u06A9\u0633"} icon={<PrinterIcon />} disabled={disabled} />

						<ContactMethodCard title={"\u0648\u0628\u0633\u0627\u06CC\u062A"} icon={<LinkIcon />}>
							<RHFProText
								name="website"
								label=""
								inputProps={{ "placeholder": "\u0648\u0628\u0633\u0627\u06CC\u062A", "aria-label": "\u0648\u0628\u0633\u0627\u06CC\u062A", disabled }}
							/>
						</ContactMethodCard>
						<ContactMethodCard title={"\u0633\u0627\u0639\u0627\u062A \u06A9\u0627\u0631\u06CC"} icon={<ClockCheckIcon />}>
							<RHFProText
								name="working_hours"
								label=""
								inputProps={{ "placeholder": "\u0633\u0627\u0639\u0627\u062A \u06A9\u0627\u0631\u06CC", "aria-label": "\u0633\u0627\u0639\u0627\u062A \u06A9\u0627\u0631\u06CC", disabled }}
							/>
						</ContactMethodCard>

						<ContactMethodCard title={"\u0634\u0628\u06A9\u0647\u200C\u0647\u0627\u06CC \u0627\u062C\u062A\u0645\u0627\u0639\u06CC"} icon={<TvIcon />} className="company-contact-card--full">
							<CompanyInfoSocialLinksField disabled={disabled} />
						</ContactMethodCard>
					</div>
				</SectionCard>

				<ProfileFormActions
					hasProfile={hasProfile}
					isDirty={isChanged}
					isValid={isValid}
					isSubmitting={isSubmitting}
					submitDisabled={submitDisabled}
					deleteDisabled={deleteDisabled}
					onSubmit={handleSubmit(values => onSubmit(values))}
					onReset={() => reset(defaultValues)}
					onDelete={onDelete}
				/>
			</FormProvider>
		</Form>
	);
}
