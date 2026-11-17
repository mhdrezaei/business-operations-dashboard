import type { ColumnsType } from "antd/es/table";
import type {
	GuaranteeAddendumOption,
	GuaranteeRecord,
	GuaranteeType,
} from "../../model/additional-info.types";
import { formatJalaliIsoDate } from "#src/shared/lib/jalali-intl";
import { formatNumeric, toPersianDigits } from "#src/utils/formated";
import {
	BankOutlined,
	CheckCircleOutlined,
	ClockCircleOutlined,
	CopyOutlined,
	DeleteOutlined,
	EditOutlined,
	FileProtectOutlined,
	FileTextOutlined,
	PlusOutlined,
	SafetyCertificateOutlined,
	TransactionOutlined,
} from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import {
	Button,
	Card,
	Empty,
	message,
	Modal,
	Popconfirm,
	Space,
	Table,
	Tabs,
	Tag,
	theme,
	Tooltip,
} from "antd";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { deleteGuarantee } from "../../api/additional-info.api";
import { GUARANTEE_TYPE_LABELS, GUARANTEE_TYPES } from "../../model/additional-info.types";
import { invalidateContractAdditionalInfo } from "../../queries/additional-info.queries";
import { GuaranteeFormModal } from "./GuaranteeFormModal";

interface Props {
	contractId: number
	serviceId: number
	guarantees: GuaranteeRecord[]
	loading?: boolean
	canUpdate?: boolean
	canDelete?: boolean
	readOnly?: boolean
	addendumGroupId?: string | null
	addendumService?: string | null
	addendumOptions?: GuaranteeAddendumOption[]
}

