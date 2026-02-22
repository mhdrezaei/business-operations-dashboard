import { Collapse } from "antd";
import React from "react";

import FinanceProfilePanel from "./finance/FinanceProfilePanel";
import InternalProfilePanel from "./internal/InternalProfilePanel";
import LegalProfilePanel from "./legal/LegalProfilePanel";
import PublicProfilePanel from "./public/PublicProfilePanel";

export default function CompanyProfileAccordionPanel({ companyId }: { companyId: number }) {
	return (
		<Collapse
			defaultActiveKey={["public"]}
			items={[
				{ key: "public", label: "اطلاعات عمومی شرکت", children: <PublicProfilePanel companyId={companyId} /> },
				{ key: "legal", label: "اطلاعات ثبتی و حقوقی", children: <LegalProfilePanel companyId={companyId} /> },
				{ key: "finance", label: "اطلاعات مالی", children: <FinanceProfilePanel companyId={companyId} /> },
				{ key: "internal", label: "اطلاعات داخلی", children: <InternalProfilePanel companyId={companyId} /> },
			]}
		/>
	);
}
