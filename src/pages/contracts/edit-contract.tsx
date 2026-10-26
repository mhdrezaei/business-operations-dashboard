import type { ContractServicePath } from "#src/features/contract/api/contracts.api";
import type { ComponentProps } from "react";

import { ContractEditForm } from "#src/features/contract/list/ui/components/ContractDetailModal";
import { ContractEditSelector } from "#src/features/contract/list/ui/components/ContractEditSelector";
import { getContractAccessCompanyType } from "#src/features/contract/shared/model/company-type-options";
import { useAccess } from "#src/hooks";
import { Button, Result } from "antd";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router";

const CONTRACT_SERVICE_PATHS = new Set<ContractServicePath>([
	"openapi",
	"traffic",
	"psp",
	"commercial",
	"shahkar",
	"sales-agency/outbound",
	"sales-agency/rep-management",
	"sms/client",
	"sms/vendor",
	"sms-commission",
	"telecom-frame",
]);

function parsePositiveInt(value: string | null | undefined) {
	const id = Number(value);
	return Number.isInteger(id) && id > 0 ? id : null;
}

export default function EditContractFormPage() {
	const navigate = useNavigate();
	const { t } = useTranslation();
	const { hasDomainPermissionByServiceId } = useAccess();
	const [searchParams] = useSearchParams();
	const contractId = parsePositiveInt(searchParams.get("contractId"));
	const serviceId = parsePositiveInt(searchParams.get("serviceId"));
	const companyType = searchParams.get("companyType") || undefined;
	const serviceParam = searchParams.get("service") as ContractServicePath | null;
	const service = serviceParam && CONTRACT_SERVICE_PATHS.has(serviceParam) ? serviceParam : null;
	const [selection, setSelection] = useState(() => ({ contractId, serviceId, companyType, service }));

	// The edit tab is shared by all contracts: a new query string selects another contract in the same tab.
	useEffect(() => {
		setSelection({ contractId, serviceId, companyType, service });
	}, [contractId, serviceId, companyType, service]);
	const accessCompanyType = getContractAccessCompanyType(selection.service, selection.companyType);
	const canUpdate = selection.serviceId != null && hasDomainPermissionByServiceId("contracts", "update", selection.serviceId, accessCompanyType);
	// فقط تأییدکننده (business_approve یا sign): فرم فقط‌خواندنی است ولی بخش تأیید فعال می‌ماند.
	const canApproveOnly = !canUpdate && selection.serviceId != null
	  && (hasDomainPermissionByServiceId("contracts", "business_approve", selection.serviceId, accessCompanyType)
	    || hasDomainPermissionByServiceId("contracts", "sign", selection.serviceId, accessCompanyType));

	const handleContractSelect: ComponentProps<typeof ContractEditForm>["onContractSelect"] = (selectedContractId, selectedServiceId, selectedCompanyType, selectedService) => {
		setSelection({
			contractId: selectedContractId,
			serviceId: selectedServiceId,
			companyType: selectedCompanyType ?? undefined,
			service: selectedService,
		});
	};

	if (!selection.contractId || !selection.service || !selection.serviceId)
		return <ContractEditSelector onContractSelect={handleContractSelect} />;

	if (!canUpdate && !canApproveOnly) {
		return (
			<Result
				status="403"
				title={t("contract.edit.noAccess")}
				extra={<Button onClick={() => navigate("/contracts/list")}>{t("contract.edit.backToList")}</Button>}
			/>
		);
	}

	return (
		<ContractEditForm
			contractId={selection.contractId}
			service={selection.service}
			readOnly={canApproveOnly}
			onContractSelect={handleContractSelect}
			onDeleted={() => setSelection({ contractId: null, serviceId: null, companyType: undefined, service: null })}
		/>
	);
}
