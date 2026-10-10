import type { ContractServicePath } from "#src/features/contract/api/contracts.api";

import { ContractEditForm } from "#src/features/contract/list/ui/components/ContractDetailModal";
import { useAccess } from "#src/hooks";
import { Button, Result } from "antd";
import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";

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
]);

function parsePositiveInt(value: string | null | undefined) {
	const id = Number(value);
	return Number.isInteger(id) && id > 0 ? id : null;
}

export default function EditContractFormPage() {
	const navigate = useNavigate();
	const { hasDomainPermissionByServiceId } = useAccess();
	const { contractId: contractIdParam } = useParams();
	const [searchParams] = useSearchParams();
	const contractId = parsePositiveInt(contractIdParam);
	const serviceId = parsePositiveInt(searchParams.get("serviceId"));
	const companyType = searchParams.get("companyType") || undefined;
	const serviceParam = searchParams.get("service") as ContractServicePath | null;
	const service = serviceParam && CONTRACT_SERVICE_PATHS.has(serviceParam) ? serviceParam : null;
	const [selection, setSelection] = useState(() => ({ contractId, serviceId, companyType, service }));
	const canUpdate = selection.serviceId != null && hasDomainPermissionByServiceId("contracts", "update", selection.serviceId, selection.companyType);

	if (!selection.contractId || !selection.service || !selection.serviceId) {
		return (
			<Result
				status="warning"
				title="اطلاعات مسیر ویرایش قرارداد معتبر نیست"
				extra={<Button onClick={() => navigate("/contracts/list")}>بازگشت به لیست قراردادها</Button>}
			/>
		);
	}

	if (!canUpdate) {
		return (
			<Result
				status="403"
				title="دسترسی ویرایش این قرارداد را ندارید"
				extra={<Button onClick={() => navigate("/contracts/list")}>بازگشت به لیست قراردادها</Button>}
			/>
		);
	}

	return (
		<ContractEditForm
			contractId={selection.contractId}
			service={selection.service}
			onContractSelect={(selectedContractId, selectedServiceId, selectedCompanyType, selectedService) => {
				setSelection({
					contractId: selectedContractId,
					serviceId: selectedServiceId,
					companyType: selectedCompanyType ?? undefined,
					service: selectedService,
				});
			}}
			onSaved={() => navigate("/contracts/list")}
		/>
	);
}
