import type { ContractServicePath } from "../../../api/contracts.api";
import type { ContractFormSelectionContext } from "../../../shared/ui/form/ContractForm";
import { useCallback, useState } from "react";
import { isCollocationCostContext, resolveContractServicePath } from "../../../shared/model/contract-service-path";
import { ContractForm, defaultContractFormValues } from "../../../shared/ui/form/ContractForm";
import { ScopedCompanyContractsPanel } from "../../../shared/ui/ScopedCompanyContractsPanel";

interface ContractEditSelectorProps {
	onContractSelect: (contractId: number, serviceId: number, companyType: string | null, service: ContractServicePath) => void
}

/** Edit-page entry state: pick service / company on the form, then a contract from the side panel. */
export function ContractEditSelector({ onContractSelect }: ContractEditSelectorProps) {
	const [scope, setScope] = useState<{
		service: ContractServicePath | null
		serviceId: number | null
		companyId: number | null
		companyType: string | null
		costContext: boolean
	} | null>(null);

	const handleSelectionContextChange = useCallback((context: ContractFormSelectionContext) => {
		setScope({
			service: resolveContractServicePath(context),
			serviceId: context.serviceId,
			companyId: context.companyId,
			companyType: context.companyType,
			costContext: isCollocationCostContext(context),
		});
	}, []);

	return (
		<div dir="rtl" className="flex flex-col items-start gap-6 lg:flex-row">
			<div className="order-2 min-w-0 w-full flex-1 lg:order-1">
				<ContractForm
					mode="edit"
					initialValues={defaultContractFormValues}
					showDocuments={false}
					awaitingContractSelection
					onSelectionContextChange={handleSelectionContextChange}
				/>
			</div>
			<aside className="order-1 flex w-full flex-col gap-3 px-2 lg:order-2 lg:w-[25rem] lg:shrink-0 lg:pr-0">
				<ScopedCompanyContractsPanel
					costContext={scope?.costContext}
					companyId={scope?.companyId}
					companyType={scope?.companyType}
					currentContractId={0}
					service={scope?.service}
					serviceId={scope?.serviceId}
					onSelect={(contract) => {
						const serviceId = Number(contract.service_id ?? contract.service ?? scope?.serviceId);
						if (scope?.service && Number.isInteger(serviceId) && serviceId > 0)
							onContractSelect(contract.id, serviceId, scope.companyType, scope.service);
					}}
				/>
			</aside>
		</div>
	);
}
