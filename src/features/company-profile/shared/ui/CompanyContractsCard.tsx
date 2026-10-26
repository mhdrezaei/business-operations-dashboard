import { resolveContractServicePath } from "#src/features/contract/shared/model/contract-service-path";
import { ScopedCompanyContractsPanel } from "#src/features/contract/shared/ui/ScopedCompanyContractsPanel";
import { buildContractEditPath } from "#src/features/contract/shared/utils/contract-routes";
import { useAccess } from "#src/hooks";
import { useNavigate } from "react-router";

interface CompanyContractsCardProps {
	serviceId: number
	serviceCode: string
	companyType: string | null
	companyId: number
}

/** قراردادهای شرکت انتخاب‌شده با امکان ویرایش (SMS: طرف مشتری) مثل old. */
export default function CompanyContractsCard({ serviceId, serviceCode, companyType, companyId }: CompanyContractsCardProps) {
	const navigate = useNavigate();
	const { hasDomainPermissionByServiceId } = useAccess();

	const service = resolveContractServicePath({
		serviceCode,
		companyType,
		counterpartyType: serviceCode.startsWith("sms") ? "partners" : null,
	});
	// old: برای سرویس‌های دارای نوع شرکت (traffic/sms/psp) بدون نوع شرکت انتخاب‌شده، قراردادها نمایش داده نمی‌شود.
	const isCompanyTypeScoped = ["traffic", "sms", "psp"].includes(serviceCode.trim().toLowerCase());
	if (!service || (isCompanyTypeScoped && !companyType) || !hasDomainPermissionByServiceId("contracts", "view", serviceId, companyType))
		return null;

	const canEdit = hasDomainPermissionByServiceId("contracts", "update", serviceId, companyType);

	return (
		<ScopedCompanyContractsPanel
			companyId={companyId}
			companyType={companyType}
			currentContractId={0}
			service={service}
			serviceId={serviceId}
			onEdit={canEdit
				? (contract) => {
					const contractServiceId = Number(contract.service_id ?? contract.service ?? serviceId);
					if (Number.isInteger(contractServiceId) && contractServiceId > 0)
						navigate(buildContractEditPath({ contractId: contract.id, service, serviceId: contractServiceId, companyType }));
				}
				: undefined}
		/>
	);
}
