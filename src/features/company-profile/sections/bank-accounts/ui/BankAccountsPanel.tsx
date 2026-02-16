import type { CompanyProfileFormValues } from "#src/features/company-profile/model/company-profile.form.types.js";
import { ProCard } from "@ant-design/pro-components";
import React from "react";
import { useWatch } from "react-hook-form";
import BankAccountsTable from "./BankAccountsTable";

export default function BankAccountsPanel() {
	const companyId = useWatch<CompanyProfileFormValues, "companyId">({ name: "companyId" });
	const serviceId = useWatch<CompanyProfileFormValues, "serviceId">({ name: "serviceId" });
	if (!serviceId || !companyId) {
		return (
			<ProCard>
				<div style={{ opacity: 0.8 }}>ابتدا سرویس و سپس شرکت را انتخاب کنید.</div>
			</ProCard>
		);
	}

	return (
		<ProCard>
			<BankAccountsTable serviceId={serviceId} companyId={companyId} />
		</ProCard>
	);
}
