import type { CompanyProfileFormValues } from "../../model/company-profile.form.types";
import { useAccess } from "#src/hooks";
import { Collapse } from "antd";
import React from "react";
import { useWatch } from "react-hook-form";
import BankAccountsPanel from "../../sections/bank-accounts/ui/BankAccountsPanel";
import CompanyProfileAccordionPanel from "../../sections/company-info/ui/CompanyProfileAccordionPanel";
import CompanyDocumentsPanel from "../../sections/documents/ui/CompanyDocumentsPanel";
import CompanyPeoplePanel from "../../sections/key-people/ui/CompanyPeoplePanel";
import ShareholdersPanel from "../../sections/shareholders/ui/ShareholdersPanel";

export default function CompanyProfileAccordion() {
	const { hasCompanyCardAccess } = useAccess();
	const companyId = useWatch<CompanyProfileFormValues, "companyId">({ name: "companyId" });

	const canSeePublic = hasCompanyCardAccess("company_public_profiles");
	const canSeeLegal = hasCompanyCardAccess("company_legal_profiles");
	const canSeeFinance = hasCompanyCardAccess("company_finance_profiles");
	const canSeeInternal = hasCompanyCardAccess("company_internal_profiles");

	const canSeeCompanyInfo = canSeePublic || canSeeLegal || canSeeFinance || canSeeInternal;
	const canSeePeople = hasCompanyCardAccess("company_people");
	const canSeeShareholders = hasCompanyCardAccess("company_shareholders");
	const canSeeBankAccounts = hasCompanyCardAccess("company_bank_accounts");
	const canSeeDocuments = hasCompanyCardAccess("company_documents");

	const items = [] as NonNullable<React.ComponentProps<typeof Collapse>["items"]>;

	if (canSeeCompanyInfo) {
		items.push({
			key: "company-info",
			label: "پروفایل شرکت",
			children: companyId
				? (
					<CompanyProfileAccordionPanel
						companyId={companyId}
						canSeePublic={canSeePublic}
						canSeeLegal={canSeeLegal}
						canSeeFinance={canSeeFinance}
						canSeeInternal={canSeeInternal}
					/>
				)
				: null,
		});
	}

	if (canSeePeople) {
		items.push({ key: "key-people", label: "اشخاص کلیدی", children: <CompanyPeoplePanel /> });
	}

	if (canSeeShareholders) {
		items.push({ key: "shareholders", label: "سهام‌داران کلیدی", children: <ShareholdersPanel /> });
	}

	if (canSeeBankAccounts) {
		items.push({ key: "bank-accounts", label: "حساب‌های بانکی", children: <BankAccountsPanel /> });
	}

	if (canSeeDocuments) {
		items.push({ key: "documents", label: "مدارک شرکت", children: <CompanyDocumentsPanel /> });
	}

	if (!items.length) {
		return <div style={{ opacity: 0.8 }}>هیچ کارت مجازی برای این کاربر فعال نیست.</div>;
	}

	return (
		<Collapse
			defaultActiveKey={[String(items[0]?.key ?? "company-info")]}
			accordion
			items={items}
		/>
	);
}
