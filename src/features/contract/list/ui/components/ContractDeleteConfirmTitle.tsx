import type { ContractDeleteWarning } from "../../model/contract-list";
import { Typography } from "antd";
import { useTranslation } from "react-i18next";

interface ContractDeleteConfirmTitleProps {
	title: string
	warnings: ContractDeleteWarning[]
}

export function ContractDeleteConfirmTitle({ title, warnings }: ContractDeleteConfirmTitleProps) {
	const { t } = useTranslation();

	return (
		<div className="flex max-w-72 flex-col gap-1">
			<span>{title}</span>
			{warnings.map(warning => (
				<Typography.Text key={warning} type="warning">{t(`contract.list.deleteWarning.${warning}`)}</Typography.Text>
			))}
		</div>
	);
}
