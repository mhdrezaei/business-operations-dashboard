import type { ContractFormSelectionContext } from "#src/features/contract/shared/ui/form/ContractForm";
import { CONTRACT_TYPE_OPTIONS } from "#src/features/contract/components/contract-type/contract-type.options";
import { companiesByServiceQuery, servicesQuery } from "#src/features/contract/shared/queries/contract.queries";
import { SectionCard } from "#src/shared/ui/section-card";
import { useQuery } from "@tanstack/react-query";
import { Descriptions, Empty } from "antd";
import { useTranslation } from "react-i18next";

interface Props {
	context: ContractFormSelectionContext | null
}

/** خلاصه انتخاب‌های فرم ایجاد (سرویس، شرکت، نوع قرارداد و مبلغ ثابت) مثل SummaryCard قدیم. */
export function ContractSummaryCard({ context }: Props) {
	const { t } = useTranslation();
	const serviceId = context?.serviceId ?? null;
	const services = useQuery(servicesQuery());
	const companies = useQuery(companiesByServiceQuery(serviceId));

	const service = services.data?.results?.find(item => item.id === serviceId);
	const company = companies.data?.results?.find(item => item.id === context?.companyId);
	const typeLabel = CONTRACT_TYPE_OPTIONS.find(option => option.value === context?.contractPricingType)?.label;
	const fixedAmount = context?.fixedAmount;

	const items = [
		service ? { key: "service", label: t("contract.summary.service"), children: service.name } : null,
		company ? { key: "company", label: t("contract.summary.company"), children: company.name } : null,
		typeLabel ? { key: "type", label: t("contract.summary.type"), children: typeLabel } : null,
		fixedAmount != null ? { key: "fixed", label: t("contract.summary.fixedAmount"), children: t("contract.summary.rial", { value: Number(fixedAmount).toLocaleString("fa-IR") }) } : null,
	].filter(item => item != null);

	return (
		<SectionCard title={t("contract.summary.title")} collapsible={false}>
			{items.length > 0
				? <Descriptions column={1} size="small" items={items} />
				: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("contract.summary.empty")} />}
		</SectionCard>
	);
}
