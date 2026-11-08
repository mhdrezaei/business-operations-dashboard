import type { Dayjs } from "#src/shared/lib/dayjs-jalali";
import type { RealEndRecord } from "../../model/additional-info.types";
import { dayjs } from "#src/shared/lib/dayjs-jalali";
import { getJalaliParts } from "#src/shared/lib/jalali-intl";
import { useQueryClient } from "@tanstack/react-query";
import { Alert, Form, message, Modal } from "antd";
import { DatePicker } from "antd-jalali";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { createRealEnd, updateRealEnd } from "../../api/additional-info.api";
import { invalidateContractAdditionalInfo } from "../../queries/additional-info.queries";

interface Props {
	open: boolean
	onClose: () => void
	contractId: number
	serviceId: number
	initialRecord?: RealEndRecord | null
	onSuccess?: () => void
}

export function RealEndDateModal({
	open,
	onClose,
	contractId,
	serviceId,
	initialRecord,
	onSuccess,
}: Props) {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const [form] = Form.useForm();
	const [submitting, setSubmitting] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const isEdit = initialRecord != null && initialRecord.id > 0;

	useEffect(() => {
		if (open) {
			if (initialRecord && initialRecord.real_end_date) {
				const dateObj = new Date(initialRecord.real_end_date);
				form.setFieldsValue({
					date: !Number.isNaN(dateObj.getTime()) ? dayjs(dateObj) : null,
				});
			}
			else {
				form.resetFields();
			}
		}
	}, [open, initialRecord, form]);

	const handleSubmit = async () => {
		try {
			const values = await form.validateFields();
			const selectedDayjs = values.date as Dayjs;
			if (!selectedDayjs) {
				return;
			}

			const dateObj = typeof selectedDayjs.toDate === "function" ? selectedDayjs.toDate() : new Date();
			const jalali = getJalaliParts(dateObj);

			setSubmitting(true);
			setErrorMessage(null);

			const payload = {
				base_contract: contractId,
				service: serviceId,
				real_end_jy: jalali.year,
				real_end_jm: jalali.month,
				real_end_jd: jalali.day,
			};

			if (isEdit) {
				await updateRealEnd(initialRecord.id, payload);
				message.success(t("contract.additionalInfo.realEndUpdated", "تاریخ پایان واقعی با موفقیت ویرایش شد و تاریخ استرداد تضمین‌ها به‌روزرسانی گردید."));
			}
			else {
				await createRealEnd(payload);
				message.success(t("contract.additionalInfo.realEndCreated", "تاریخ پایان واقعی با موفقیت ثبت شد و تاریخ استرداد تضمین‌ها محاسبه گردید."));
			}

			invalidateContractAdditionalInfo(queryClient, contractId);
			onSuccess?.();
			onClose();
		}
		catch (err: any) {
			if (err?.errorFields) {
				return;
			}
			let msg = err?.message || t("contract.form.submitError", "خطا در ثبت اطلاعات");
			try {
				if (typeof err?.response?.json === "function") {
					const data = await err.response.json();
					if (data?.base_contract) {
						msg = Array.isArray(data.base_contract) ? data.base_contract[0] : String(data.base_contract);
					}
					else if (data?.real_end_jd) {
						msg = Array.isArray(data.real_end_jd) ? data.real_end_jd[0] : String(data.real_end_jd);
					}
					else if (data?.detail) {
						msg = data.detail;
					}
				}
			}
			catch {}
			setErrorMessage(msg);
		}
		finally {
			setSubmitting(false);
		}
	};

	const handleCancel = () => {
		setErrorMessage(null);
		form.resetFields();
		onClose();
	};

	return (
		<Modal
			title={isEdit ? t("contract.additionalInfo.editRealEnd", "ویرایش تاریخ پایان واقعی قرارداد") : t("contract.additionalInfo.createRealEnd", "ثبت تاریخ پایان واقعی قرارداد")}
			open={open}
			onCancel={handleCancel}
			onOk={handleSubmit}
			confirmLoading={submitting}
			okText={isEdit ? t("common.save", "ذخیره") : t("common.submit", "ثبت")}
			cancelText={t("common.cancel", "انصراف")}
			destroyOnClose
		>
			<div dir="rtl" className="mt-4 flex flex-col gap-4">
				<Alert
					type="info"
					showIcon
					message={t(
						"contract.additionalInfo.realEndRecalculationNotice",
						"با ثبت یا تغییر تاریخ پایان واقعی، تاریخ استرداد تمام تضمین‌های متصل به این قرارداد به‌صورت خودکار مجدداً محاسبه خواهد شد.",
					)}
				/>

				{errorMessage
					? <Alert type="error" showIcon message={errorMessage} />
					: null}

				<Form form={form} layout="vertical">
					<Form.Item
						name="date"
						label={t("contract.additionalInfo.realEndDateLabel", "تاریخ پایان واقعی (شمسی)")}
						rules={[{ required: true, message: t("contract.additionalInfo.dateRequired", "لطفاً تاریخ را انتخاب کنید") }]}
					>
						<DatePicker
							className="w-full"
							placeholder={t("contract.additionalInfo.selectDate", "انتخاب تاریخ")}
						/>
					</Form.Item>
				</Form>
			</div>
		</Modal>
	);
}
