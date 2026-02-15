import type { CompanyProfileFormValues } from "../../model/company-profile.form.types";
import { Collapse } from "antd";
import React from "react";
import { useWatch } from "react-hook-form";
import CompanyInfoPanel from "../../sections/company-info/ui/CompanyInfoPanel";

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
				{ key: "key-people", label: "اشخاص کلیدی", children: <div /> },
				{ key: "shareholders", label: "سهام‌داران کلیدی", children: <div /> },
				{ key: "bank-accounts", label: "حساب‌های بانکی", children: <div /> },
				{ key: "documents", label: "مدارک شرکت", children: <div /> },
			]}
		/>
	);
}
