import type { RealEndRecord } from "../../model/additional-info.types";
import { toPersianDigits } from "#src/utils/formated";
import {
	CalendarOutlined,
	CheckCircleOutlined,
	DeleteOutlined,
	EditOutlined,
	InfoCircleOutlined,
	PlusOutlined,
} from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import {
	Alert,
	Button,
	Card,
	message,
	Popconfirm,
	Space,
	Spin,
	Tag,
	theme,
} from "antd";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { deleteRealEnd } from "../../api/additional-info.api";
import { invalidateContractAdditionalInfo } from "../../queries/additional-info.queries";
import { RealEndDateModal } from "./RealEndDateModal";

interface Props {
	contractId: number
	serviceId: number
	realEnd: RealEndRecord | null
	loading?: boolean
	canUpdate?: boolean
	canDelete?: boolean
	readOnly?: boolean
}

export function RealEndCard({
	contractId,
	serviceId,
	realEnd,
	loading = false,
	canUpdate = true,
	canDelete = true,
	readOnly = false,
}: Props) {
	const { t } = useTranslation();
	const { token } = theme.useToken();
	const queryClient = useQueryClient();
	const [modalOpen, setModalOpen] = useState(false);
	const [deleting, setDeleting] = useState(false);

	const handleDelete = async () => {
		if (!realEnd)
			return;
		try {
			setDeleting(true);
			await deleteRealEnd(realEnd.id);
			message.success(t("contract.additionalInfo.realEndDeleted", "تاریخ پایان واقعی حذف شد و تاریخ استرداد تضمین‌ها پاک گردید."));
			invalidateContractAdditionalInfo(queryClient, contractId);
		}
		catch (err: any) {
			let msg = err?.message || t("contract.form.submitError", "خطا در حذف تاریخ پایان واقعی");
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
			setDeleting(false);
		}
	};

	const formattedJalali = realEnd
		? toPersianDigits(`${realEnd.real_end_jy}/${String(realEnd.real_end_jm).padStart(2, "0")}/${String(realEnd.real_end_jd).padStart(2, "0")}`)
		: null;

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
						<CalendarOutlined style={{ color: token.colorPrimary }} />
						<span className="font-semibold text-[var(--ant-color-text)]">
							{t("contract.additionalInfo.realEndSectionTitle", "تاریخ پایان واقعی قرارداد")}
						</span>
					</div>
				)}
				extra={
					!readOnly && canUpdate && !realEnd
						? (
							<Button
								type="primary"
								size="small"
								icon={<PlusOutlined />}
								onClick={() => setModalOpen(true)}
							>
								{t("contract.additionalInfo.addRealEnd", "ثبت تاریخ پایان")}
							</Button>
						)
						: null
				}
			>
				<Spin spinning={loading || deleting}>
					{realEnd
						? (
							<div className="flex flex-col gap-3 py-1 sm:flex-row sm:items-center sm:justify-between">
								<div className="flex flex-wrap items-center gap-2.5">
									<Tag color="success" icon={<CheckCircleOutlined />}>
										{t("contract.additionalInfo.realEndRegistered", "ثبت شده")}
									</Tag>
									<span className="text-xs text-[var(--ant-color-text-secondary)]">
										{t("contract.additionalInfo.jalaliDate", "تاریخ شمسی:")}
									</span>
									<span className="text-sm font-bold text-[var(--ant-color-text)]">
										{formattedJalali}
									</span>
									{realEnd.real_end_date
										? (
											<span className="text-xs text-[var(--ant-color-text-tertiary)]">
												(معادل میلادی:
												{" "}
												{toPersianDigits(realEnd.real_end_date)}
												)
											</span>
										)
										: null}
								</div>

								{!readOnly
									? (
										<Space size="small">
											{canUpdate
												? (
													<Button
														size="small"
														icon={<EditOutlined />}
														onClick={() => setModalOpen(true)}
													>
														{t("common.edit", "ویرایش")}
													</Button>
												)
												: null}

											{canDelete
												? (
													<Popconfirm
														title={t("contract.additionalInfo.deleteRealEndConfirmTitle", "حذف تاریخ پایان واقعی")}
														description={t(
															"contract.additionalInfo.deleteRealEndConfirmDesc",
															"با حذف این تاریخ، تاریخ استرداد تمام تضمین‌های متصل به این قرارداد پاک خواهد شد. آیا مطمئنید؟",
														)}
														okText={t("common.confirm", "تأیید")}
														cancelText={t("common.cancel", "انصراف")}
														okButtonProps={{ danger: true }}
														onConfirm={handleDelete}
													>
														<Button size="small" danger icon={<DeleteOutlined />}>
															{t("common.delete", "حذف")}
														</Button>
													</Popconfirm>
												)
												: null}
										</Space>
									)
									: null}
							</div>
						)
						: (
							<Alert
								type="info"
								showIcon
								icon={<InfoCircleOutlined />}
								message={t(
									"contract.additionalInfo.realEndMissingNotice",
									"تاریخ پایان واقعی برای این قرارداد هنوز ثبت نشده است. تا زمان ثبت این تاریخ، تاریخ استرداد تضمین‌ها محاسبه نمی‌شود.",
								)}
							/>
						)}
				</Spin>
			</Card>

			<RealEndDateModal
				open={modalOpen}
				onClose={() => setModalOpen(false)}
				contractId={contractId}
				serviceId={serviceId}
				initialRecord={realEnd}
			/>
		</>
	);
}
