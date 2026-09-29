import React from "react";
import FinanceProfilePanel from "./finance/FinanceProfilePanel";

import InternalProfilePanel from "./internal/InternalProfilePanel";
import LegalProfilePanel from "./legal/LegalProfilePanel";
import PublicProfilePanel from "./public/PublicProfilePanel";
import "#src/shared/ui/form-layout/styles.css";

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
	if (!canSeePublic && !canSeeLegal && !canSeeFinance && !canSeeInternal) {
		return <div className="opacity-80">هیچ کارت اطلاعات شرکتی مجازی فعال نیست.</div>;
	}

	return (
		<div className="company-profile-sections">
			{canSeePublic ? <PublicProfilePanel companyId={companyId} /> : null}
			{canSeeLegal ? <LegalProfilePanel companyId={companyId} /> : null}
			{canSeeFinance ? <FinanceProfilePanel companyId={companyId} /> : null}
			{canSeeInternal ? <InternalProfilePanel companyId={companyId} /> : null}
		</div>
	);
}
