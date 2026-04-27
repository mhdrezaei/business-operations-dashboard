import type { CompanyProfileFormValues } from "../../../model/company-profile.form.types";
import { Card } from "antd";
import { useWatch } from "react-hook-form";
import CompanyDocumentsTable from "./CompanyDocumentsTable";

export default function CompanyDocumentsPanel() {
	const serviceId = useWatch<CompanyProfileFormValues, "serviceId">({ name: "serviceId" });
	const companyId = useWatch<CompanyProfileFormValues, "companyId">({ name: "companyId" });

	if (!serviceId || !companyId) {
		return (
			<Card>
				<div className="opacity-80">ابتدا سرویس و سپس شرکت را انتخاب کنید.</div>
			</Card>
		);
	}

	return (
		<Card>
			<CompanyDocumentsTable serviceId={serviceId} companyId={companyId} />
		</Card>
	);
}
