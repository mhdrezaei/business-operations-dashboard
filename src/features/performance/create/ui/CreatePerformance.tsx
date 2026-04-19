import type { UseFormReturn } from "react-hook-form";
import type { PerformanceListRow } from "../../list/model/performance.list.types";
import type { PerformanceFormValues } from "../../shared/model/performance.form.types";
import type { resolvePerformanceServicePath } from "../../shared/model/performance.helpers";
import type { PerformanceSubmitIntent } from "../../shared/ui/form/PerformanceForm";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchPerformanceList } from "../../api/performances.api";
import { PerformanceDetailModal } from "../../list/ui/components/PerformanceDetailModal";
import { companiesByServiceQuery } from "../../shared/queries/performance.queries";
import { PerformanceForm } from "../../shared/ui/form/PerformanceForm";
import { submitPerformance } from "./performance.submit";

function applySubmitIntent(
	intent: PerformanceSubmitIntent,
	values: PerformanceFormValues,
	form: any,
	t: (key: string) => string,
) {
	if (intent === "submit") {
		window.$message?.success(t("performance.messages.createSuccess"));
		form.reset();
		return;
	}

	if (intent === "submit_and_create_another") {
		window.$message?.success(t("performance.messages.createAndAnotherSuccess"));
		form.reset({
			...values,
			companyId: null,
			salesAgentId: null,
			contractId: null,
			contractModel: null,
			serviceFields: {},
		});
		return;
	}

	window.$message?.success(t("performance.messages.createAndEditSuccess"));
}

function buildCreatedPerformanceRecord(
	values: PerformanceFormValues,
	responseRecord: Record<string, unknown> | null,
): PerformanceListRow {
	const companyType = responseRecord?.company_type;

	return {
		...(responseRecord ?? {}),
		id: responseRecord?.id as number | undefined,
		company: values.companyId,
		company_id: values.companyId,
		company_name: String(responseRecord?.company_name ?? ""),
		service: values.serviceId,
		service_id: values.serviceId,
		service_name: String(responseRecord?.service_name ?? values.serviceCode ?? ""),
		sh_year: values.year,
		sh_month: values.month,
		sales_agent: responseRecord?.sales_agent as number | null | undefined ?? values.salesAgentId,
		sales_agent_id: responseRecord?.sales_agent_id as number | null | undefined ?? values.salesAgentId,
		company_type: typeof companyType === "string" ? companyType : (values.trafficCompanyType ?? null),
	};
}

async function loadCreatedPerformanceRecord(
	values: PerformanceFormValues,
	servicePath: NonNullable<ReturnType<typeof resolvePerformanceServicePath>>,
	responseRecord: Record<string, unknown> | null,
): Promise<PerformanceListRow> {
	if (!values.companyId || !values.serviceId || !values.year || !values.month)
		return buildCreatedPerformanceRecord(values, responseRecord);

	try {
		const response = await fetchPerformanceList(servicePath, {
			page: 1,
			page_size: 250,
			service: values.serviceId,
			company: values.companyId,
			sh_year: values.year,
			sh_month: values.month,
		});
		const rows = response?.results ?? [];
		const responseId = typeof responseRecord?.id === "number" ? responseRecord.id : null;
		const responseOperationType = typeof responseRecord?.operation_type === "string"
			? responseRecord.operation_type.trim().toUpperCase()
			: null;

		const matchedRow = rows.find(row => row.id === responseId) ?? rows.find((row) => {
			if (!responseOperationType)
				return false;
			return String(row.operation_type ?? "").trim().toUpperCase() === responseOperationType;
		})
		?? rows[0]
		?? null;

		return buildCreatedPerformanceRecord(values, matchedRow as Record<string, unknown> | null);
	}
	catch {
		return buildCreatedPerformanceRecord(values, responseRecord);
	}
}

function CreatePerformance() {
	const { t } = useTranslation();
	const [submitting, setSubmitting] = useState(false);
	const [editingService, setEditingService] = useState<ReturnType<typeof resolvePerformanceServicePath> | null>(null);
	const [editingRecord, setEditingRecord] = useState<PerformanceListRow | null>(null);
	const formRef = useRef<UseFormReturn<PerformanceFormValues> | null>(null);
	const companies = useQuery(companiesByServiceQuery(editingRecord?.service_id ?? editingRecord?.service ?? null));
	const editingCompanies = useMemo(() => companies.data?.results, [companies.data]);

	function handleCloseEditModal() {
		setEditingService(null);
		setEditingRecord(null);
	}

	function handleUpdatedEditModal() {
		formRef.current?.reset();
	}

	return (
		<>
			<PerformanceForm
				submitting={submitting}
				onSubmit={async (values, intent, form) => {
					formRef.current = form;
					setSubmitting(true);
					try {
						const result = await submitPerformance(values);
						applySubmitIntent(intent, values, form, t);

						if (intent === "submit_and_edit") {
							setEditingService(result.servicePath);
							setEditingRecord(await loadCreatedPerformanceRecord(values, result.servicePath, result.record));
						}
					}
					finally {
						setSubmitting(false);
					}
				}}
			/>

			<PerformanceDetailModal
				open={!!editingService && !!editingRecord}
				service={editingService}
				record={editingRecord}
				companies={editingCompanies}
				onClose={handleCloseEditModal}
				onUpdated={handleUpdatedEditModal}
			/>
		</>
	);
}

export default CreatePerformance;
