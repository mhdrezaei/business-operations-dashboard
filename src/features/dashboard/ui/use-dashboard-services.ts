import type { DashboardService } from "#src/features/dashboard/model/types";
import { useUserStore } from "#src/store";
import { getPermittedServiceIdsForDomain } from "#src/utils/access-policy";
import { useMemo } from "react";

/**
 * Services of the global filter: union of the services the user may view contracts of, view performances of or
 * create performances for. Every endpoint filters by the real permission on the server, so sending an id outside a
 * widget's domain is harmless. `performanceServiceIds` feeds the monthly widgets, which require `service_ids`.
 */
export function useDashboardServices() {
	const userServices = useUserStore(state => state.services);
	return useMemo(() => {
		const permitted = new Set([
			...getPermittedServiceIdsForDomain(userServices, "contracts", "view"),
			...getPermittedServiceIdsForDomain(userServices, "performances", "view"),
			...getPermittedServiceIdsForDomain(userServices, "performances", "create"),
		]);
		const services: DashboardService[] = (userServices ?? [])
			.filter(s => permitted.has(Number(s.id)))
			.map(s => ({ id: Number(s.id), code: s.code, name: s.name }));
		return {
			services,
			performanceServiceIds: getPermittedServiceIdsForDomain(userServices, "performances", "view"),
		};
	}, [userServices]);
}
