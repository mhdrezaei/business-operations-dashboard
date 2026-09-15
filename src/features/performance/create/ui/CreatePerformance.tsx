import type { PerformanceListRow } from "../../list/model/performance.list.types";
import type { UnregisteredPerformancePreset } from "../../shared/model/performance-registration-preset";
import type { PerformanceFormValues } from "../../shared/model/performance.form.types";
import type { resolvePerformanceServicePath } from "../../shared/model/performance.helpers";
import type { PerformanceSubmitIntent } from "../../shared/ui/form/PerformanceForm";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router";
import { fetchPerformanceList } from "../../api/performances.api";
import { parseUnregisteredPerformanceSearch } from "../../shared/model/performance-registration-preset";
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
		const submitMode = values.serviceFields?.submitMode;
		form.reset({
			serviceId: values.serviceId,
			serviceCode: values.serviceCode,
			companyId: null,
			companyType: values.companyType,
			salesAgentId: null,
			year: values.year,
			month: values.month,
			contractId: null,
			contractModel: null,
			serviceFields: submitMode == null ? {} : { submitMode },
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
		company_type: typeof companyType === "string" ? companyType : (values.companyType ?? null),
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
	const navigate = useNavigate();
	const location = useLocation();
	const [submitting, setSubmitting] = useState(false);
	const unregisteredPreset = (location.state as {
		unregisteredPreset?: UnregisteredPerformancePreset
	} | null)?.unregisteredPreset;
	const presetInitialValues = useMemo<Partial<PerformanceFormValues> | null>(() => {
		const preset = parseUnregisteredPerformanceSearch(location.search) ?? unregisteredPreset;
		if (!preset)
			return null;

		return {
			serviceId: preset.serviceId,
			serviceCode: preset.serviceCode,
			companyId: preset.companyId,
			companyType: preset.companyType,
			salesAgentId: preset.salesAgentId,
			year: preset.year,
			month: preset.month,
			serviceFields: preset.serviceCode === "traffic" ? { submitMode: "single" } : {},
		};
	}, [location.search, unregisteredPreset]);

	return (
		<>
			<PerformanceForm
				initialValues={presetInitialValues}
				lockPrerequisites={presetInitialValues != null}
				submitting={submitting}
				onSubmit={async (values, intent, form) => {
					setSubmitting(true);
					try {
						const result = await submitPerformance(values);
						applySubmitIntent(intent, values, form, t);

						if (intent === "submit_and_edit") {
							const record = await loadCreatedPerformanceRecord(values, result.servicePath, result.record);
							form.reset();
							navigate("/performances/edit", {
								state: {
									directEdit: {
										service: result.servicePath,
										serviceCode: values.serviceCode,
										serviceId: values.serviceId,
										record,
									},
								},
							});
						}
					}
					finally {
						setSubmitting(false);
					}
				}}
			/>
		</>
	);
}

export default CreatePerformance;
