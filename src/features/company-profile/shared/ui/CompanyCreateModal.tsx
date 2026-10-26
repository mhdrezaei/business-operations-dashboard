import type { TFunction } from "i18next";

import { RHFProText, RHFSelect } from "#src/shared/ui/rhf-pro";
import { request } from "#src/utils/request/";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Form, Modal } from "antd";
import React, { useMemo, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { z } from "zod";

import { createSmsCommissionAgent } from "../../api/sms-commission-agents.api";
import { createTrafficDatacenter } from "../../api/traffic-datacenters.api";
import { smsCommissionAgentsQuery, trafficDatacentersQuery } from "../../queries/company-profile.queries";
import { companyNameFields } from "../utils/company-name-schema";

interface ServiceOption { label: string, value: number }
interface CompanyTypeSelectOption { label: string, value: string }

interface Props {
	open: boolean
	disabled?: boolean
	serviceId: number
	companyType: string | null
	/** سرویس نوع شرکت می‌خواهد (ایجاد: ترافیک/SMS/PSP/telecom_frame/sales_agency). */
	requiresCompanyType: boolean
	companyTypeOptions: CompanyTypeSelectOption[]
	isSmsCommission: boolean
	isDatacenter: boolean
	serviceOptions: ServiceOption[]
	onClose: () => void
	onCreated: (companyId: number) => void
}

interface CreateCompanyFormValues {
	service: number | null
	company_type: string | null
	name: string
	agent_name: string
}

function createCreateCompanySchema(t: TFunction) {
	return z.object({
		service: z.number().nullable().refine(v => !!v, t("companyProfile.serviceRequired")),
		...companyNameFields(t),
	}) as unknown as z.ZodType<CreateCompanyFormValues, CreateCompanyFormValues>;
}

interface CreatedCompanyDto {
	id: number
	name: string
	service: number
	company_type: string
}

export default function CompanyCreateModal({
	open,
	serviceId,
	companyType,
	requiresCompanyType,
	companyTypeOptions,
	isSmsCommission,
	isDatacenter,
	serviceOptions,
	disabled,
	onClose,
	onCreated,
}: Props) {
	const qc = useQueryClient();
	const { t } = useTranslation();
	const createCompanySchema = useMemo(() => createCreateCompanySchema(t), [t]);
	const kind = isDatacenter ? "datacenter" : "company";
	const [saving, setSaving] = useState(false);

	const defaultValues = useMemo<CreateCompanyFormValues>(() => ({
		service: serviceId || null,
		company_type: companyType,
		name: "",
		agent_name: "",
	}), [serviceId, companyType]);

	const methods = useForm<CreateCompanyFormValues>({
		defaultValues,
		resolver: zodResolver(createCompanySchema),
		mode: "onBlur",
	});

	React.useEffect(() => {
		if (open) {
			methods.reset(defaultValues);
		}
	}, [serviceId, open]);

	async function submit(values: CreateCompanyFormValues) {
		if (!values.service)
			return;
		const needsType = requiresCompanyType && !isDatacenter;
		if (needsType && !values.company_type) {
			window.$message?.warning(t("companyProfile.companyTypePlaceholder"));
			return;
		}
		if (isSmsCommission && !values.agent_name) {
			window.$message?.warning(t("companyProfile.agentNameRequired"));
			return;
		}

		setSaving(true);
		try {
			let createdId: number;
			if (isDatacenter) {
				createdId = (await createTrafficDatacenter({ name: values.name.trim() })).id;
				await qc.invalidateQueries({ queryKey: trafficDatacentersQuery().queryKey });
			}
			else {
				const payload = {
					name: values.name.trim(),
					service: values.service,
					company_type: needsType ? values.company_type : undefined,
				};

				const created = await request
					.post("common/companies/", { json: payload })
					.json<CreatedCompanyDto>();
				createdId = created.id;
				if (isSmsCommission)
					await createSmsCommissionAgent({ name: values.agent_name, company: created.id });

				await qc.invalidateQueries({ queryKey: ["common", "companies", { serviceId: values.service }] });
				if (isSmsCommission)
					await qc.invalidateQueries({ queryKey: smsCommissionAgentsQuery().queryKey });
			}

			window.$message?.success(t(`companyProfile.${kind}.createSuccess`));
			onCreated(createdId);
			methods.reset(defaultValues);
		}
		catch (e) {
			console.error(e);
			window.$message?.error(t("companyProfile.genericError"));
		}
		finally {
			setSaving(false);
		}
	}

	return (
		<Modal
			open={open}
			onCancel={() => {
				if (!saving)
					onClose();
			}}
			title={t(`companyProfile.${kind}.createTitle`)}
			footer={null}
			destroyOnHidden
		>
			<Form layout="vertical">
				<FormProvider {...methods}>
					<RHFSelect<CreateCompanyFormValues, "service", number | null>
						name="service"
						label={t("companyProfile.service")}
						options={serviceOptions}
						selectProps={{
							disabled: true,
							placeholder: t("companyProfile.service"),
						}}
					/>

					{requiresCompanyType && !isDatacenter && (
						<RHFSelect<CreateCompanyFormValues, "company_type", string | null>
							name="company_type"
							label={t("companyProfile.companyType")}
							options={companyTypeOptions}
							autoSelectSingle
							selectProps={{ placeholder: t("companyProfile.companyTypePlaceholder"), disabled: saving }}
						/>
					)}

					<RHFProText
						name="name"
						label={t(`companyProfile.${kind}.nameLabel`)}
						inputProps={{ placeholder: t(`companyProfile.${kind}.nameLabel`), disabled: !!disabled || saving }}
					/>

					{isSmsCommission && !isDatacenter && (
						<RHFProText
							name="agent_name"
							label={t("companyProfile.agentName")}
							inputProps={{ placeholder: t("companyProfile.agentName"), disabled: !!disabled || saving }}
						/>
					)}

					<div className="flex justify-between mt-4">
						{!disabled ? (
							<Button
								type="primary"
								loading={saving}
								onClick={methods.handleSubmit(v => submit(v))}
							>
								{t(`companyProfile.${kind}.createSubmit`)}
							</Button>
						) : null}

						<Button
							onClick={() => onClose()}
							disabled={saving}
						>
							{t("common.cancel")}
						</Button>
					</div>
				</FormProvider>
			</Form>
		</Modal>
	);
}