export function GuaranteesTable({
	contractId,
	serviceId,
	guarantees,
	loading = false,
	canUpdate = true,
	canDelete = true,
	readOnly = false,
	addendumGroupId,
	addendumService,
	addendumOptions,
}: Props) {
	const { t } = useTranslation();
	const { token } = theme.useToken();
	const queryClient = useQueryClient();
	const [activeTypeTab, setActiveTypeTab] = useState<string>("ALL");
	const [formModalOpen, setFormModalOpen] = useState(false);
	const [editingRecord, setEditingRecord] = useState<GuaranteeRecord | null>(null);
	const [selectedTypeForCreate, setSelectedTypeForCreate] = useState<GuaranteeType>("CHECK");
	const [renderedTextModal, setRenderedTextModal] = useState<string | null>(null);
	const [deletingId, setDeletingId] = useState<number | null>(null);

	const filteredGuarantees = guarantees.filter((g) => {
		if (activeTypeTab === "ALL")
			return true;
		return g.guarantee_type === activeTypeTab;
	});

	const handleDelete = async (record: GuaranteeRecord) => {
		try {
			setDeletingId(record.id);
			await deleteGuarantee(record.id, record.guarantee_type);
			message.success(t("contract.additionalInfo.guaranteeDeleted", "تضمین انجام تعهد با موفقیت حذف شد."));
			invalidateContractAdditionalInfo(queryClient, contractId);
		}
		catch (err: any) {
			let msg = err?.message || t("contract.form.submitError", "خطا در حذف تضمین انجام تعهد");
			try {
				if (typeof err?.response?.json === "function") {
					const data = await err.response.json();
					if (data?.detail)
						msg = data.detail;
				}
			}
			catch {}
			message.error(msg);
		}
		finally {
			setDeletingId(null);
		}
	};

	const columns: ColumnsType<GuaranteeRecord> = [
		{
			title: t("contract.additionalInfo.guaranteeType", "نوع تضمین"),
			dataIndex: "guarantee_type",
			key: "guarantee_type",
			width: 150,
			render: (type: GuaranteeType, record) => {
				let color = "blue";
				let icon = <FileProtectOutlined />;
				if (type === "CHECK") {
					color = "cyan";
					icon = <TransactionOutlined />;
				}
				else if (type === "PROMISSORY_NOTE") {
					color = "purple";
					icon = <FileTextOutlined />;
				}
				else if (type === "BANK_GUARANTEE") {
					color = "gold";
					icon = <BankOutlined />;
				}
				else if (type === "DEPOSIT_RECEIPT") {
					color = "green";
					icon = <CheckCircleOutlined />;
				}

				return (
					<div className="flex flex-col items-start gap-1">
						<Tag color={color} icon={icon} className="m-0 px-2 py-0.5 font-medium">
							{record.guarantee_type_label || GUARANTEE_TYPE_LABELS[type] || type}
						</Tag>
						<span className="text-xs text-[var(--ant-color-text-tertiary)]">
							{record.addendum_group_id
								? t("contract.additionalInfo.guaranteeScopeAddendum", { number: toPersianDigits(record.addendum_number ?? "") }).trim()
								: t("contract.additionalInfo.guaranteeScopeContract")}
						</span>
					</div>
				);
			},
		},
		{
			title: t("contract.additionalInfo.specifications", "مشخصات و شماره"),
			key: "specs",
			width: 220,
			render: (_, record) => {
				if (record.guarantee_type === "CHECK") {
					return (
						<div className="flex flex-col text-xs leading-5">
							<span>
								<strong className="text-[var(--ant-color-text-secondary)]">{t("contract.additionalInfo.checkNumber", "شماره چک صیادی:")}</strong>
								{" "}
								<span className="font-semibold text-[var(--ant-color-text)]">{toPersianDigits(record.check_number || "—")}</span>
							</span>
							<span className="text-[var(--ant-color-text-tertiary)]">
								{record.issuing_bank}
								{" "}
								- شعبه
								{" "}
								{record.bank_branch}
								{" "}
								{record.branch_code ? `(کد: ${toPersianDigits(record.branch_code)})` : ""}
							</span>
						</div>
					);
				}
				if (record.guarantee_type === "PROMISSORY_NOTE") {
					const notes = Array.isArray(record.notes_numbers) ? record.notes_numbers : [];
					return (
						<div className="flex flex-col text-xs leading-5">
							<span>
								<strong className="text-[var(--ant-color-text-secondary)]">تعداد سفته:</strong>
								{" "}
								<span className="font-semibold text-[var(--ant-color-text)]">
									{toPersianDigits(String(record.notes_count || notes.length || 1))}
									{" "}
									فقره
								</span>
							</span>
							{notes.length > 0 && (
								<Tooltip title={notes.map(toPersianDigits).join(" ، ")}>
									<span className="line-clamp-1 text-[var(--ant-color-text-tertiary)]">
										شماره‌ها:
										{" "}
										{notes.map(toPersianDigits).join(" ، ")}
									</span>
								</Tooltip>
							)}
						</div>
					);
				}
				if (record.guarantee_type === "BANK_GUARANTEE") {
					return (
						<div className="flex flex-col text-xs leading-5">
							<span>
								<strong className="text-[var(--ant-color-text-secondary)]">حداقل دوره اعتبار:</strong>
								{" "}
								<span className="font-semibold text-[var(--ant-color-text)]">
									{toPersianDigits(String(record.min_validity_period || 0))}
									{" "}
									روز
								</span>
							</span>
							{record.guarantee_percent
								? (
									<span className="text-[var(--ant-color-text-tertiary)]">
										درصد از مبلغ قرارداد:
										{" "}
										{toPersianDigits(String(record.guarantee_percent))}
										%
									</span>
								)
								: null}
						</div>
					);
				}
				if (record.guarantee_type === "DEPOSIT_RECEIPT") {
					return (
						<div className="flex flex-col text-xs leading-5">
							<span>
								<strong className="text-[var(--ant-color-text-secondary)]">شماره فیش:</strong>
								{" "}
								<span className="font-semibold text-[var(--ant-color-text)]">{toPersianDigits(record.receipt_number || "—")}</span>
							</span>
							<span className="text-[var(--ant-color-text-tertiary)]">
								{record.issuing_bank}
								{" "}
								- شعبه
								{" "}
								{record.bank_branch}
							</span>
						</div>
					);
				}
				return "—";
			},
		},
		{
			title: t("contract.additionalInfo.amount", "مبلغ (ریال)"),
			key: "amount",
			width: 200,
			render: (_, record) => {
				const amount = record.guarantee_type === "PROMISSORY_NOTE" ? record.total_amount_rial : record.amount_rial;
				const words = record.guarantee_type === "PROMISSORY_NOTE" ? record.total_amount_words : record.amount_words;

				return (
					<div className="flex flex-col text-xs leading-5">
						<span className="font-bold text-[var(--ant-color-text)]">
							{amount ? `${toPersianDigits(formatNumeric(amount))} ریال` : "—"}
						</span>
						{words
							? (
								<Tooltip title={words}>
									<span className="line-clamp-1 text-[11px] text-[var(--ant-color-text-secondary)]">
										{words}
									</span>
								</Tooltip>
							)
							: null}
					</div>
				);
			},
		},
		{
			title: t("contract.additionalInfo.issueDate", "تاریخ صدور"),
			key: "issue_date",
			width: 120,
			align: "center",
			render: (_, record) => {
				if (record.issue_jy && record.issue_jm && record.issue_jd) {
					return toPersianDigits(`${record.issue_jy}/${String(record.issue_jm).padStart(2, "0")}/${String(record.issue_jd).padStart(2, "0")}`);
				}
				return formatJalaliIsoDate(record.issue_date || "") || "—";
			},
		},
		{
			title: t("contract.additionalInfo.returnDate", "استرداد تضمین"),
			key: "return_date",
			width: 180,
			align: "center",
			render: (_, record) => {
				const daysText = `${toPersianDigits(String(record.return_days_after_termination))} روز پس از پایان قرارداد`;
				if (record.return_date) {
					return (
						<div className="flex flex-col items-center gap-0.5 text-xs">
							<Tag color="success" className="m-0 font-medium">
								{formatJalaliIsoDate(record.return_date)}
							</Tag>
							<span className="text-[10px] text-[var(--ant-color-text-tertiary)]">{daysText}</span>
						</div>
					);
				}
				return (
					<Tooltip title={t("contract.additionalInfo.returnDateNullHelp", "با ثبت تاریخ پایان واقعی قرارداد، این تاریخ به‌صورت خودکار محاسبه و درج می‌شود.")}>
						<div className="flex flex-col items-center gap-0.5 text-xs">
							<Tag color="warning" icon={<ClockCircleOutlined />} className="m-0">
								{t("contract.additionalInfo.waitingForRealEnd", "منوط به ثبت تاریخ پایان واقعی")}
							</Tag>
							<span className="text-[10px] text-[var(--ant-color-text-tertiary)]">{daysText}</span>
						</div>
					</Tooltip>
				);
			},
		},
		{
			title: t("contract.additionalInfo.legalText", "متن حقوقی"),
			key: "rendered_text",
			width: 110,
			align: "center",
			render: (_, record) => {
				if (!record.rendered_text) {
					return <span className="text-[var(--ant-color-text-tertiary)]">—</span>;
				}
				return (
					<Button
						type="link"
						size="small"
						icon={<FileTextOutlined />}
						onClick={() => setRenderedTextModal(record.rendered_text ?? null)}
					>
						{t("contract.additionalInfo.viewText", "مشاهده متن")}
					</Button>
				);
			},
		},
		{
			title: t("common.action", "عملیات"),
			key: "actions",
			width: 110,
			align: "center",
			render: (_, record) => {
				if (readOnly)
					return "—";
				return (
					<Space size="small">
						{canUpdate && (
							<Tooltip title={t("common.edit", "ویرایش")}>
								<Button
									type="text"
									size="small"
									icon={<EditOutlined style={{ color: token.colorPrimary }} />}
									onClick={() => {
										setEditingRecord(record);
										setSelectedTypeForCreate(record.guarantee_type);
										setFormModalOpen(true);
									}}
								/>
							</Tooltip>
						)}
						{canDelete && (
							<Popconfirm
								title={t("contract.additionalInfo.deleteGuaranteeConfirmTitle", "حذف تضمین انجام تعهد")}
								description={t("contract.additionalInfo.deleteGuaranteeConfirmDesc", "آیا از حذف این تضمین اطمینان دارید؟")}
								okText={t("common.confirm", "تأیید")}
								cancelText={t("common.cancel", "انصراف")}
								okButtonProps={{ danger: true, loading: deletingId === record.id }}
								onConfirm={() => handleDelete(record)}
							>
								<Tooltip title={t("common.delete", "حذف")}>
									<Button
										type="text"
										size="small"
										danger
										icon={<DeleteOutlined />}
									/>
								</Tooltip>
							</Popconfirm>
						)}
					</Space>
				);
			},
		},
	];

	const tabItems = [
		{ key: "ALL", label: `همه (${toPersianDigits(String(guarantees.length))})` },
		...GUARANTEE_TYPES.map((type) => {
			const count = guarantees.filter(g => g.guarantee_type === type).length;
			return {
				key: type,
				label: `${GUARANTEE_TYPE_LABELS[type]} (${toPersianDigits(String(count))})`,
			};
		}),
	];

	return (
		<>
			<Card
				size="small"
				style={{
					borderRadius: token.borderRadiusLG,
					borderColor: token.colorBorderSecondary,
					backgroundColor: token.colorBgContainer,
				}}
				title={(
					<div className="flex items-center gap-2">
						<SafetyCertificateOutlined style={{ color: token.colorPrimary }} />
						<span className="font-semibold text-[var(--ant-color-text)]">
							{t("contract.additionalInfo.guaranteesTitle", "تضمین‌های انجام تعهد")}
						</span>
					</div>
				)}
				extra={
					!readOnly && canUpdate
						? (
							<Button
								type="primary"
								size="small"
								icon={<PlusOutlined />}
								onClick={() => {
									setEditingRecord(null);
									setSelectedTypeForCreate(activeTypeTab !== "ALL" ? (activeTypeTab as GuaranteeType) : "CHECK");
									setFormModalOpen(true);
								}}
							>
								{t("contract.additionalInfo.addGuarantee", "افزودن تضمین جدید")}
							</Button>
						)
						: null
				}
			>
				<div className="flex flex-col gap-3">
					<Tabs
						activeKey={activeTypeTab}
						onChange={setActiveTypeTab}
						items={tabItems}
						size="small"
						className="[&_.ant-tabs-nav]:mb-2"
					/>

					<Table
						rowKey="id"
						columns={columns}
						dataSource={filteredGuarantees}
						loading={loading}
						pagination={false}
						size="small"
						bordered
						locale={{
							emptyText: (
								<Empty
									image={Empty.PRESENTED_IMAGE_SIMPLE}
									description={t("contract.additionalInfo.noGuarantees", "هیچ تضمینی برای این قرارداد ثبت نشده است.")}
								/>
							),
						}}
					/>
				</div>
			</Card>

			{/* Modal for creating/editing guarantees */}
			<GuaranteeFormModal
				open={formModalOpen}
				onClose={() => {
					setFormModalOpen(false);
					setEditingRecord(null);
				}}
				contractId={contractId}
				serviceId={serviceId}
				initialType={selectedTypeForCreate}
				initialRecord={editingRecord}
				addendumGroupId={addendumGroupId}
				addendumService={addendumService}
				addendumOptions={addendumOptions}
			/>

			{/* Modal for viewing rendered legal text */}
			<Modal
				title={t("contract.additionalInfo.renderedTextTitle", "متن حقوقی تضمین انجام تعهد")}
				open={Boolean(renderedTextModal)}
				onCancel={() => setRenderedTextModal(null)}
				footer={[
					<Button
						key="copy"
						icon={<CopyOutlined />}
						onClick={() => {
							if (renderedTextModal) {
								navigator.clipboard.writeText(renderedTextModal);
								message.success(t("common.copied", "متن کپی شد"));
							}
						}}
					>
						{t("common.copy", "کپی متن")}
					</Button>,
					<Button key="close" type="primary" onClick={() => setRenderedTextModal(null)}>
						{t("common.close", "بستن")}
					</Button>,
				]}
			>
				<div
					dir="rtl"
					className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-xl border border-[var(--ant-color-border-secondary)] bg-[var(--ant-color-fill-alter)] p-4 text-sm leading-8 text-[var(--ant-color-text)]"
				>
					{renderedTextModal}
				</div>
			</Modal>
		</>
	);
}
