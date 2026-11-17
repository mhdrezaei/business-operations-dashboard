import type { ContractServicePath } from "../../api/contracts.api";
import type { GuaranteeAddendumOption, GuaranteesListQuery } from "../model/additional-info.types";
import { getContractAccessCompanyType } from "#src/features/contract/shared/model/company-type-options";
import { useAccess } from "#src/hooks";
import { SectionCard } from "#src/shared/ui/section-card";
import { toPersianDigits } from "#src/utils/formated";
import { SafetyCertificateOutlined } from "@ant-design/icons";
import { Modal } from "antd";
import React from "react";
import { useTranslation } from "react-i18next";
import { useContractAllGuarantees, useContractRealEnd } from "../queries/additional-info.queries";
import { GuaranteesTable } from "./guarantees/GuaranteesTable";
import { RealEndCard } from "./real-end/RealEndCard";

interface Props {
	open: boolean
	onClose: () => void
	contractId: number
	serviceId: number
	servicePath?: ContractServicePath | string | null
	companyType?: string | null
	contractNumber?: string | null
	addendumGroupId?: string | null
	addendumService?: string | null
	readOnly?: boolean
	addendumOptions?: GuaranteeAddendumOption[]
	/** contract: فقط تضمین‌های خودِ قرارداد (وقتی از ردیف قرارداد در لیست باز شده)؛ بدون مقدار: همه‌ی تضمین‌ها. */
	scope?: GuaranteesListQuery["scope"]
}

export function ContractAdditionalInfoModal({
	open,
	onClose,
	contractId,
	serviceId,
	servicePath,
	companyType,
	contractNumber,
	addendumGroupId,
	addendumService,
	readOnly = false,
	addendumOptions,
	scope,
}: Props) {
	const { t } = useTranslation();
	const { hasDomainPermissionByServiceId } = useAccess();

	const accessCompanyType = getContractAccessCompanyType(servicePath as any, companyType);
	const userCanView = hasDomainPermissionByServiceId("contracts", "view", serviceId, accessCompanyType);
	const userCanUpdate = hasDomainPermissionByServiceId("contracts", "update", serviceId, accessCompanyType);
	// According to spec: Delete requires BOTH view and delete permissions
	const userCanDelete = userCanView && hasDomainPermissionByServiceId("contracts", "delete", serviceId, accessCompanyType);

	const effectiveReadOnly = readOnly || !userCanUpdate;

	const {
		guarantees,
		isLoading: guaranteesLoading,
		isFetching: guaranteesFetching,
	} = useContractAllGuarantees(open ? contractId : null, addendumGroupId, addendumGroupId ? undefined : scope);

	const {
		realEnd,
		isLoading: realEndLoading,
		isFetching: realEndFetching,
	} = useContractRealEnd(open ? contractId : null);

	const displayContractTitle = contractNumber
		? `شماره ${toPersianDigits(contractNumber)}`
		: `شناسه ${toPersianDigits(String(contractId))}`;

	return (
		<Modal
			title={(
				<div className="flex items-center gap-2">
					<SafetyCertificateOutlined className="text-primary" />
					<span className="font-bold text-[var(--ant-color-text)]">
						{t("contract.additionalInfo.modalTitle", "اطلاعات تکمیلی و تضمین‌های انجام تعهد")}
						{" - "}
						{displayContractTitle}
						{addendumGroupId ? " (الحاقیه)" : ""}
					</span>
				</div>
			)}
			open={open}
			onCancel={onClose}
			footer={null}
			width={1050}
			destroyOnClose
		>
			<div dir="rtl" className="mt-4 flex flex-col gap-5">
				{/* بخش تاریخ پایان واقعی (فقط برای قرارداد اصلی، چون برای هر قرارداد فقط یکی است) */}
				{!addendumGroupId && (
					<SectionCard
						title="تاریخ پایان واقعی قرارداد"
						tone="blue"
						collapsible={false}
						defaultExpanded
					>
						<RealEndCard
							contractId={contractId}
							serviceId={serviceId}
							realEnd={realEnd}
							loading={realEndLoading || realEndFetching}
							canUpdate={userCanUpdate}
							canDelete={userCanDelete}
							readOnly={effectiveReadOnly}
						/>
					</SectionCard>
				)}

				{/* بخش تضمین‌های انجام تعهد */}
				<SectionCard
					title="تضمین‌های انجام تعهد"
					tone="primary"
					collapsible={false}
					defaultExpanded
				>
					<GuaranteesTable
						contractId={contractId}
						serviceId={serviceId}
						guarantees={guarantees}
						loading={guaranteesLoading || guaranteesFetching}
						canUpdate={userCanUpdate}
						canDelete={userCanDelete}
						readOnly={effectiveReadOnly}
						addendumGroupId={addendumGroupId}
						addendumService={addendumService}
						addendumOptions={addendumOptions}
					/>
				</SectionCard>
			</div>
		</Modal>
	);
}
