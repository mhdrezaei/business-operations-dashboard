import type { CompanyTypeOption } from "#src/api/user/types";
import type { ProColumns } from "@ant-design/pro-components";
import type { TFunction } from "i18next";
import type { ContractListItemType } from "../model/contracts.list.types";
import { toPersianDigits } from "#src/utils/formated";
import { Tag } from "antd";
import { isSmsVendorCompany, pickCompanyTypeToken } from "../../shared/utils";
import { formatContractMonth, getContractListUserName } from "../model/contract-list";
import { formatHistoryDate } from "./components/contract-approval-history.utils";
import { ContractApprovalStatusTag } from "./components/ContractApprovalStatusTag";
import { ContractOfficeApprovalTag } from "./components/ContractOfficeApprovalTag";

export interface GetContractColumnsArgs {
	t: TFunction<"translation", undefined>

	selectedServiceId: number | null
	setSelectedServiceId: (v: number | null) => void

	isTrafficService: boolean
	isCompanyTypeService: boolean
	isSmsService: boolean
	/** SMS party currently selected in the filters (`null` while none is chosen). */
	selectedSmsParty: "vendor" | "client" | null
	setSelectedSmsParty: (v: "vendor" | "client" | null) => void
	/** Table columns visible even without a selected service (old: any service of that kind exists). */
	showCompanyTypeColumn: boolean
	showOfficialColumn: boolean

	selectedTrafficCompanyType: string | null
	setSelectedTrafficCompanyType: (v: string | null) => void
	permittedTrafficCompanyTypeOptions: CompanyTypeOption[]

	serviceOptions: Array<{ label: any, value: any }>
	companyOptions: Array<{ label: any, value: any }>

	isCompanyDisabled: boolean
	companyPlaceholder: string

	/** فقط وابسته‌ها را پاک کن (نه کل فرم) */
	onServiceFilterChange?: () => void
}

const multiSort = (priority: number) => ({ multiple: priority });

function renderCountCell(value: number | undefined) {
	return <Tag bordered={false}>{value ?? 0}</Tag>;
}

function toValueEnum(options: Array<{ label: any, value: any }>) {
	return options.reduce((acc, it) => {
		acc[String(it.value)] = it.label;
		return acc;
	}, {} as Record<string, any>);
}

