import type { CSSProperties } from "react";
import type { CompanyProfileFormValues } from "../../model/company-profile.form.types";
import { useAccess } from "#src/hooks";
import { useQuery } from "@tanstack/react-query";
import { Empty, Tabs, theme } from "antd";
import React from "react";
import { useWatch } from "react-hook-form";
import { servicesQuery } from "../../queries/company-profile.queries";
import BankAccountsPanel from "../../sections/bank-accounts/ui/BankAccountsPanel";
import CompanyProfileAccordionPanel from "../../sections/company-info/ui/CompanyProfileAccordionPanel";
import CompanyDocumentsPanel from "../../sections/documents/ui/CompanyDocumentsPanel";
import CompanyPeoplePanel from "../../sections/key-people/ui/CompanyPeoplePanel";
import ShareholdersPanel from "../../sections/shareholders/ui/ShareholdersPanel";
import SmsGatewayMappingPanel from "../../sections/sms-gateway/ui/SmsGatewayMappingPanel";
import { useCompanyTabsScroll } from "./use-company-tabs-scroll";
import "./company-profile-tabs.css";

interface CompanyProfileAccordionProps {
	revision?: number
}

export default function CompanyProfileAccordion({ revision = 0 }: CompanyProfileAccordionProps) {
	const { token } = theme.useToken();
	const { hasCompanyCardAccess } = useAccess();
	const companyId = useWatch<CompanyProfileFormValues, "companyId">({ name: "companyId" });
	const serviceId = useWatch<CompanyProfileFormValues, "serviceId">({ name: "serviceId" });
	const services = useQuery(servicesQuery());
	const selectedServiceCode = String(
		services.data?.results?.find(service => service.id === serviceId)?.code ?? "",
	).trim().toLowerCase();
	const canSeeSmsGateway = ["sms", "sms-commission", "sms_commission"].includes(selectedServiceCode);

	const canSeePublic = hasCompanyCardAccess("company_public_profiles");
	const canSeeLegal = hasCompanyCardAccess("company_legal_profiles");
	const canSeeFinance = hasCompanyCardAccess("company_finance_profiles");
	const canSeeInternal = hasCompanyCardAccess("company_internal_profiles");

	const canSeeCompanyInfo = canSeePublic || canSeeLegal || canSeeFinance || canSeeInternal;
	const canSeePeople = hasCompanyCardAccess("company_people");
	const canSeeShareholders = hasCompanyCardAccess("company_shareholders");
	const canSeeBankAccounts = hasCompanyCardAccess("company_bank_accounts");
	const canSeeDocuments = hasCompanyCardAccess("company_documents");

	const items = [] as NonNullable<React.ComponentProps<typeof Tabs>["items"]>;

	if (canSeeCompanyInfo) {
		items.push({
			key: "company-info",
			label: "پروفایل شرکت",
			children: companyId
				? (
					<CompanyProfileAccordionPanel
						key={`company-info-${revision}`}
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
		items.push({ key: "key-people", label: "اشخاص کلیدی", children: <CompanyPeoplePanel key={`people-${revision}`} /> });
	}

	if (canSeeShareholders) {
		items.push({ key: "shareholders", label: "سهام‌داران کلیدی", children: <ShareholdersPanel key={`shareholders-${revision}`} /> });
	}

	if (canSeeBankAccounts) {
		items.push({ key: "bank-accounts", label: "حساب‌های بانکی", children: <BankAccountsPanel key={`bank-accounts-${revision}`} /> });
	}

	if (canSeeDocuments) {
		items.push({ key: "documents", label: "مدارک شرکت", children: <CompanyDocumentsPanel /> });
	}

	if (canSeeSmsGateway) {
		items.push({
			key: "sms-gateway-mapping",
			label: "مپینگ SMS Gateway",
			children: (
				<SmsGatewayMappingPanel
					key={serviceId}
					services={services.data?.results ?? []}
					initialServiceId={serviceId ?? null}
				/>
			),
		});
	}

	const { containerRef, resetTabScroll } = useCompanyTabsScroll(items.length > 0);

	if (!items.length) {
		return <Empty description="بخشی برای نمایش به این کاربر فعال نیست." />;
	}

	return (
		<div ref={containerRef} className="company-profile-tabs-container">
			<Tabs
				className="company-profile-tabs"
				defaultActiveKey={String(items[0]?.key ?? "company-info")}
				style={{
					"--company-profile-tabs-background": token.colorBgLayout,
					"--company-profile-tabs-border": token.colorSplit,
				} as CSSProperties}
				tabBarGutter={16}
				items={items}
				onChange={resetTabScroll}
			/>
		</div>
	);
}
