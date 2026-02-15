import type { CompanyProfileFormValues } from "../../model/company-profile.form.types";
import { Collapse } from "antd";
import React from "react";
import { useWatch } from "react-hook-form";
import BankAccountsPanel from "../../sections/bank-accounts/ui/BankAccountsPanel";
import CompanyInfoPanel from "../../sections/company-info/ui/CompanyInfoPanel";
import CompanyPeoplePanel from "../../sections/key-people/ui/CompanyPeoplePanel";
import ShareholdersPanel from "../../sections/shareholders/ui/ShareholdersPanel";

export default function CompanyProfileAccordion() {
	const companyId = useWatch<CompanyProfileFormValues, "companyId">({ name: "companyId" });

	return (
		<Collapse
			defaultActiveKey={["company-info"]}
			items={[
				{
					key: "company-info",
					label: "پروفایل شرکت",
					children: companyId ? <CompanyInfoPanel companyId={companyId} /> : null,
				},
				{
					key: "key-people",
					label: "اشخاص کلیدی",
					children: <CompanyPeoplePanel />,
				},
				{
					key: "shareholders",
					label: "سهام‌داران کلیدی",
					children: <ShareholdersPanel />,
				},
				{ key: "bank-accounts", label: "حساب‌های بانکی", children: <BankAccountsPanel /> },
				{ key: "documents", label: "مدارک شرکت", children: <div /> },
			]}
		/>
	);
}
