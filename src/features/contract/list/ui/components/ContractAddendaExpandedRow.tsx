import type { ColumnsType } from "antd/es/table";
import type { ContractApprovalHistorySubjectDto, ContractServicePath } from "../../../api/contracts.api";
import type { ContractAddendumTreeNode } from "../../model/contract-addenda-tree";
import type { ContractListItemType } from "../../model/contracts.list.types";

import { TableActionDownloadIcon } from "#src/icons";
import { PrinterOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button, Empty, Space, Spin, Table, Tag } from "antd";
import { fetchContractDetail } from "../../../api/contracts.api";
import { contractApprovalQuery } from "../../../shared/queries/contract.queries";
import { buildContractAddendaTree } from "../../model/contract-addenda-tree";
import { openContractPdfPrint } from "../utils/contract-pdf";
import { useContractAddendaTableStyles } from "./contract-addenda-table.styles";
import { ContractApprovalStatusTag } from "./ContractApprovalStatusTag";

interface ContractAddendaExpandedRowProps {
	contract: ContractListItemType
	service: ContractServicePath
	onPrint?: (addendumGroupId: string) => void
}

type ContractAddendumTableRow = Omit<ContractAddendumTreeNode, "children"> & {
	children?: ContractAddendumTableRow[]
};

const persianDigits = new Intl.NumberFormat("fa-IR", { useGrouping: false });

function toPersianText(value: string) {
	return value.replace(/\d/g, digit => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
}

function formatJalaliDate(year: number | null, month: number | null) {
	if (year === null || month === null)
		return "—";

	return `${persianDigits.format(year)}/${persianDigits.format(month).padStart(2, "۰")}`;
}

function getColumns(
	findApproval: (row: ContractAddendumTableRow) => ContractApprovalHistorySubjectDto | undefined,
	onDownload: (row: ContractAddendumTableRow) => void,
	onPrint?: (addendumGroupId: string) => void,
): ColumnsType<ContractAddendumTableRow> {
	return [
		{
			title: "شماره",
			dataIndex: "sequenceNumber",
			align: "center",
			width: 80,
			render: value => persianDigits.format(value),
		},
		{
			title: "الحاقیه",
			dataIndex: "displayNumber",
			align: "center",
			width: 300,
			render: value => `الحاقیه ${toPersianText(value)}`,
		},
		{
			title: "الحاقیه روی الحاقیه",
			dataIndex: "parentDisplayNumber",
			align: "center",
			width: 220,
			render: value => value
				? <Tag bordered={false}>{toPersianText(value)}</Tag>
				: "قرارداد اصلی",
		},
		{
			title: "تاریخ شروع",
			align: "center",
			width: 130,
			render: (_, row) => formatJalaliDate(row.startYear, row.startMonth),
		},
		{
			title: "تاریخ پایان",
			align: "center",
			width: 130,
			render: (_, row) => formatJalaliDate(row.endYear, row.endMonth),
		},
		{
			title: "تأیید تجاری",
			align: "center",
			width: 130,
			render: (_, row) => <ContractApprovalStatusTag value={findApproval(row)?.is_business_approved} />,
		},
		{
			title: "تأیید اداره قراردادها",
			align: "center",
			width: 160,
			render: (_, row) => <ContractApprovalStatusTag value={findApproval(row)?.is_signed} />,
		},
		{
			title: "عملیات",
			align: "center",
			width: 120,
			render: (_, row) => (
				<Space size="small">
					<Button
						type="link"
						size="small"
						title="دانلود PDF الحاقیه"
						aria-label={`دانلود PDF الحاقیه ${row.displayNumber}`}
						icon={<TableActionDownloadIcon />}
						onClick={() => onDownload(row)}
					/>
					{onPrint && (
						<Button
							type="link"
							size="small"
							title="چاپ الحاقیه"
							icon={<PrinterOutlined />}
							onClick={() => row.addendumGroupId ? onPrint(row.addendumGroupId) : undefined}
						/>
					)}
				</Space>
			),
		},
	];
}

function findRawAddenda(addenda: unknown, target: ContractAddendumTableRow): unknown[] {
	if (!Array.isArray(addenda))
		return [];

	const matches: unknown[] = [];
	for (const item of addenda) {
		const row = (item ?? {}) as Record<string, unknown>;
		const id = Number(row.id);
		const displayNumber = String(row.display_addendum_number ?? row.displayAddendumNumber ?? "");
		if ((target.id !== null && id === target.id) || displayNumber === target.displayNumber)
			matches.push(row);

		matches.push(...findRawAddenda(row.children, target));
	}

	return matches;
}

function toTableData(rows: ContractAddendumTreeNode[]): ContractAddendumTableRow[] {
	return rows.map(({ children, ...row }) => ({
		...row,
		...(children.length > 0 ? { children: toTableData(children) } : {}),
	}));
}

export function ContractAddendaExpandedRow({ contract, service, onPrint }: ContractAddendaExpandedRowProps) {
	const classes = useContractAddendaTableStyles();
	const detail = useQuery({
		queryKey: ["contracts", "detail", service, contract.id],
		queryFn: () => fetchContractDetail(service, contract.id),
		staleTime: 30_000,
	});

	const approval = useQuery(contractApprovalQuery(service, contract.id));
	const findApproval = (row: ContractAddendumTableRow) => approval.data?.addenda?.find(
		item => item.id === row.id || String(item.display_addendum_number ?? "") === row.displayNumber,
	);

	if (detail.isPending) {
		return (
			<div className={classes.expandedContent}>
				<div className="flex min-h-24 items-center justify-center">
					<Spin tip="در حال دریافت الحاقیه‌ها..." />
				</div>
			</div>
		);
	}

	if (detail.isError) {
		return (
			<div className={classes.expandedContent}>
				<Alert
					showIcon
					type="error"
					message="دریافت فهرست الحاقیه‌ها ناموفق بود."
				/>
			</div>
		);
	}

	const addenda = buildContractAddendaTree(detail.data?.addenda);
	if (addenda.length === 0) {
		return (
			<div className={classes.expandedContent}>
				<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="الحاقیه‌ای برای این قرارداد ثبت نشده است." />
			</div>
		);
	}

	const tableData = toTableData(addenda);
	const handleDownload = (row: ContractAddendumTableRow) => {
		const selectedAddenda = findRawAddenda(detail.data?.addenda, row);
		openContractPdfPrint({
			record: contract,
			detail: {
				...detail.data,
				addenda: selectedAddenda,
			},
		});
	};

	return (
		<div className={classes.expandedContent}>
			<Table<ContractAddendumTableRow>
				className={classes.addendaTable}
				rowKey="key"
				columns={getColumns(findApproval, handleDownload, onPrint)}
				dataSource={tableData}
				pagination={false}
				scroll={{ x: 1300 }}
				tableLayout="fixed"
				expandable={{
					indentSize: 16,
					rowExpandable: row => (row.children?.length ?? 0) > 0,
				}}
			/>
		</div>
	);
}
