import { Tag } from "antd";
import { useTranslation } from "react-i18next";

interface ContractApprovalStatusTagProps {
	/** true: approved, false: rejected, null/undefined: no decision yet. */
	value: boolean | null | undefined
	/** Label of the "no decision yet" state. */
	pendingLabel?: string
	/** Label of the `false` state. */
	rejectedLabel?: string
}

export function ContractApprovalStatusTag({ value, pendingLabel, rejectedLabel }: ContractApprovalStatusTagProps) {
	const { t } = useTranslation();
	if (value === true)
		return <Tag bordered={false} color="success">{t("contract.list.approval.approved")}</Tag>;
	if (value === false)
		return <Tag bordered={false} color="error">{rejectedLabel ?? t("contract.list.approval.rejected")}</Tag>;
	return <Tag bordered={false}>{pendingLabel ?? t("contract.list.approval.undecided")}</Tag>;
}
