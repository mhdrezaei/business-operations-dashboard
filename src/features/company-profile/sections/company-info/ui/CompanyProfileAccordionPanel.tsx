import { Collapse } from "antd";
import React from "react";

import FinanceProfilePanel from "./finance/FinanceProfilePanel";
import InternalProfilePanel from "./internal/InternalProfilePanel";
import LegalProfilePanel from "./legal/LegalProfilePanel";
import PublicProfilePanel from "./public/PublicProfilePanel";

interface CompanyProfileAccordionPanelProps {
	companyId: number
	canSeePublic: boolean
	canSeeLegal: boolean
	canSeeFinance: boolean
	canSeeInternal: boolean
}

export default function CompanyProfileAccordionPanel({
	companyId,
	canSeePublic,
	canSeeLegal,
	canSeeFinance,
	canSeeInternal,
}: CompanyProfileAccordionPanelProps) {
	const items = [] as NonNullable<React.ComponentProps<typeof Collapse>["items"]>;

	if (canSeePublic) {
		items.push({ key: "public", label: "اطلاعات عمومی شرکت", children: <PublicProfilePanel companyId={companyId} /> });
	}
	if (canSeeLegal) {
		items.push({ key: "legal", label: "اطلاعات ثبتی و حقوقی", children: <LegalProfilePanel companyId={companyId} /> });
	}
	if (canSeeFinance) {
		items.push({ key: "finance", label: "اطلاعات مالی", children: <FinanceProfilePanel companyId={companyId} /> });
	}
	if (canSeeInternal) {
		items.push({ key: "internal", label: "اطلاعات داخلی", children: <InternalProfilePanel companyId={companyId} /> });
	}

	if (!items.length) {
		return <div className="opacity-80">هیچ کارت اطلاعات شرکتی مجازی فعال نیست.</div>;
	}

	return (
		<Collapse
			defaultActiveKey={[String(items[0]?.key ?? "public")]}
			items={items}
		/>
	);
}
