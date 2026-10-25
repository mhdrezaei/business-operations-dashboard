import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { TRAFFIC_COLLOCATION_SLAS } from "./traffic.sla";

export function useCollocationSlaOptions() {
	const { t } = useTranslation();
	return useMemo(
		() => TRAFFIC_COLLOCATION_SLAS.map(sla => ({ label: t(`contract.collocation.sla.${sla}`), value: sla })),
		[t],
	);
}
