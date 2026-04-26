import type { ActionType, ProColumns, ProFormInstance } from "@ant-design/pro-components";
import type { AuditLogDto, AuditLogsListQuery } from "../model/admin-logs.types";

import { BasicButton, BasicContent, BasicTable } from "#src/components";
import { EyeOutlined } from "@ant-design/icons";
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { fetchAuditLogsList } from "../api/admin-logs.api";
import { AdminLogDetailsModal } from "./components/AdminLogDetailsModal";
import { getAdminLogsColumns } from "./constants/admin-logs.columns";

function getAuditLogsQuery(params: Record<string, unknown>): AuditLogsListQuery {
	const rawStatusCode = params.status_code;
	const statusCode = typeof rawStatusCode === "number"
		? rawStatusCode
		: typeof rawStatusCode === "string" && rawStatusCode.trim()
			? Number(rawStatusCode)
			: undefined;

	return {
		page: Number(params.current) || 1,
		page_size: Number(params.pageSize) || 20,
		search: typeof params.search === "string" && params.search.trim() ? params.search.trim() : undefined,
		ordering: typeof params.ordering === "string" && params.ordering.trim() ? params.ordering.trim() : "-created_at",
		method: typeof params.method === "string" && params.method.trim() ? params.method.trim() : undefined,
		status_code: Number.isFinite(statusCode) ? statusCode : undefined,
	};
}

export default function AdminLogsListPage() {
	const { t } = useTranslation();

	const actionRef = useRef<ActionType>(null);
	const formRef = useRef<ProFormInstance | undefined>(undefined);
	const [selectedLog, setSelectedLog] = useState<AuditLogDto | null>(null);
	const [openDetails, setOpenDetails] = useState(false);

	const baseColumns = useMemo(
		() => getAdminLogsColumns({ t }),
		[t],
	);

	function handleOpenDetails(log: AuditLogDto) {
		setSelectedLog(log);
		setOpenDetails(true);
	}

	const columns: ProColumns<AuditLogDto>[] = useMemo(() => {
		return [
			...baseColumns,
			{
				title: t("common.action"),
				valueType: "option",
				key: "option",
				width: 90,
				fixed: "right",
				align: "center",
				render: (_, record) => [
					<BasicButton
						key="details"
						type="link"
						size="large"
						title="جزئیات"
						icon={<EyeOutlined />}
						onClick={() => handleOpenDetails(record)}
					/>,
				],
			},
		];
	}, [baseColumns, t]);

	return (
		<BasicContent className="h-full">
			<BasicTable<AuditLogDto>
				adaptive
				rowKey="id"
				columns={columns}
				actionRef={actionRef}
				formRef={formRef}
				autoSearchDebounceTime={500}
				request={async (params) => {
					const responseData = await fetchAuditLogsList(getAuditLogsQuery(params as Record<string, unknown>));

					return {
						...responseData,
						data: responseData.results,
						total: responseData.count,
					};
				}}
				headerTitle="Audit Logs"
			/>

			<AdminLogDetailsModal
				open={openDetails}
				log={selectedLog}
				onClose={() => {
					setOpenDetails(false);
					setSelectedLog(null);
				}}
			/>
		</BasicContent>
	);
}