export function getContractColumns({
	t,
	setSelectedServiceId,
	isTrafficService,
	isCompanyTypeService,
	isSmsService,
	selectedSmsParty,
	setSelectedSmsParty,
	showCompanyTypeColumn,
	showOfficialColumn,
	selectedTrafficCompanyType,
	setSelectedTrafficCompanyType,
	permittedTrafficCompanyTypeOptions,
	serviceOptions,
	companyOptions,
	isCompanyDisabled,
	companyPlaceholder,
	onServiceFilterChange,
}: GetContractColumnsArgs): ProColumns<ContractListItemType>[] {
	const serviceNameById = serviceOptions.reduce((acc, it) => {
		acc[String(it.value)] = String(it.label);
		return acc;
	}, {} as Record<string, string>);
	const companyTypeLabelByKey = permittedTrafficCompanyTypeOptions.reduce((acc, item) => {
		acc[item.key] = item.value;
		return acc;
	}, {} as Record<string, string>);
	// SMS vendor contracts have no company type and no company: those filters only apply to partners.
	const isSmsVendor = isSmsService && selectedSmsParty === "vendor";
	const approvalOptions = [
		{ label: t("contract.list.approval.approved"), value: "true" },
		{ label: t("contract.list.approval.rejected"), value: "false" },
		{ label: t("contract.list.approval.pending"), value: "pending" },
	];
	const officeApprovalOptions = [
		{ label: t("contract.list.approval.approved"), value: "approved" },
		{ label: t("contract.list.approval.waiting"), value: "waiting" },
		{ label: t("contract.list.approval.waitingBusiness"), value: "waiting_business" },
	];

	return [
		{
			dataIndex: "index",
			title: t("common.index"),
			valueType: "indexBorder",
			width: 80,
		},

		{
			title: t("contract.list.column.id"),
			dataIndex: "id",
			width: 90,
			search: false,
			sorter: multiSort(1),
		},

		{
			title: t("contract.list.column.contractNumber"),
			dataIndex: "contract_number",
			width: 170,
			search: false,
			sorter: multiSort(2),
			render: (_, record) => (
				<span dir="ltr" className="font-mono text-xs">{record.contract_number ? toPersianDigits(record.contract_number) : "-"}</span>
			),
		},

		{
			title: t("contract.tableTitle.servicetype"),
			dataIndex: "service_name",
			ellipsis: true,
			width: 160,
			search: false,
			sorter: multiSort(3),
			render: (_, r) => r.service_name ?? serviceNameById[String(r.service_id)] ?? "-",
		},

		{
			title: t("contract.tableTitle.servicetype"),
			dataIndex: "service_id",
			valueType: "select",
			hideInTable: true,
			valueEnum: toValueEnum(serviceOptions),
			fieldProps: {
				allowClear: true,
				placeholder: t("contract.list.filter.selectService"),
				onChange: (v: any) => {
					const nv = v == null ? null : Number(v);
					setSelectedServiceId(nv);

					setSelectedTrafficCompanyType(null);

					onServiceFilterChange?.();
				},
			},
		},

		{
			title: isTrafficService ? t("contract.tableTitle.trafficCompanyType") : t("contract.list.column.companyType"),
			dataIndex: "company_type",
			valueType: "select",
			width: 150,
			hideInTable: !showCompanyTypeColumn,
			hideInSearch: !isCompanyTypeService || isSmsVendor,
			sorter: multiSort(4),
			valueEnum: permittedTrafficCompanyTypeOptions.reduce((acc, item) => {
				acc[item.key] = item.value;
				return acc;
			}, {} as Record<string, string>),
			render: (_, r) => {
				const companyType = pickCompanyTypeToken(r.company_type);
				if (!companyType) {
					return "-";
				}
				return companyTypeLabelByKey[String(companyType)] ?? companyType;
			},
			fieldProps: {
				allowClear: true,
				placeholder: t("contract.list.filter.selectCompanyType"),
				onChange: (v: any) => setSelectedTrafficCompanyType((v ?? null) as any),
			},
		},

		{
			title: t("contract.formLabel.companyName"),
			dataIndex: "company_name",
			ellipsis: true,
			width: 220,
			search: false,
			sorter: multiSort(5),
			render: (_, record) => isSmsVendorCompany({ name: record.company_name }) ? t("contract.list.smsVendorCompany") : record.company_name,
		},

		{
			title: t("contract.formLabel.companyName"),
			dataIndex: "company_id",
			valueType: "select",
			hideInTable: true,
			hideInSearch: isSmsVendor || (isCompanyTypeService ? !selectedTrafficCompanyType : false),
			valueEnum: toValueEnum(companyOptions),
			fieldProps: {
				allowClear: true,
				disabled: isCompanyDisabled,
				placeholder: companyPlaceholder,
			},
		},

		{
			title: t("common.search"),
			dataIndex: "search",
			hideInTable: true,
			valueType: "text",
			fieldProps: { allowClear: true, placeholder: t("contract.tableTitle.searchTerm") },
		},

		{
			title: t("contract.list.filter.smsParty"),
			dataIndex: "sms_party",
			valueType: "select",
			hideInTable: true,
			hideInSearch: !isSmsService,
			valueEnum: {
				vendor: { text: t("contract.list.filter.smsVendor") },
				client: { text: t("contract.list.filter.smsClient") },
			},
			fieldProps: {
				allowClear: true,
				placeholder: t("contract.list.filter.smsParty"),
				onChange: (v: "vendor" | "client" | undefined) => setSelectedSmsParty(v ?? null),
			},
		},

		{
			title: t("contract.tableTitle.isOfficial"),
			dataIndex: "is_official",
			valueType: "select",
			width: 130,
			hideInTable: !showOfficialColumn,
			hideInSearch: !(isTrafficService || (isSmsService && selectedSmsParty === "client")),
			sorter: multiSort(6),
			valueEnum: {
				true: { text: t("contract.list.filter.officialOnly") },
				false: { text: t("contract.list.filter.unofficialOnly") },
			},
			formItemProps: { label: t("contract.list.filter.contractKind") },
			fieldProps: { allowClear: true, placeholder: t("contract.list.filter.allContracts") },
			render: (_, r) => {
				if (r.is_official == null)
					return "-";
				return <Tag>{r.is_official ? t("common.yes") : t("common.no")}</Tag>;
			},
		},

		{
			title: t("contract.list.column.isBusinessApproved"),
			dataIndex: "is_business_approved",
			valueType: "select",
			width: 150,
			align: "center",
			sorter: multiSort(7),
			valueEnum: toValueEnum(approvalOptions),
			fieldProps: { allowClear: true, placeholder: t("contract.list.filter.approvalPlaceholder") },
			render: (_, record) => record.is_official === false
				? "-"
				: <ContractApprovalStatusTag value={record.is_business_approved} pendingLabel={t("contract.list.approval.pending")} />,
		},

		{
			title: t("contract.list.column.isSigned"),
			dataIndex: "is_signed",
			width: 190,
			align: "center",
			search: false,
			sorter: multiSort(8),
			render: (_, record) => record.is_official === false ? "-" : <ContractOfficeApprovalTag contract={record} />,
		},

		{
			title: t("contract.list.filter.officeApproval"),
			dataIndex: "office_approval",
			valueType: "select",
			hideInTable: true,
			valueEnum: toValueEnum(officeApprovalOptions),
			fieldProps: { allowClear: true, placeholder: t("contract.list.filter.approvalPlaceholder") },
		},

		{
			title: t("contract.list.filter.realSigned"),
			dataIndex: "real_signed",
			valueType: "select",
			hideInTable: true,
			valueEnum: {
				true: { text: t("contract.list.approval.signed") },
				false: { text: t("contract.list.approval.unsigned") },
			},
			fieldProps: { allowClear: true, placeholder: t("contract.list.filter.approvalPlaceholder") },
		},

		{
			title: t("contract.list.column.realSignedAt"),
			dataIndex: "real_signed_at",
			width: 170,
			search: false,
			align: "center",
			sorter: multiSort(9),
			render: (_, record) => record.real_signed_at ? <Tag bordered={false} color="processing">{formatHistoryDate(record.real_signed_at)}</Tag> : "-",
		},

		{
			title: t("contract.tableTitle.addendaCount"),
			dataIndex: "addenda_count",
			width: 120,
			search: false,
			align: "center",
			sorter: multiSort(10),
			render: (_, record) => renderCountCell(record.addenda_count),
		},

		{
			title: t("contract.list.column.businessApprovedAddenda"),
			dataIndex: "business_approved_addenda_count",
			width: 150,
			search: false,
			align: "center",
			sorter: multiSort(11),
			render: (_, record) => renderCountCell(record.business_approved_addenda_count),
		},

		{
			title: t("contract.list.column.signedAddenda"),
			dataIndex: "signed_addenda_count",
			width: 150,
			search: false,
			align: "center",
			sorter: multiSort(12),
			render: (_, record) => renderCountCell(record.signed_addenda_count),
		},

		{
			title: t("contract.list.column.realSignedAddenda"),
			dataIndex: "real_signed_addenda_count",
			width: 130,
			search: false,
			align: "center",
			sorter: multiSort(13),
			render: (_, record) => renderCountCell(record.real_signed_addenda_count),
		},

		{
			title: t("contract.tableTitle.startDate"),
			dataIndex: "start_date",
			width: 120,
			search: false,
			sorter: multiSort(14),
			render: (_, record) => formatContractMonth(record.start_jy, record.start_jm) ?? "-",
		},
		{
			title: t("contract.tableTitle.endDate"),
			dataIndex: "end_date",
			width: 120,
			search: false,
			sorter: multiSort(15),
			render: (_, record) => formatContractMonth(record.end_jy, record.end_jm) ?? "-",
		},

		{
			title: t("contract.list.column.createdBy"),
			dataIndex: "created_by_user",
			width: 150,
			search: false,
			render: (_, record) => getContractListUserName(record.created_by_user) ?? "-",
		},
		{
			title: t("contract.list.column.updatedBy"),
			dataIndex: "updated_by_user",
			width: 150,
			search: false,
			render: (_, record) => getContractListUserName(record.updated_by_user) ?? "-",
		},
	];
}
