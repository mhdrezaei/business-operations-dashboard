import type { ContractFormSelectionContext } from "#src/features/contract/shared/ui/form/ContractForm";
import { useAccess } from "#src/hooks";
import { useNavigate } from "react-router";
import { getContractAccessCompanyType } from "../../../shared/model/company-type-options";
import { isCollocationCostContext, resolveContractServicePath } from "../../../shared/model/contract-service-path";
import { ScopedCompanyContractsPanel } from "../../../shared/ui/ScopedCompanyContractsPanel";
import { buildContractEditPath } from "../../../shared/utils/contract-routes";
import { ContractSummaryCard } from "./ContractSummaryCard";

interface Props {
	context: ContractFormSelectionContext | null
}

/** Previous contracts of the selected company + service, shown beside the create form. */
export function CreateContractSidePanel({ context }: Props) {
	const navigate = useNavigate();
	const { hasDomainPermissionByServiceId } = useAccess();

	const service = context ? resolveContractServicePath(context) : null;
	const serviceId = context?.serviceId ?? null;
	const companyType = context?.companyType ?? null;
	const canEdit = serviceId != null && hasDomainPermissionByServiceId("contracts", "update", serviceId, getContractAccessCompanyType(service, companyType));

	return (
		<>
			<ContractSummaryCard context={context} />
			<ScopedCompanyContractsPanel
				companyId={context?.companyId}
				companyType={companyType}
				costContext={context != null && isCollocationCostContext(context)}
				currentContractId={0}
				service={service}
				serviceId={serviceId}
				onEdit={canEdit
					? (contract) => {
						const contractServiceId = Number(contract.service_id ?? contract.service ?? serviceId);
						if (service && Number.isInteger(contractServiceId) && contractServiceId > 0)
							navigate(buildContractEditPath({ contractId: contract.id, service, serviceId: contractServiceId, companyType }));
					}
					: undefined}
			/>
		</>
	);
}
