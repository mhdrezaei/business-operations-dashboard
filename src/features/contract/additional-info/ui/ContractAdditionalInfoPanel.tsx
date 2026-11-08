import type { ContractServicePath } from "../../api/contracts.api";
import { toPersianDigits } from "#src/utils/formated";
import {
	CalendarOutlined,
	SafetyCertificateOutlined,
} from "@ant-design/icons";
import { Button, Card, Spin, Tag, theme } from "antd";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { GUARANTEE_TYPE_LABELS } from "../model/additional-info.types";
import { useContractAllGuarantees, useContractRealEnd } from "../queries/additional-info.queries";
import { ContractAdditionalInfoModal } from "./ContractAdditionalInfoModal";

interface Props {
	contractId: number
	serviceId?: number | null
	service?: ContractServicePath | string | null
	companyType?: string | null
	contractNumber?: string | null
	readOnly?: boolean
}

export function ContractAdditionalInfoPanel({
	contractId,
	serviceId,
	service,
	companyType,
	contractNumber,
	readOnly = false,
}: Props) {
	const { t } = useTranslation();
	const { token } = theme.useToken();
	const [modalOpen, setModalOpen] = useState(false);

	const {
		guarantees,
		isLoading: guaranteesLoading,
	} = useContractAllGuarantees(contractId);

	const {
		realEnd,
		isLoading: realEndLoading,
	} = useContractRealEnd(contractId);

	const loading = guaranteesLoading || realEndLoading;

	const formattedRealEnd = realEnd
		? toPersianDigits(`${realEnd.real_end_jy}/${String(realEnd.real_end_jm).padStart(2, "0")}/${String(realEnd.real_end_jd).padStart(2, "0")}`)
		: null;

	const guaranteesCount = guarantees.length;

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
							{t("contract.additionalInfo.panelTitle", "تضمین‌ها و تاریخ پایان واقعی")}
						</span>
					</div>
				)}
				extra={
					serviceId
						? (
							<Button
								type="link"
								size="small"
								onClick={() => setModalOpen(true)}
								className="p-0 font-medium"
							>
								{t("contract.additionalInfo.manage", "مدیریت")}
							</Button>
						)
						: null
				}
			>
				<Spin spinning={loading}>
					<div className="flex flex-col gap-3 py-1 text-xs">
						{/* Real End Date Summary */}
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-1.5 text-[var(--ant-color-text-secondary)]">
								<CalendarOutlined style={{ color: token.colorPrimary }} />
								<span>{t("contract.additionalInfo.realEnd", "تاریخ پایان واقعی:")}</span>
							</div>
							<div>
								{formattedRealEnd
									? (
										<Tag color="cyan" className="m-0 font-medium">
											{formattedRealEnd}
										</Tag>
									)
									: (
										<Tag color="default" className="m-0 text-[var(--ant-color-text-tertiary)]">
											{t("contract.additionalInfo.notSet", "ثبت نشده")}
										</Tag>
									)}
							</div>
						</div>

						{/* Guarantees Count Summary */}
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-1.5 text-[var(--ant-color-text-secondary)]">
								<SafetyCertificateOutlined style={{ color: token.colorPrimary }} />
								<span>{t("contract.additionalInfo.guaranteesCount", "تضمین‌های انجام تعهد:")}</span>
							</div>
							<div>
								{guaranteesCount > 0
									? (
										<Tag color="blue" className="m-0 font-bold">
											{toPersianDigits(String(guaranteesCount))}
											{" "}
											فقره
										</Tag>
									)
									: (
										<Tag color="default" className="m-0 text-[var(--ant-color-text-tertiary)]">
											{t("contract.additionalInfo.none", "بدون تضمین")}
										</Tag>
									)}
							</div>
						</div>

						{/* Type Breakdown if any */}
						{guaranteesCount > 0 && (
							<div className="mt-1 flex flex-wrap gap-1.5">
								{Object.entries(
									guarantees.reduce<Record<string, number>>((acc, g) => {
										acc[g.guarantee_type] = (acc[g.guarantee_type] || 0) + 1;
										return acc;
									}, {}),
								).map(([typeKey, count]) => (
									<Tag
										key={typeKey}
										bordered={false}
										className="m-0 text-[11px]"
										style={{
											backgroundColor: token.colorFillAlter,
											color: token.colorTextSecondary,
										}}
									>
										{GUARANTEE_TYPE_LABELS[typeKey as keyof typeof GUARANTEE_TYPE_LABELS] || typeKey}
										:
										{" "}
										{toPersianDigits(String(count))}
									</Tag>
								))}
							</div>
						)}

						{serviceId && (
							<Button
								block
								size="small"
								className="mt-2 text-xs"
								onClick={() => setModalOpen(true)}
							>
								{t("contract.additionalInfo.openModalButton", "مشاهده و مدیریت اطلاعات تکمیلی")}
							</Button>
						)}
					</div>
				</Spin>
			</Card>

			{serviceId && (
				<ContractAdditionalInfoModal
					open={modalOpen}
					onClose={() => setModalOpen(false)}
					contractId={contractId}
					serviceId={serviceId}
					servicePath={service}
					companyType={companyType}
					contractNumber={contractNumber}
					readOnly={readOnly}
				/>
			)}
		</>
	);
}
