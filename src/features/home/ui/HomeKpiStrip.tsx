import type { ReactNode } from "react";
import { formatCount } from "#src/features/dashboard/model/format";
import { homeDashboardQuery } from "#src/features/dashboard/queries/dashboard.queries";
import { pendingSignFlowsQuery } from "#src/features/home/queries/home.queries";
import {
	AuditOutlined,
	ClockCircleOutlined,
	FileTextOutlined,
	FileUnknownOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Card, Skeleton } from "antd";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { useHomeTones } from "./home-tones";

interface KpiCardProps {
	to: string
	icon: ReactNode
	title: string
	hint: string
	value: number | undefined
	loading: boolean
}

function KpiCard({ to, icon, title, hint, value, loading }: KpiCardProps) {
	const { primary } = useHomeTones();
	return (
		<Link to={to} className="block min-w-0 text-colorText">
			<Card hoverable className="h-full" classNames={{ body: "flex items-center gap-4" }}>
				<span
					className="grid place-items-center w-[50px] h-[50px] rounded-[10px] shrink-0 text-[26px]"
					style={{ color: primary.color, background: primary.soft }}
				>
					{icon}
				</span>
				<span className="flex flex-col gap-1 min-w-0">
					<span className="text-sm text-colorTextSecondary">{title}</span>
					{loading
						? <Skeleton.Input active size="small" className="!w-16 !min-w-0" />
						: <strong className="text-xl font-bold">{formatCount(value)}</strong>}
					<span className="text-xs text-colorTextTertiary">{hint}</span>
				</span>
			</Card>
		</Link>
	);
}

/** Counters of /home/dashboard/ plus the sign flows waiting for the user. */
export function HomeKpiStrip() {
	const { t } = useTranslation();
	const dashboardQ = useQuery(homeDashboardQuery(undefined));
	const signFlowsQ = useQuery(pendingSignFlowsQuery());
	const dashboard = dashboardQ.data;

	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
			<KpiCard
				to="/contracts/sign-flows"
				icon={<AuditOutlined />}
				title={t("home.kpi.signFlows.title")}
				hint={t("home.kpi.signFlows.hint")}
				value={signFlowsQ.data}
				loading={signFlowsQ.isPending}
			/>
			<KpiCard
				to="/performances/unregistered"
				icon={<FileUnknownOutlined />}
				title={t("home.kpi.unregistered.title")}
				hint={t("home.kpi.unregistered.hint")}
				value={dashboard?.unregistered_performances_count}
				loading={dashboardQ.isPending}
			/>
			<KpiCard
				to="/contracts/list"
				icon={<FileTextOutlined />}
				title={t("home.kpi.activeContracts.title")}
				hint={t("home.kpi.activeContracts.hint")}
				value={dashboard?.active_contracts_count}
				loading={dashboardQ.isPending}
			/>
			<KpiCard
				to="/contracts/list"
				icon={<ClockCircleOutlined />}
				title={t("home.kpi.expiring.title")}
				hint={t("home.kpi.expiring.hint")}
				value={dashboard?.expiring_contracts_next_3_months_count}
				loading={dashboardQ.isPending}
			/>
		</div>
	);
}
