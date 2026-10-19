import { Tag } from "antd";

interface ContractApprovalStatusTagProps {
	/** true: approved, false: rejected, null/undefined: no decision yet. */
	value: boolean | null | undefined
}

export function ContractApprovalStatusTag({ value }: ContractApprovalStatusTagProps) {
	if (value === true)
		return <Tag bordered={false} color="success">تأیید شده</Tag>;
	if (value === false)
		return <Tag bordered={false} color="error">رد شده</Tag>;
	return <Tag bordered={false}>بدون تصمیم</Tag>;
}
