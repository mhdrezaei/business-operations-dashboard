import type { Dayjs } from "#src/shared/lib/dayjs-jalali";
import type {
	GuaranteeCatalogItem,
	GuaranteePayload,
	GuaranteeRecord,
	GuaranteeType,
} from "../../model/additional-info.types";
import { dayjs } from "#src/shared/lib/dayjs-jalali";
import { getJalaliParts } from "#src/shared/lib/jalali-intl";
import { DashedCard } from "#src/shared/ui/dashed-card";
import {
	formatWithGrouping,
	numberToWordsByLanguage,
	stripGroupingSeparators,
	toPersianDigits,
} from "#src/utils/formated";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Alert,
	Col,
	Form,
	Input,
	InputNumber,
	message,
	Modal,
	Row,
	Select,
	theme,
} from "antd";
import { DatePicker } from "antd-jalali";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { createGuarantee, updateGuarantee } from "../../api/additional-info.api";
import { GUARANTEE_TYPES } from "../../model/additional-info.types";
import {
	guaranteeCatalogQuery,
	invalidateContractAdditionalInfo,
} from "../../queries/additional-info.queries";

interface Props {
	open: boolean
	onClose: () => void
	contractId: number
	serviceId: number
	initialType?: GuaranteeType
	initialRecord?: GuaranteeRecord | null
	addendumGroupId?: string | null
	addendumService?: string | null
	onSuccess?: () => void
}

