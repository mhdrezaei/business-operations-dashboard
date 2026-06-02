import type { Resolver } from "react-hook-form";

import { RHFProText, RHFSelect } from "#src/shared/ui/rhf-pro";
import { request } from "#src/utils/request/";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Form, Modal } from "antd";
import React, { useMemo, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";

import { z } from "zod";

interface ServiceOption { label: string, value: number }

interface Props {
	open: boolean
	disabled?: boolean
	serviceId: number
	companyType: string | null
	requiresCompanyType: boolean
	serviceOptions: ServiceOption[]
	onClose: () => void
	onCreated: (companyId: number) => void
}

interface CreateCompanyFormValues {
	service: number | null
	name: string
}

const createCompanySchema = z.object({
	service: z.number().nullable().refine(v => !!v, "سرویس را انتخاب کنید"),
	name: z.string().trim().min(2, "نام شرکت الزامی است"),
}) as unknown as z.ZodType<CreateCompanyFormValues>;

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
	serviceOptions,
	disabled,
	onClose,
	onCreated,
}: Props) {
	const qc = useQueryClient();
	const [saving, setSaving] = useState(false);

	const defaultValues = useMemo<CreateCompanyFormValues>(() => ({
		service: serviceId || null,
		name: "",
	}), [serviceId]);

	const methods = useForm<CreateCompanyFormValues>({
		defaultValues,
		resolver: zodResolver(createCompanySchema as any) as unknown as Resolver<CreateCompanyFormValues>,
		mode: "onBlur",
	});

	React.useEffect(() => {
		if (open) {
			methods.reset({ service: serviceId || null, name: "" });
		}
	}, [serviceId, open]);

	async function submit(values: CreateCompanyFormValues) {
		if (!values.service)
			return;
		if (requiresCompanyType && !companyType) {
			window.$message?.warning("نوع شرکت را انتخاب کنید");
			return;
		}

		setSaving(true);
		try {
			const payload = {
				name: values.name.trim(),
				service: values.service,
				company_type: requiresCompanyType ? companyType : undefined,
			};

			const created = await request
				.post("common/companies/", { json: payload })
				.json<CreatedCompanyDto>();

			await qc.invalidateQueries({ queryKey: ["common", "companies", { serviceId: values.service }] });

			window.$message?.success("شرکت با موفقیت ایجاد شد");
			onCreated(created.id);
			methods.reset({ service: values.service, name: "" });
		}
		catch (e) {
			console.error(e);
			window.$message?.error("در حال حاضر مشکلی وجود دارد");
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
			title="ایجاد شرکت جدید"
			footer={null}
			destroyOnClose
		>
			<Form layout="vertical">
				<FormProvider {...methods}>
					<RHFSelect<CreateCompanyFormValues, "service", number | null>
						name="service"
						label="سرویس"
						options={serviceOptions}
						selectProps={{
							disabled: true,
							placeholder: "سرویس",
						}}
					/>

					<RHFProText
						name="name"
						label="نام شرکت"
						inputProps={{ placeholder: "نام شرکت", disabled: !!disabled || saving }}
					/>

					<div className="flex justify-between mt-4">
						<Button
							type="primary"
							loading={saving}
							disabled={!!disabled}
							onClick={methods.handleSubmit(v => submit(v))}
						>
							ثبت شرکت
						</Button>

						<Button
							onClick={() => onClose()}
							disabled={saving}
						>
							انصراف
						</Button>
					</div>
				</FormProvider>
			</Form>
		</Modal>
	);
}
