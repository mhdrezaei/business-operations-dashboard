const fs = require("node:fs");

let content = fs.readFileSync("src/features/contract/list/ui/components/ContractAddendaExpandedRow.tsx", "utf8");

content = content.replace(
	"import { TableActionDownloadIcon } from \"#src/icons\";",
	"import { TableActionDownloadIcon } from \"#src/icons\";\nimport { PrinterOutlined } from \"@ant-design/icons\";",
);

content = content.replace(
	"interface ContractAddendaExpandedRowProps {\n\tcontract: ContractListItemType\n\tservice: ContractServicePath\n}",
	"interface ContractAddendaExpandedRowProps {\n\tcontract: ContractListItemType\n\tservice: ContractServicePath\n\tonPrint?: (addendumGroupId: string) => void\n}",
);

content = content.replace(
	"export function ContractAddendaExpandedRow({ contract, service }: ContractAddendaExpandedRowProps) {",
	"export function ContractAddendaExpandedRow({ contract, service, onPrint }: ContractAddendaExpandedRowProps) {",
);

content = content.replace(
	"function getColumns(onDownload: (row: ContractAddendumTableRow) => void): ColumnsType<ContractAddendumTableRow> {",
	"function getColumns(onDownload: (row: ContractAddendumTableRow) => void, onPrint?: (addendumGroupId: string) => void): ColumnsType<ContractAddendumTableRow> {",
);

const oldButton = `<Button
\t\t\t\t\t\ttype="link"
\t\t\t\t\t\tsize="small"
\t\t\t\t\t\ttitle="دانلود PDF الحاقیه"
\t\t\t\t\t\taria-label={\`دانلود PDF الحاقیه \${row.displayNumber}\`}
\t\t\t\t\t\ticon={<TableActionDownloadIcon />}
\t\t\t\t\t\tonClick={() => onDownload(row)}
\t\t\t\t\t/>`;
const newButton = `<Button
\t\t\t\t\t\ttype="link"
\t\t\t\t\t\tsize="small"
\t\t\t\t\t\ttitle="دانلود PDF الحاقیه"
\t\t\t\t\t\taria-label={\`دانلود PDF الحاقیه \${row.displayNumber}\`}
\t\t\t\t\t\ticon={<TableActionDownloadIcon />}
\t\t\t\t\t\tonClick={() => onDownload(row)}
\t\t\t\t\t/>
\t\t\t\t\t{onPrint && (
\t\t\t\t\t\t<Button
\t\t\t\t\t\t\ttype="link"
\t\t\t\t\t\t\tsize="small"
\t\t\t\t\t\t\ttitle="چاپ الحاقیه"
\t\t\t\t\t\t\ticon={<PrinterOutlined />}
\t\t\t\t\t\t\tonClick={() => onPrint(row.addendumGroupId!)}
\t\t\t\t\t\t/>
\t\t\t\t\t)}`;

content = content.replace(oldButton, newButton);

content = content.replace(
	"columns={getColumns(handleDownload)}",
	"columns={getColumns(handleDownload, onPrint)}",
);

content = content.replace(
	"interface ContractAddendaExpandedRowProps {\r\n\tcontract: ContractListItemType\r\n\tservice: ContractServicePath\r\n}",
	"interface ContractAddendaExpandedRowProps {\r\n\tcontract: ContractListItemType\r\n\tservice: ContractServicePath\r\n\tonPrint?: (addendumGroupId: string) => void\r\n}",
);

fs.writeFileSync("src/features/contract/list/ui/components/ContractAddendaExpandedRow.tsx", content);
