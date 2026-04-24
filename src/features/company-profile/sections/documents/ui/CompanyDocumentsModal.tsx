import type { UploadProps } from "antd";
import type { Resolver } from "react-hook-form";
import type { CompanyDocumentFormValues } from "../model/company-documents.types";
import { RHFProDate, RHFProUploadButton, RHFSelect } from "#src/shared/ui/rhf-pro";

import { ProCard } from "@ant-design/pro-components";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Form, Modal } from "antd";
import React, { useEffect, useMemo } from "react";

import { FormProvider, useForm } from "react-hook-form";
import { DOC_TYPE_OPTIONS, VERIFICATION_STATUS_OPTIONS } from "../model/company-documents.constants";
import { companyDocumentSchema } from "../model/company-documents.schema";

interface Props {
	open: boolean
	loading?: boolean
	title: string
	defaultValues: CompanyDocumentFormValues
	disabled: boolean
	onClose: () => void
	onSubmit: (values: CompanyDocumentFormValues) => void | Promise<void>
}

export default function CompanyDocumentsModal({
	open,
	loading,
	title,
	defaultValues,
	disabled,
	onClose,
	onSubmit,
}: Props) {
	const methods = useForm<CompanyDocumentFormValues>({
		defaultValues,
		resolver: zodResolver(companyDocumentSchema as any) as unknown as Resolver<CompanyDocumentFormValues>,
		mode: "onChange",
	});

	const {
		handleSubmit,
		reset,
		formState: { isDirty, isValid, isSubmitting },
	} = methods;

	useEffect(() => {
		if (open) {
			reset(defaultValues);
		}
	}, [open, defaultValues, reset]);

	const footer = useMemo(() => {
		return (
			<div className="flex items-center justify-end gap-2">
				<Button onClick={onClose}>انصراف</Button>
				<Button
					type="primary"
					onClick={handleSubmit(values => onSubmit(values))}
					disabled={disabled || !isDirty || !isValid}
					loading={isSubmitting}
				>
					ذخیره
				</Button>
			</div>
		);
	}, [disabled, handleSubmit, isDirty, isValid, isSubmitting, onClose, onSubmit]);

	return (
		<Modal
			open={open}
			onCancel={onClose}
			title={title}
			footer={footer}
			width={720}
			destroyOnClose
		>
			<Form layout="vertical" className="space-y-3">
				<FormProvider {...methods}>
					<ProCard bordered>
						<div className="grid grid-cols-2 gap-x-4 gap-y-4">
							<RHFSelect
								name="doc_type"
								label="نوع مدرک"
								selectProps={{ allowClear: true, placeholder: "انتخاب کنید", disabled }}
								options={DOC_TYPE_OPTIONS}
							/>

							<RHFSelect
								name="verification_status"
								label="وضعیت تایید"
								selectProps={{ allowClear: true, placeholder: "انتخاب کنید", disabled }}
								options={VERIFICATION_STATUS_OPTIONS}
							/>

							<RHFProDate
								name="valid_from"
								label="اعتبار از"
								itemProps={{ placeholder: "انتخاب تاریخ", disabled }}
							/>

							<RHFProDate
								name="valid_until"
								label="اعتبار تا"
								itemProps={{ placeholder: "انتخاب تاریخ", disabled }}
							/>

							<div className="col-span-2">
								<RHFProUploadButton<CompanyDocumentFormValues, "file">
									name="file"
									label="فایل PDF"
									uploadProps={{
										accept: "application/pdf",
										maxCount: 1,
										beforeUpload: () => false,
										disabled,
									}}
									buttonText="انتخاب فایل"
									mapFileListToValue={fileList => fileList?.[0]?.originFileObj ?? null}
									mapValueToFileList={(value) => {
										if (!value)
											return [];
										const f = value as File;
										return [
											{
												uid: "file",
												name: f.name,
												status: "done",
												originFileObj: f,
											} as any,
										] as UploadProps["fileList"];
									}}
								/>
							</div>
							{loading && (
								<div className="col-span-2 text-xs opacity-70">در حال بارگذاری...</div>
							)}
						</div>
					</ProCard>
				</FormProvider>
			</Form>
		</Modal>
	);
}
