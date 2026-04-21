import type { ActionType, ProColumns, ProFormInstance } from "@ant-design/pro-components";
import type { PredictionListRow } from "../../shared/model/prediction.list.types";
import { BasicButton, BasicContent, BasicTable } from "#src/components";
import { useAccess } from "#src/hooks";
import { EditOutlined, PlusCircleOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Button } from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { buildFiscalYearOptions } from "../../shared/model/prediction.helpers";
import { predictionServicesQuery } from "../../shared/queries/prediction.queries";
import { predictionServiceRegistry } from "../../shared/services/registry";
import { PredictionEditModal } from "./components/PredictionEditModal";

const ORDERING_OPTIONS = [
	{ labelKey: "prediction.list.ordering.updatedAtDesc", value: "-updated_at" },
	{ labelKey: "prediction.list.ordering.updatedAtAsc", value: "updated_at" },
	{ labelKey: "prediction.list.ordering.fiscalYearDesc", value: "-fiscal_year" },
	{ labelKey: "prediction.list.ordering.fiscalYearAsc", value: "fiscal_year" },
] as const;

function formatDateTime(value: string | null) {
	if (!value)
		return "-";

	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime()))
		return value;

	return parsed.toLocaleString();
}

export default function PredictionListPage() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { getPermittedServiceIds, hasDomainPermissionByServiceId } = useAccess();

	const actionRef = useRef<ActionType>(null);
	const formRef = useRef<ProFormInstance | undefined>(undefined);

	const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
	const [selectedServiceCode, setSelectedServiceCode] = useState<PredictionListRow["serviceCode"] | null>(null);
	const [selectedRow, setSelectedRow] = useState<PredictionListRow | null>(null);
	const [modalOpen, setModalOpen] = useState(false);

	const permittedViewServiceIdsList = getPermittedServiceIds("predictions", "view");
	const permittedCreateServiceIdsList = getPermittedServiceIds("predictions", "create");
	const permittedViewServiceIds = useMemo(
		() => new Set(permittedViewServiceIdsList),
		[permittedViewServiceIdsList.join(",")],
	);

	const services = useQuery(predictionServicesQuery());

	const serviceOptions = useMemo(() => {
		return (services.data?.results ?? [])
			.filter(service => permittedViewServiceIds.has(Number(service.id)))
			.map(service => ({
				label: service.name,
				value: service.id,
				code: String(service.code ?? "").trim().toLowerCase() as PredictionListRow["serviceCode"],
			}));
	}, [services.data, permittedViewServiceIdsList.join(",")]);

	const selectedService = useMemo(
		() => serviceOptions.find(option => option.value === selectedServiceId) ?? null,
		[selectedServiceId, serviceOptions],
	);

	useEffect(() => {
		if (!selectedServiceId)
			return;
		if (permittedViewServiceIds.has(selectedServiceId))
			return;

		setSelectedServiceId(null);
		setSelectedServiceCode(null);
		formRef.current?.setFieldsValue({
			service: undefined,
			fiscal_year: undefined,
			ordering: undefined,
		});
	}, [permittedViewServiceIdsList.join(","), selectedServiceId]);

	const fiscalYearOptions = useMemo(
		() => buildFiscalYearOptions([]).map(option => ({
			label: option.label,
			value: option.value,
		})),
		[],
	);

	function handleOpenEdit(row: PredictionListRow) {
		setSelectedRow(row);
		setModalOpen(true);
	}

	function handleCloseModal() {
		setModalOpen(false);
		setSelectedRow(null);
	}

	function refreshTable() {
		actionRef.current?.reload?.();
	}

	const columns: ProColumns<PredictionListRow>[] = useMemo(() => {
		return [
			{
				title: t("common.index"),
				dataIndex: "index",
				valueType: "indexBorder",
				width: 72,
				search: false,
			},
			{
				title: t("prediction.labels.service"),
				dataIndex: "service",
				hideInTable: true,
				valueType: "select",
				fieldProps: {
					options: serviceOptions,
					allowClear: true,
					showSearch: true,
					optionFilterProp: "label",
					placeholder: t("prediction.placeholders.selectService"),
				},
			},
			{
				title: t("prediction.labels.fiscalYear"),
				dataIndex: "fiscal_year",
				hideInTable: true,
				valueType: "select",
				fieldProps: {
					options: fiscalYearOptions,
					allowClear: true,
					showSearch: true,
					optionFilterProp: "label",
					placeholder: t("prediction.placeholders.selectFiscalYear"),
				},
			},
			{
				title: t("prediction.list.columns.ordering"),
				dataIndex: "ordering",
				hideInTable: true,
				valueType: "select",
				fieldProps: {
					options: ORDERING_OPTIONS.map(option => ({
						label: t(option.labelKey),
						value: option.value,
					})),
					allowClear: true,
					placeholder: t("prediction.list.placeholders.ordering"),
				},
			},
			{
				title: t("prediction.list.columns.fiscalYear"),
				dataIndex: "fiscalYear",
				search: false,
				width: 120,
			},
			{
				title: t("prediction.list.columns.preview"),
				dataIndex: "preview",
				search: false,
				ellipsis: true,
				width: 360,
			},
			{
				title: t("prediction.list.columns.note"),
				dataIndex: "note",
				search: false,
				ellipsis: true,
				width: 240,
				render: (_, row) => row.note || "-",
			},
			{
				title: t("prediction.list.columns.updatedAt"),
				dataIndex: "updatedAt",
				search: false,
				width: 180,
				render: (_, row) => formatDateTime(row.updatedAt),
			},
			{
				title: t("common.action"),
				valueType: "option",
				key: "option",
				width: 100,
				fixed: "right",
				align: "center",
				render: (_, row) => {
					if (!hasDomainPermissionByServiceId("predictions", "update", row.serviceId)) {
						return [];
					}

					return [
						<BasicButton
							key="edit"
							type="link"
							size="large"
							title={t("prediction.actions.editPrediction")}
							icon={<EditOutlined />}
							onClick={() => handleOpenEdit(row)}
						/>,
					];
				},
			},
		];
	}, [fiscalYearOptions, hasDomainPermissionByServiceId, serviceOptions, t]);

	return (
		<BasicContent className="h-full">
			<BasicTable<PredictionListRow>
				adaptive
				rowKey="id"
				columns={columns}
				actionRef={actionRef}
				formRef={formRef}
				form={{
					onValuesChange: (changedValues) => {
						if (!Object.prototype.hasOwnProperty.call(changedValues, "service"))
							return;

						const nextServiceId = changedValues.service == null ? null : Number(changedValues.service);
						const nextService = serviceOptions.find(option => option.value === nextServiceId) ?? null;
						setSelectedServiceId(nextServiceId);
						setSelectedServiceCode(nextService?.code ?? null);
					},
				}}
				request={async (params) => {
					if (!selectedServiceId || !selectedServiceCode) {
						return {
							data: [],
							total: 0,
							success: true,
						};
					}

					const module = predictionServiceRegistry[selectedServiceCode];
					if (!module) {
						return {
							data: [],
							total: 0,
							success: true,
						};
					}

					const responseData = await module.fetchList({
						page: params.current ?? 1,
						page_size: params.pageSize ?? 20,
						service: selectedServiceId,
						fiscal_year: (params as any).fiscal_year,
						ordering: (params as any).ordering,
					});

					return {
						data: (responseData.results ?? []).map(record =>
							module.toListRow(record, {
								serviceCode: selectedServiceCode,
								serviceId: selectedServiceId,
								serviceLabel: selectedService?.label ?? selectedServiceCode,
							}),
						),
						total: responseData.count,
						success: true,
					};
				}}
				headerTitle={t("prediction.titles.list")}
				toolBarRender={() => {
					if (permittedCreateServiceIdsList.length < 1) {
						return [];
					}

					return [
						<Button
							key="add"
							icon={<PlusCircleOutlined />}
							type="primary"
							onClick={() => navigate("/predictions/new")}
						>
							{t("common.add")}
						</Button>,
					];
				}}
			/>

			<PredictionEditModal
				open={modalOpen}
				row={selectedRow}
				onClose={handleCloseModal}
				onUpdated={refreshTable}
			/>
		</BasicContent>
	);
}
