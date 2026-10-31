import type { ContractListItemType } from "../../model/contracts.list.types";
import { Tag } from "antd";
import { useTranslation } from "react-i18next";
import { getOfficeApproval } from "../../model/contract-list";

interface ContractOfficeApprovalTagProps {
	contract: Pick<ContractListItemType, "is_signed" | "is_business_approved">
}

/** Derived «تأیید قرارداد» badge: contracts have no rejection, null is never approved. */
export function ContractOfficeApprovalTag({ contract }: ContractOfficeApprovalTagProps) {
	const { t } = useTranslation();
	const state = getOfficeApproval(contract);
	if (state === "approved")
		return <Tag bordered={false} color="success">{t("contract.list.approval.approved")}</Tag>;
	if (state === "waiting")
		return <Tag bordered={false} color="warning">{t("contract.list.approval.waiting")}</Tag>;
	return <Tag bordered={false}>{t("contract.list.approval.waitingBusiness")}</Tag>;
}
