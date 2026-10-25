import type { ComponentProps } from "react";
import type { OfficialFilter } from "../model/official-filter";
import { useQuery } from "@tanstack/react-query";
import { Segmented } from "antd";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { officialFilterToParam } from "../model/official-filter";
import { collocationCostCompanyQuery } from "../queries/contract.queries";
import { CompanyContractsPanel } from "./CompanyContractsPanel";

interface Props extends Omit<ComponentProps<typeof CompanyContractsPanel>, "isOfficial"> {
	/** قرارداد هزینه رک مخابرات: شرکت سراسری از BE پیدا می‌شود و انتخاب شرکت لازم نیست. */
	costContext?: boolean
}

/** قراردادهای قبلی شرکت/سرویس انتخاب‌شده، با فیلتر رسمی/غیررسمی ترافیک و شرکت سراسری هزینه رک (مثل old). */
export function ScopedCompanyContractsPanel({ costContext = false, companyId, service, serviceId, ...rest }: Props) {
	const { t } = useTranslation();
	const [officialFilter, setOfficialFilter] = useState<OfficialFilter>("all");
	const [filterServiceId, setFilterServiceId] = useState<number | null>(null);
	const isTraffic = service === "traffic";

	// فیلتر رسمی/غیررسمی با تغییر سرویس به «همه» برمی‌گردد (مثل old)
	const currentServiceId = serviceId ?? null;
	if (filterServiceId !== currentServiceId) {
		setFilterServiceId(currentServiceId);
		setOfficialFilter("all");
	}

	const costCompanyQuery = useQuery({
		...collocationCostCompanyQuery(currentServiceId ?? 0),
		enabled: costContext && currentServiceId != null,
	});

	return (
		<>
			{isTraffic && (
				<Segmented<OfficialFilter>
					block
					className="min-h-11 [&_.ant-segmented-item-label]:leading-10"
					aria-label={t("contract.createPanel.officialFilter")}
					value={officialFilter}
					onChange={setOfficialFilter}
					options={[
						{ value: "all", label: t("contract.createPanel.all") },
						{ value: "official", label: t("contract.createPanel.official") },
						{ value: "unofficial", label: t("contract.createPanel.unofficial") },
					]}
				/>
			)}
			<CompanyContractsPanel
				{...rest}
				service={service}
				serviceId={serviceId}
				companyId={costContext ? costCompanyQuery.data : companyId}
				isOfficial={isTraffic ? officialFilterToParam(officialFilter) : null}
			/>
		</>
	);
}
