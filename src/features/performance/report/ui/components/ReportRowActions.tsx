import type { PerformanceListRow } from "#src/features/performance/list/model/performance.list.types";
import type { UnregisteredPerformancePreset } from "#src/features/performance/shared/model/performance-registration-preset";
import type { PerformanceServiceCode } from "#src/features/performance/shared/model/performance.form.types";
import type { PerformanceReportRow } from "../../model/performance.report.types";
import { BasicButton } from "#src/components";
import { pickCompanyTypeToken, resolvePerformanceServicePath } from "#src/features/performance/shared/model/performance.helpers";
import { useAccess } from "#src/hooks";
import { EditOutlined, PlusCircleOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { isEditableReportPeriod } from "../../model/performance-report.params";

interface ReportRowActionsProps {
	row: PerformanceReportRow
	serviceId: number | null
	serviceCode: string | null
	/** Single company type picked in the filters; rows of aggregated reports have no concrete performance to open. */
	selectedCompanyType: string | null
	isAggregated: boolean
}

export function ReportRowActions({ row, serviceId, serviceCode, selectedCompanyType, isAggregated }: ReportRowActionsProps) {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { hasDomainPermissionByServiceId } = useAccess();

	const rowServiceId = Number(row.service_id ?? serviceId);
	const rowCompanyId = Number(row.company_id);
	const rowCompanyType = pickCompanyTypeToken(row.company_type) ?? selectedCompanyType;
	const year = Number(row.sh_year);
	const month = Number(row.sh_month);
	const hasTarget = !isAggregated && !!serviceCode && Number.isInteger(rowServiceId) && Number.isInteger(rowCompanyId) && rowCompanyId > 0;

	const canCreate = hasTarget && hasDomainPermissionByServiceId("performances", "create", rowServiceId, rowCompanyType);
	const canManage = hasTarget && (
		hasDomainPermissionByServiceId("performances", "update", rowServiceId, rowCompanyType)
		|| hasDomainPermissionByServiceId("performances", "delete", rowServiceId, rowCompanyType)
	);
	const isEditablePeriod = isEditableReportPeriod(year, month);
	const canEdit = canManage && isEditablePeriod;

	const openCreate = () => {
		const preset: UnregisteredPerformancePreset = {
			serviceId: rowServiceId,
			serviceCode: serviceCode as PerformanceServiceCode,
			companyId: rowCompanyId,
			companyType: rowCompanyType,
			salesAgentId: Number(row.sales_agent_id) || null,
			year,
			month,
		};
		navigate("/performances/new", { state: { unregisteredPreset: preset } });
	};

	const openEdit = () => {
		navigate("/performances/edit", {
			state: {
				directEdit: {
					service: resolvePerformanceServicePath(serviceCode as PerformanceServiceCode, rowCompanyType),
					serviceCode,
					serviceId: rowServiceId,
					record: row as unknown as PerformanceListRow,
				},
			},
		});
	};

	let editTitle = t("performance.actions.editPerformance");
	if (isAggregated)
		editTitle = t("performance.messages.reportActionsAggregated");
	else if (!canManage)
		editTitle = t("performance.messages.noEditAccess");
	else if (!isEditablePeriod)
		editTitle = t("performance.messages.editBeforeCutoff");

	return (
		<>
			<BasicButton
				type="link"
				size="large"
				title={canCreate ? t("performance.actions.createPerformance") : t("performance.messages.noCreateAccess")}
				icon={<PlusCircleOutlined />}
				disabled={!canCreate}
				onClick={openCreate}
			/>
			<BasicButton
				type="link"
				size="large"
				title={editTitle}
				icon={<EditOutlined />}
				disabled={!canEdit}
				onClick={openEdit}
			/>
		</>
	);
}