export function GuaranteeFormModal({
	open,
	onClose,
	contractId,
	serviceId,
	initialType = "CHECK",
	initialRecord,
	addendumGroupId,
	addendumService,
	onSuccess,
}: Props) {
	const { t } = useTranslation();
	const { token } = theme.useToken();
	const queryClient = useQueryClient();
	const [form] = Form.useForm();
	const [submitting, setSubmitting] = useState(false);
	const [generalError, setGeneralError] = useState<string | null>(null);

	const isEdit = initialRecord != null && initialRecord.id > 0;
	const [selectedType, setSelectedType] = useState<GuaranteeType>(() => {
		return initialRecord?.guarantee_type ?? initialType;
	});

	const catalogQuery = useQuery(guaranteeCatalogQuery());
	const catalogItems: GuaranteeCatalogItem[] = catalogQuery.data ?? [];

	// Watch rial amount to generate Persian words preview
	const watchedAmountRial = Form.useWatch("amount_rial", form);
	const watchedTotalAmountRial = Form.useWatch("total_amount_rial", form);

	const activeAmountRial = selectedType === "PROMISSORY_NOTE" ? watchedTotalAmountRial : watchedAmountRial;
	const amountInWords = useMemo(() => {
		if (!activeAmountRial)
			return "";
		const rawDigits = stripGroupingSeparators(String(activeAmountRial));
		const words = numberToWordsByLanguage(rawDigits, "fa-IR");
		return words ? `${words} ریال` : "";
	}, [activeAmountRial]);

	useEffect(() => {
		if (open) {
			if (initialRecord) {
				let issueDayjs: Dayjs | null = null;
				if (initialRecord.issue_date) {
					const d = new Date(initialRecord.issue_date);
					if (!Number.isNaN(d.getTime()))
						issueDayjs = dayjs(d);
				}

				let receiptDayjs: Dayjs | null = null;
				if (initialRecord.receipt_date) {
					const d = new Date(initialRecord.receipt_date);
					if (!Number.isNaN(d.getTime()))
						receiptDayjs = dayjs(d);
				}

				form.setFieldsValue({
					...initialRecord,
					issue_date_dayjs: issueDayjs,
					receipt_date_dayjs: receiptDayjs,
					notes_numbers: Array.isArray(initialRecord.notes_numbers) ? initialRecord.notes_numbers : [],
				});
			}
			else {
				form.resetFields();
				form.setFieldsValue({
					return_days_after_termination: 45,
					notes_count: 1,
					notes_numbers: [""],
				});
			}
		}
	}, [open, initialRecord, form]);

	// Sync amount_words field if empty or auto-generated
	const handleAmountChange = (val: string | number | null, wordsFieldKey: string) => {
		if (val == null || val === "") {
			form.setFieldValue(wordsFieldKey, "");
			return;
		}
		const rawDigits = stripGroupingSeparators(String(val));
		const words = numberToWordsByLanguage(rawDigits, "fa-IR");
		if (words) {
			form.setFieldValue(wordsFieldKey, `${words} ریال`);
		}
	};

	const handleSubmit = async () => {
		try {
			const values = await form.validateFields();
			setSubmitting(true);
			setGeneralError(null);

			// Extract Jalali issue date
			const issueDayjs = values.issue_date_dayjs as Dayjs;
			if (!issueDayjs) {
				form.setFields([{ name: "issue_date_dayjs", errors: [t("contract.additionalInfo.issueDateRequired", "تاریخ صدور الزامی است")] }]);
				setSubmitting(false);
				return;
			}
			const issueDateObj = typeof issueDayjs.toDate === "function" ? issueDayjs.toDate() : new Date();
			const issueJalali = getJalaliParts(issueDateObj);

			// Build base payload
			const payload: GuaranteePayload = {
				type: selectedType,
				base_contract: contractId,
				service: serviceId,
				issue_jy: issueJalali.year,
				issue_jm: issueJalali.month,
				issue_jd: issueJalali.day,
				return_days_after_termination: Number(values.return_days_after_termination ?? 0),
				note: values.note ? String(values.note).trim() : "",
			};

			// Handle addendum connection if provided
			const resolvedAddendumGroupId = values.addendum_group_id || addendumGroupId || null;
			const resolvedAddendumService = values.addendum_service || addendumService || null;
			if (resolvedAddendumGroupId && resolvedAddendumService) {
				payload.addendum_group_id = resolvedAddendumGroupId;
				payload.addendum_service = resolvedAddendumService;
			}

			// Add type-specific fields
			if (selectedType === "CHECK") {
				payload.check_number = values.check_number ? String(values.check_number).trim() : "";
				payload.issuing_bank = values.issuing_bank ? String(values.issuing_bank).trim() : "";
				payload.bank_branch = values.bank_branch ? String(values.bank_branch).trim() : "";
				payload.branch_code = values.branch_code ? String(values.branch_code).trim() : "";
				payload.guarantee_percent = values.guarantee_percent != null ? String(values.guarantee_percent) : "";
				payload.amount_rial = stripGroupingSeparators(values.amount_rial ?? "");
				payload.amount_words = values.amount_words ? String(values.amount_words).trim() : amountInWords;
			}
			else if (selectedType === "PROMISSORY_NOTE") {
				const count = Number(values.notes_count ?? 1);
				payload.notes_count = count;
				const notesArr = Array.isArray(values.notes_numbers)
					? values.notes_numbers.map((s: unknown) => String(s ?? "").trim()).filter(Boolean)
					: [];
				payload.notes_numbers = notesArr;
				payload.total_amount_rial = stripGroupingSeparators(values.total_amount_rial ?? "");
				payload.total_amount_words = values.total_amount_words ? String(values.total_amount_words).trim() : amountInWords;
			}
			else if (selectedType === "BANK_GUARANTEE") {
				payload.amount_rial = stripGroupingSeparators(values.amount_rial ?? "");
				payload.amount_words = values.amount_words ? String(values.amount_words).trim() : amountInWords;
				payload.guarantee_percent = values.guarantee_percent != null ? String(values.guarantee_percent) : "";
				payload.min_validity_period = Number(values.min_validity_period ?? 0);
			}
			else if (selectedType === "DEPOSIT_RECEIPT") {
				payload.receipt_number = values.receipt_number ? String(values.receipt_number).trim() : "";
				const receiptDayjs = values.receipt_date_dayjs as Dayjs | undefined;
				if (receiptDayjs) {
					const rObj = typeof receiptDayjs.toDate === "function" ? receiptDayjs.toDate() : new Date();
					const rJalali = getJalaliParts(rObj);
					payload.receipt_jy = rJalali.year;
					payload.receipt_jm = rJalali.month;
					payload.receipt_jd = rJalali.day;
				}
				payload.issuing_bank = values.issuing_bank ? String(values.issuing_bank).trim() : "";
				payload.bank_branch = values.bank_branch ? String(values.bank_branch).trim() : "";
				payload.branch_code = values.branch_code ? String(values.branch_code).trim() : "";
				payload.amount_rial = stripGroupingSeparators(values.amount_rial ?? "");
				payload.amount_words = values.amount_words ? String(values.amount_words).trim() : amountInWords;
				payload.equivalent_months = Number(values.equivalent_months ?? 0);
			}

			if (isEdit) {
				await updateGuarantee(initialRecord.id, selectedType, payload);
				message.success(t("contract.additionalInfo.guaranteeUpdated", "تضمین با موفقیت به‌روزرسانی شد."));
			}
			else {
				await createGuarantee(payload);
				message.success(t("contract.additionalInfo.guaranteeCreated", "تضمین جدید با موفقیت ثبت شد."));
			}

			invalidateContractAdditionalInfo(queryClient, contractId);
			onSuccess?.();
			onClose();
		}
		catch (err: any) {
			if (err?.errorFields) {
				return;
			}

			let errorHandled = false;
			try {
				if (typeof err?.response?.json === "function") {
					const data = await err.response.json();
					if (typeof data === "object" && data !== null) {
						const fieldErrors: { name: string, errors: string[] }[] = [];
						Object.entries(data).forEach(([key, val]) => {
							const msgs = Array.isArray(val) ? val.map(String) : [String(val)];
							if (key === "detail" || key === "non_field_errors") {
								setGeneralError(msgs.join(" - "));
							}
							else {
								let formKey = key;
								if (key === "issue_jd" || key === "issue_jy" || key === "issue_jm") {
									formKey = "issue_date_dayjs";
								}
								else if (key === "receipt_jd" || key === "receipt_jy" || key === "receipt_jm") {
									formKey = "receipt_date_dayjs";
								}
								fieldErrors.push({ name: formKey, errors: msgs });
							}
						});
						if (fieldErrors.length > 0) {
							form.setFields(fieldErrors);
							errorHandled = true;
						}
					}
				}
			}
			catch {}

			if (!errorHandled && !generalError) {
				setGeneralError(err?.message || t("contract.form.submitError", "خطا در ذخیره اطلاعات"));
			}
		}
		finally {
			setSubmitting(false);
		}
	};

	const guaranteeTypeOptions = useMemo(() => {
		if (catalogItems.length > 0) {
			return catalogItems.map(c => ({
				value: c.guarantee_type,
				label: c.guarantee_type === "CHECK"
					? "چک صیادی"
					: c.guarantee_type_label,
			}));
		}
		return GUARANTEE_TYPES.map(gt => ({
			value: gt,
			label: gt === "CHECK"
				? "چک صیادی"
				: gt === "PROMISSORY_NOTE"
					? "سفته"
					: gt === "BANK_GUARANTEE"
						? "ضمانت‌نامه بانکی"
						: "فیش واریزی",
		}));
	}, [catalogItems]);

	const handleCancel = () => {
		setGeneralError(null);
		form.resetFields();
		onClose();
	};

	return (
		<Modal
			title={isEdit ? t("contract.additionalInfo.editGuarantee", "ویرایش تضمین انجام تعهد") : t("contract.additionalInfo.createGuarantee", "ثبت تضمین انجام تعهد")}
			open={open}
			onCancel={handleCancel}
			onOk={handleSubmit}
			confirmLoading={submitting}
			width={760}
			okText={isEdit ? t("common.save", "ذخیره تغییرات") : t("common.submit", "ثبت تضمین")}
			cancelText={t("common.cancel", "انصراف")}
			destroyOnClose
		>
			<div dir="rtl" className="mt-4 flex flex-col gap-4">
				{generalError
					? <Alert type="error" showIcon message={generalError} />
					: null}

				<Form form={form} layout="vertical">
					<Row gutter={16}>
						<Col span={12}>
							<Form.Item
								label={t("contract.additionalInfo.guaranteeType", "نوع تضمین انجام تعهد")}
								required
							>
								<Select
									value={selectedType}
									onChange={(val) => {
										setSelectedType(val);
										form.resetFields();
										form.setFieldsValue({
											return_days_after_termination: 45,
											notes_count: 1,
											notes_numbers: [""],
										});
									}}
									disabled={isEdit}
									options={guaranteeTypeOptions}
								/>
							</Form.Item>
						</Col>
						<Col span={12}>
							<Form.Item
								name="issue_date_dayjs"
								label={t("contract.additionalInfo.issueDate", "تاریخ صدور (شمسی)")}
								rules={[{ required: true, message: t("contract.additionalInfo.issueDateRequired", "تاریخ صدور الزامی است") }]}
							>
								<DatePicker
									className="w-full"
									placeholder={t("contract.additionalInfo.selectDate", "انتخاب تاریخ")}
								/>
							</Form.Item>
						</Col>
					</Row>

					{/* مشخصات اختصاصی بر اساس نوع تضمین */}
					<DashedCard
						title="مشخصات و اطلاعات سند تضمین"
						tone="primary"
						className="my-3"
					>
						{selectedType === "CHECK" && (
							<>
								<Row gutter={16}>
									<Col span={12}>
										<Form.Item
											name="check_number"
											label={t("contract.additionalInfo.checkNumber", "شماره چک صیادی")}
											rules={[{ required: true, message: t("contract.additionalInfo.requiredField", "این فیلد الزامی است") }]}
										>
											<Input placeholder="مثال: ۱۲۳۴۵۶۷۸۹۰" />
										</Form.Item>
									</Col>
									<Col span={12}>
										<Form.Item
											name="guarantee_percent"
											label={t("contract.additionalInfo.guaranteePercent", "درصد نسبت به مبلغ کل قرارداد")}
										>
											<InputNumber
												className="w-full"
												min={0}
												max={1000}
												step={1}
												addonAfter="%"
												placeholder="مثال: ۱۰۰"
											/>
										</Form.Item>
									</Col>
								</Row>

								<Row gutter={16}>
									<Col span={8}>
										<Form.Item
											name="issuing_bank"
											label={t("contract.additionalInfo.issuingBank", "بانک صادرکننده")}
											rules={[{ required: true, message: t("contract.additionalInfo.requiredField", "این فیلد الزامی است") }]}
										>
											<Input placeholder="مثال: ملت" />
										</Form.Item>
									</Col>
									<Col span={8}>
										<Form.Item
											name="bank_branch"
											label={t("contract.additionalInfo.bankBranch", "نام شعبه")}
											rules={[{ required: true, message: t("contract.additionalInfo.requiredField", "این فیلد الزامی است") }]}
										>
											<Input placeholder="مثال: مرکزی" />
										</Form.Item>
									</Col>
									<Col span={8}>
										<Form.Item
											name="branch_code"
											label={t("contract.additionalInfo.branchCode", "کد شعبه")}
										>
											<Input placeholder="مثال: ۱۰۱" />
										</Form.Item>
									</Col>
								</Row>

								<Row gutter={16}>
									<Col span={12}>
										<Form.Item
											name="amount_rial"
											label={t("contract.additionalInfo.amountRial", "مبلغ چک (ریال)")}
											rules={[{ required: true, message: t("contract.additionalInfo.requiredField", "این فیلد الزامی است") }]}
											extra={amountInWords ? (
												<span className="text-xs text-[var(--ant-color-primary)]">
													معادل:
													{amountInWords}
												</span>
											) : null}
										>
											<Input
												placeholder="مثال: ۱۰۰,۰۰۰,۰۰۰"
												onChange={(e) => {
													const val = e.target.value;
													const formatted = formatWithGrouping(val, "fa-IR");
													form.setFieldValue("amount_rial", formatted);
													handleAmountChange(formatted, "amount_words");
												}}
											/>
										</Form.Item>
									</Col>
									<Col span={12}>
										<Form.Item
											name="amount_words"
											label={t("contract.additionalInfo.amountWords", "مبلغ به حروف")}
										>
											<Input placeholder="مثال: صد میلیون ریال" />
										</Form.Item>
									</Col>
								</Row>
							</>
						)}

						{selectedType === "PROMISSORY_NOTE" && (
							<>
								<Row gutter={16}>
									<Col span={8}>
										<Form.Item
											name="notes_count"
											label={t("contract.additionalInfo.notesCount", "تعداد فقره سفته")}
											rules={[{ required: true, message: t("contract.additionalInfo.requiredField", "این فیلد الزامی است") }]}
										>
											<InputNumber
												className="w-full"
												min={1}
												max={50}
												onChange={(val) => {
													const count = Number(val || 1);
													const current: string[] = form.getFieldValue("notes_numbers") || [];
													const updated = [...current];
													while (updated.length < count) updated.push("");
													while (updated.length > count) updated.pop();
													form.setFieldValue("notes_numbers", updated);
												}}
											/>
										</Form.Item>
									</Col>
									<Col span={8}>
										<Form.Item
											name="total_amount_rial"
											label={t("contract.additionalInfo.totalAmountRial", "مبلغ کل سفته‌ها (ریال)")}
											rules={[{ required: true, message: t("contract.additionalInfo.requiredField", "این فیلد الزامی است") }]}
											extra={amountInWords ? (
												<span className="text-xs text-[var(--ant-color-primary)]">
													معادل:
													{amountInWords}
												</span>
											) : null}
										>
											<Input
												placeholder="مثال: ۱,۰۰۰,۰۰۰,۰۰۰"
												onChange={(e) => {
													const val = e.target.value;
													const formatted = formatWithGrouping(val, "fa-IR");
													form.setFieldValue("total_amount_rial", formatted);
													handleAmountChange(formatted, "total_amount_words");
												}}
											/>
										</Form.Item>
									</Col>
									<Col span={8}>
										<Form.Item
											name="total_amount_words"
											label={t("contract.additionalInfo.totalAmountWords", "مبلغ کل به حروف")}
										>
											<Input placeholder="مثال: یک میلیارد ریال" />
										</Form.Item>
									</Col>
								</Row>

								<Form.List name="notes_numbers">
									{fields => (
										<div
											className="rounded-lg p-3"
											style={{
												backgroundColor: token.colorFillAlter,
												border: `1px solid ${token.colorBorderSecondary}`,
											}}
										>
											<div className="mb-2.5 flex items-center justify-between">
												<span className="text-xs font-semibold text-[var(--ant-color-text)]">
													{t("contract.additionalInfo.promissoryNumbersList", "شماره‌های لاشه سفته:")}
												</span>
												<span className="text-[11px] text-[var(--ant-color-text-secondary)]">
													(تعداد شماره‌ها باید برابر با تعداد سفته‌ها باشد)
												</span>
											</div>
											<Row gutter={[12, 8]}>
												{fields.map((field, index) => (
													<Col span={12} key={field.key}>
														<Form.Item
															{...field}
															label={`${t("contract.additionalInfo.noteNumber", "شماره سفته")} ${toPersianDigits(String(index + 1))}`}
															rules={[{ required: true, message: "شماره را وارد کنید" }]}
															className="mb-2"
														>
															<Input placeholder={`شماره سفته ${toPersianDigits(String(index + 1))}`} />
														</Form.Item>
													</Col>
												))}
											</Row>
										</div>
									)}
								</Form.List>
							</>
						)}

						{selectedType === "BANK_GUARANTEE" && (
							<>
								<Row gutter={16}>
									<Col span={12}>
										<Form.Item
											name="amount_rial"
											label={t("contract.additionalInfo.amountRial", "مبلغ ضمانت‌نامه (ریال)")}
											rules={[{ required: true, message: t("contract.additionalInfo.requiredField", "این فیلد الزامی است") }]}
											extra={amountInWords ? (
												<span className="text-xs text-[var(--ant-color-primary)]">
													معادل:
													{amountInWords}
												</span>
											) : null}
										>
											<Input
												placeholder="مثال: ۵۰۰,۰۰۰,۰۰۰"
												onChange={(e) => {
													const val = e.target.value;
													const formatted = formatWithGrouping(val, "fa-IR");
													form.setFieldValue("amount_rial", formatted);
													handleAmountChange(formatted, "amount_words");
												}}
											/>
										</Form.Item>
									</Col>
									<Col span={12}>
										<Form.Item
											name="amount_words"
											label={t("contract.additionalInfo.amountWords", "مبلغ به حروف")}
										>
											<Input placeholder="مثال: پانصد میلیون ریال" />
										</Form.Item>
									</Col>
								</Row>

								<Row gutter={16}>
									<Col span={12}>
										<Form.Item
											name="guarantee_percent"
											label={t("contract.additionalInfo.guaranteePercent", "درصد نسبت به مبلغ کل قرارداد")}
										>
											<InputNumber
												className="w-full"
												min={0}
												max={100}
												step={0.1}
												addonAfter="%"
												placeholder="مثال: ۱۰.۰"
											/>
										</Form.Item>
									</Col>
									<Col span={12}>
										<Form.Item
											name="min_validity_period"
											label={t("contract.additionalInfo.minValidityPeriod", "حداقل دوره اعتبار (روز)")}
											rules={[{ required: true, message: t("contract.additionalInfo.requiredField", "این فیلد الزامی است") }]}
										>
											<InputNumber
												className="w-full"
												min={1}
												placeholder="مثال: ۳۶۵"
											/>
										</Form.Item>
									</Col>
								</Row>
							</>
						)}

						{selectedType === "DEPOSIT_RECEIPT" && (
							<>
								<Row gutter={16}>
									<Col span={12}>
										<Form.Item
											name="receipt_number"
											label={t("contract.additionalInfo.receiptNumber", "شماره فیش واریزی")}
											rules={[{ required: true, message: t("contract.additionalInfo.requiredField", "این فیلد الزامی است") }]}
										>
											<Input placeholder="مثال: ۱۰۲۹۳۸۴" />
										</Form.Item>
									</Col>
									<Col span={12}>
										<Form.Item
											name="receipt_date_dayjs"
											label={t("contract.additionalInfo.receiptDate", "تاریخ واریز فیش (شمسی)")}
											rules={[{ required: true, message: t("contract.additionalInfo.requiredField", "این فیلد الزامی است") }]}
										>
											<DatePicker className="w-full" placeholder="انتخاب تاریخ واریز" />
										</Form.Item>
									</Col>
								</Row>

								<Row gutter={16}>
									<Col span={8}>
										<Form.Item
											name="issuing_bank"
											label={t("contract.additionalInfo.issuingBank", "بانک مقصد")}
											rules={[{ required: true, message: t("contract.additionalInfo.requiredField", "این فیلد الزامی است") }]}
										>
											<Input placeholder="مثال: ملت" />
										</Form.Item>
									</Col>
									<Col span={8}>
										<Form.Item
											name="bank_branch"
											label={t("contract.additionalInfo.bankBranch", "نام شعبه")}
											rules={[{ required: true, message: t("contract.additionalInfo.requiredField", "این فیلد الزامی است") }]}
										>
											<Input placeholder="مثال: مرکزی" />
										</Form.Item>
									</Col>
									<Col span={8}>
										<Form.Item
											name="branch_code"
											label={t("contract.additionalInfo.branchCode", "کد شعبه")}
										>
											<Input placeholder="مثال: ۱۰۱" />
										</Form.Item>
									</Col>
								</Row>

								<Row gutter={16}>
									<Col span={8}>
										<Form.Item
											name="amount_rial"
											label={t("contract.additionalInfo.amountRial", "مبلغ واریزی (ریال)")}
											rules={[{ required: true, message: t("contract.additionalInfo.requiredField", "این فیلد الزامی است") }]}
											extra={amountInWords ? (
												<span className="text-xs text-[var(--ant-color-primary)]">
													معادل:
													{amountInWords}
												</span>
											) : null}
										>
											<Input
												placeholder="مثال: ۷۰۰,۰۰۰,۰۰۰"
												onChange={(e) => {
													const val = e.target.value;
													const formatted = formatWithGrouping(val, "fa-IR");
													form.setFieldValue("amount_rial", formatted);
													handleAmountChange(formatted, "amount_words");
												}}
											/>
										</Form.Item>
									</Col>
									<Col span={8}>
										<Form.Item
											name="amount_words"
											label={t("contract.additionalInfo.amountWords", "مبلغ به حروف")}
										>
											<Input placeholder="مثال: هفتصد میلیون ریال" />
										</Form.Item>
									</Col>
									<Col span={8}>
										<Form.Item
											name="equivalent_months"
											label={t("contract.additionalInfo.equivalentMonths", "معادل به ماه")}
										>
											<InputNumber className="w-full" min={1} max={120} placeholder="مثال: ۲" />
										</Form.Item>
									</Col>
								</Row>
							</>
						)}
					</DashedCard>

					{/* شرایط استرداد و یادداشت */}
					<Row gutter={16}>
						<Col span={12}>
							<Form.Item
								name="return_days_after_termination"
								label={t("contract.additionalInfo.returnDays", "مهلت استرداد پس از خاتمه قرارداد (روز)")}
								rules={[{ required: true, message: t("contract.additionalInfo.requiredField", "این فیلد الزامی است") }]}
								tooltip={t("contract.additionalInfo.returnDaysTooltip", "تاریخ استرداد برابر با تاریخ پایان واقعی قرارداد به اضافه این تعداد روز خواهد بود.")}
							>
								<InputNumber className="w-full" min={0} max={3650} />
							</Form.Item>
						</Col>
						<Col span={12}>
							<Form.Item
								name="note"
								label={t("contract.additionalInfo.note", "یادداشت و توضیحات تکمیلی")}
							>
								<Input.TextArea rows={1} placeholder="یادداشت‌های مرتبط با این تضمین..." />
							</Form.Item>
						</Col>
					</Row>

					{/* اتصال به الحاقیه در صورت الصاق */}
					{addendumGroupId && addendumService
						? (
							<Alert
								type="info"
								showIcon
								className="mt-1"
								message={(
									<span className="text-xs">
										این تضمین به الحاقیه با کد سرویس
										{" "}
										<strong>{addendumService}</strong>
										{" "}
										متصل خواهد شد.
									</span>
								)}
							/>
						)
						: null}
				</Form>
			</div>
		</Modal>
	);
}
