import type { PerformanceFormValues } from "../../model/performance.form.types";
import type { CollocationPartnerType, CollocationRow } from "./traffic-collocation";
import { performanceContractsQuery } from "#src/features/performance/shared/queries/performance.queries";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { extractContractDatacenters, syncCollocationRows } from "./traffic-collocation";
import { TrafficCollocationRows } from "./TrafficCollocationRows";

const ROWS_NAME = "serviceFields.collocationRows";

/** دیتاسنترهای قرارداد فعال شرکت در دوره انتخاب‌شده را دریافت و ردیف‌های مصرف را با آن همگام می‌کند. */
export function TrafficCollocationFields() {
	const { control, getValues, setValue } = useFormContext<PerformanceFormValues>();
	const serviceId = useWatch({ control, name: "serviceId" });
	const companyId = useWatch({ control, name: "companyId" });
	const year = useWatch({ control, name: "year" });
	const month = useWatch({ control, name: "month" });
	const contractId = useWatch({ control, name: "contractId" });
	const partnerType = useWatch({ control, name: "serviceFields.collocationMode" as const }) as CollocationPartnerType | null | undefined;
	const syncedKeyRef = useRef<string | null>(null);

	const isReady = !!serviceId && !!companyId && !!year && !!month && !!partnerType && contractId != null;
	const contracts = useQuery(performanceContractsQuery({
		servicePath: "traffic",
		serviceId,
		companyId: isReady ? companyId : null,
		companyType: "COLLOCATION",
	}));
	const datacenters = useMemo(
		() => (isReady ? extractContractDatacenters(contracts.data?.results ?? [], year, month) : []),
		[isReady, contracts.data, year, month],
	);

	useEffect(() => {
		const current = (getValues(ROWS_NAME as any) as CollocationRow[] | undefined) ?? [];
		if (!isReady || !contracts.isSuccess) {
			syncedKeyRef.current = null;
			if (current.length > 0)
				setValue(ROWS_NAME as any, [], { shouldDirty: false, shouldValidate: false });
			return;
		}

		const key = [serviceId, companyId, partnerType, year, month].join(":");
		const isNewSelection = syncedKeyRef.current !== key || current.length < 1;
		syncedKeyRef.current = key;
		setValue(ROWS_NAME as any, syncCollocationRows(isNewSelection ? null : current, datacenters), { shouldDirty: false, shouldValidate: false });
	}, [isReady, contracts.isSuccess, datacenters, serviceId, companyId, partnerType, year, month, getValues, setValue]);

	return (
		<TrafficCollocationRows
			name={ROWS_NAME}
			datacenters={datacenters}
			partnerType={partnerType}
			loading={isReady && contracts.isLoading}
		/>
	);
}
