import type { HomeCardDef, HomeLinkIcon } from "#src/features/home/model/home-cards";
import type { CSSProperties, ReactNode } from "react";
import { formatCount } from "#src/features/dashboard/model/format";
import { homeDashboardQuery } from "#src/features/dashboard/queries/dashboard.queries";
import { pendingSignFlowsQuery } from "#src/features/home/queries/home.queries";
import { useAccess } from "#src/hooks";
import { SidebarCompanyIcon, SidebarContractIcon, SidebarPerformanceIcon, SidebarPredictIcon } from "#src/icons/local-icons";
import { useCardBorderColor } from "#src/shared/lib/use-card-border-color";
import {
	BarChartOutlined,
	EditOutlined,
	FileAddOutlined,
	FileTextOutlined,
	FileUnknownOutlined,
	LineChartOutlined,
	SnippetsOutlined,
	TableOutlined,
	TeamOutlined,
	UnorderedListOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Tag } from "antd";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { useHomeTones } from "./home-tones";
import { HomeCard } from "./HomeCard";

const LINK_ICONS: Record<HomeLinkIcon, ReactNode> = {
	add: <FileAddOutlined />,
	edit: <EditOutlined />,
	list: <UnorderedListOutlined />,
	table: <TableOutlined />,
	template: <SnippetsOutlined />,
	report: <BarChartOutlined />,
	unregistered: <FileUnknownOutlined />,
	company: <TeamOutlined />,
	traffic: <LineChartOutlined />,
	invoice: <FileTextOutlined />,
};

const CARD_ICONS: Record<HomeCardDef["key"], ReactNode> = {
	contracts: <SidebarContractIcon />,
	companies: <SidebarCompanyIcon />,
	performance: <SidebarPerformanceIcon />,
	predictions: <SidebarPredictIcon />,
};

/** Counters shown as tags in the card header; the backend omits them for users who cannot act on them. */
function useCardBadges(key: HomeCardDef["key"]) {
	const { t } = useTranslation();
	const dashboard = useQuery(homeDashboardQuery(undefined)).data;
	const pendingSignFlows = useQuery(pendingSignFlowsQuery()).data;
	const badges: string[] = [];
	const add = (messageKey: string, count: number | undefined) => {
		if (count && count > 0)
			badges.push(t(messageKey, { value: formatCount(count) }));
	};
	if (key === "contracts") {
		add("home.badges.pendingSign", pendingSignFlows);
		add("home.badges.pendingBusinessApproval", dashboard?.pending_business_approval_count);
		add("home.badges.pendingContractsOfficeApproval", dashboard?.pending_sign_approval_count);
	}
	if (key === "companies")
		add("home.badges.companies", dashboard?.total_companies_count);
	return badges;
}

export function HomeModuleCard({ card }: { card: HomeCardDef }) {
	const { t } = useTranslation();
	const { hasDomainPermission } = useAccess();
	const tones = useHomeTones();
	const borderColor = useCardBorderColor();
	const badges = useCardBadges(card.key);

	const links = card.links.filter(link => link.serviceCodes
		? link.serviceCodes.some(code => hasDomainPermission(link.domain, link.action, code))
		: hasDomainPermission(link.domain, link.action));
	if (links.length === 0)
		return null;

	return (
		<HomeCard
			tone={card.tone}
			icon={CARD_ICONS[card.key]}
			title={t(`home.cards.${card.key}.title`)}
			description={t(`home.cards.${card.key}.description`)}
			extra={badges.length > 0 && (
				<div className="flex flex-col items-end gap-1 shrink-0">
					{badges.map(label => <Tag key={label} className="m-0 text-xs">{label}</Tag>)}
				</div>
			)}
		>
			<div
				className={`grid grid-cols-1 sm:grid-cols-2 gap-4${links.length === 1 ? " my-auto" : ""}`}
				style={{ "--home-tone": tones[card.tone].color, "--home-tone-soft": tones[card.tone].soft, "--home-border": `color-mix(in srgb, ${tones[card.tone].color} 35%, ${borderColor})` } as CSSProperties}
			>
				{links.map(link => (
					<Link
						key={link.path}
						to={link.path}
						className="flex items-center justify-center gap-2 min-h-11 md:min-h-8 px-4 rounded-xl border border-solid border-[var(--home-border)] text-sm text-[var(--home-tone)] hover:bg-[var(--home-tone-soft)] transition-colors sm:odd:last:col-span-2"
					>
						{t(`home.links.${link.labelKey}`)}
						{LINK_ICONS[link.icon]}
					</Link>
				))}
			</div>
		</HomeCard>
	);
}
