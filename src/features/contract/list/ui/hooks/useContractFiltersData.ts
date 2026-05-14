import { companiesByServiceQuery, servicesQuery } from "#src/features/contract/create/queries/contract.queries";
import { companyTypeMatches } from "#src/features/contract/shared/utils";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

export type TrafficCompanyType = "CP" | "IXP" | "TCI" | "PREMIUM";

export function useContractFiltersData(selectedServiceId: number | null, selectedTrafficCompanyType: TrafficCompanyType | null) {
	const services = useQuery(servicesQuery());
	const companies = useQuery(companiesByServiceQuery(selectedServiceId));

	const selectedService = useMemo(() => {
		return services.data?.results?.find(s => s.id === selectedServiceId);
	}, [services.data, selectedServiceId]);

	const selectedServiceCode = typeof selectedService?.code === "string" ? selectedService.code.trim().toLowerCase() : null;
	const isTrafficService = selectedServiceCode === "traffic";
	const isSmsService = selectedServiceCode === "sms";
	const isCompanyTypeService = selectedServiceCode === "traffic" || selectedServiceCode === "sms" || selectedServiceCode === "psp";

	const serviceOptions = useMemo(() => {
		return (services.data?.results ?? []).map(s => ({ label: s.name, value: s.id }));
	}, [services.data]);

	const companyOptionsDefault = useMemo(() => {
		return (companies.data?.results ?? []).map((c: any) => ({ label: c.name, value: c.id }));
	}, [companies.data]);

	const companyOptionsTraffic = useMemo(() => {
		const list = companies.data?.results ?? [];
		if (!selectedTrafficCompanyType)
			return [];
		return list
			.filter((c: any) => companyTypeMatches(c.company_type, selectedTrafficCompanyType))
			.map((c: any) => ({ label: c.name, value: c.id }));
	}, [companies.data, selectedTrafficCompanyType]);

	const companyOptions = isCompanyTypeService ? companyOptionsTraffic : companyOptionsDefault;

	const isCompanyDisabled = !selectedServiceId || companies.isLoading || (isCompanyTypeService && !selectedTrafficCompanyType);

	const companyPlaceholder
		= !selectedServiceId
			? "ابتدا سرویس را انتخاب کنید"
			: companies.isLoading
				? "در حال دریافت لیست شرکت‌ها..."
				: isCompanyTypeService && !selectedTrafficCompanyType
					? "ابتدا نوع شرکت را انتخاب کنید"
					: "شرکت را انتخاب کنید";

	return {
		services,
		companies,
		serviceOptions,
		companyOptions,
		isTrafficService,
		isSmsService,
		isCompanyDisabled,
		companyPlaceholder,
	};
}
