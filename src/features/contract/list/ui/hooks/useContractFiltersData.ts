import { companiesByServiceQuery, servicesQuery } from "#src/features/contract/create/queries/contract.queries";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

export type TrafficCompanyType = "CP" | "IXP" | "TCI" | "PREMIUM";

export function useContractFiltersData(selectedServiceId: number | null, selectedTrafficCompanyType: TrafficCompanyType | null) {
	const services = useQuery(servicesQuery());
	const companies = useQuery(companiesByServiceQuery(selectedServiceId));

	const selectedService = useMemo(() => {
		return services.data?.results?.find(s => s.id === selectedServiceId);
	}, [services.data, selectedServiceId]);

	const isTrafficService = selectedService?.code === "traffic";
	const isSmsService = selectedService?.code === "sms";

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
			.filter((c: any) => c.company_type === selectedTrafficCompanyType)
			.map((c: any) => ({ label: c.name, value: c.id }));
	}, [companies.data, selectedTrafficCompanyType]);

	const companyOptions = isTrafficService ? companyOptionsTraffic : companyOptionsDefault;

	const isCompanyDisabled = !selectedServiceId || companies.isLoading || (isTrafficService && !selectedTrafficCompanyType);

	const companyPlaceholder
		= !selectedServiceId
			? "ابتدا سرویس را انتخاب کنید"
			: companies.isLoading
				? "در حال دریافت لیست شرکت‌ها..."
				: isTrafficService && !selectedTrafficCompanyType
					? "ابتدا نوع شرکت (ترافیک) را انتخاب کنید"
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
