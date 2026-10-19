import type { ReactNode } from "react";
import { formatRial } from "#src/features/dashboard/model/format";
import { homeDashboardQuery } from "#src/features/dashboard/queries/dashboard.queries";
import { useAccess } from "#src/hooks";
import { FundOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "antd";
import { useTranslation } from "react-i18next";

import { HomeCard } from "./HomeCard";

function MoneyTile({ label, value, loading }: { label: ReactNode, value: unknown, loading: boolean }) {
	return (
		<div className="flex flex-col gap-1 p-4 rounded-lg bg-infoBg min-w-0">
			<span className="text-sm text-colorTextSecondary">{label}</span>
			{loading
				? <Skeleton.Input active size="small" className="!w-32 !min-w-0" />
				: <strong className="text-lg font-bold text-colorText">{formatRial(value)}</strong>}
		</div>
	);
}

/** Last month's real income/expense/profit and, when the user may see them, the forecast. */
export function HomeFinanceCard() {
	const { t } = useTranslation();
	const { hasDomainPermission } = useAccess();
	const dashboardQ = useQuery(homeDashboardQuery(undefined));
	if (!hasDomainPermission("performances", "view"))
		return null;

	const actual = dashboardQ.data?.income_expense_profit_last_month;
	const forecast = dashboardQ.data?.predictions_income_expense_last_month;
	const loading = dashboardQ.isPending;

	return (
		<HomeCard
			tone="primary"
			icon={<FundOutlined />}
			title={t("home.finance.title")}
			description={t("home.finance.description")}
		>
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<MoneyTile label={t("home.finance.income")} value={actual?.income} loading={loading} />
				<MoneyTile label={t("home.finance.expense")} value={actual?.expense} loading={loading} />
				<MoneyTile label={t("home.finance.profit")} value={actual?.profit} loading={loading} />
			</div>
			{forecast && (
				<>
					<h4 className="m-0 text-sm font-bold text-colorTextSecondary">{t("home.finance.predictionsTitle")}</h4>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<MoneyTile label={t("home.finance.predictedIncome")} value={forecast.income} loading={false} />
						<MoneyTile label={t("home.finance.predictedExpense")} value={forecast.expense} loading={false} />
						<MoneyTile label={t("home.finance.predictedProfit")} value={forecast.profit} loading={false} />
					</div>
				</>
			)}
		</HomeCard>
	);
}
