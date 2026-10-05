const fs = require("node:fs");

let content = fs.readFileSync("src/features/contract/list/ui/ContractListPage.tsx", "utf8");

const brokenModal = "<ContractTemplatePrintModal\\n\\t\\t\\t\\topen={printModalOpen}\\n\\t\\t\\t\\tonClose={() => {\\n\\t\\t\\t\\t\\tsetPrintModalOpen(false);\\n\\t\\t\\t\\t\\tsetPrintRecord(null);\\n\\t\\t\\t\\t\\tsetPrintAddendumGroupId(null);\\n\\t\\t\\t\\t}}\\n\\t\\t\\t\\trecord={printRecord}\\n\\t\\t\\t\\taddendumGroupId={printAddendumGroupId}\\n\\t\\t\\t\\tservice={printRecord ? resolveServicePath(printRecord) : null}\\n\\t\\t\\t\\tcompanyType={printRecord ? getRowCompanyType(printRecord) : null}\\n\\t\\t\\t/>";

const fixedModal = `<ContractTemplatePrintModal
\t\t\t\topen={printModalOpen}
\t\t\t\tonClose={() => {
\t\t\t\t\tsetPrintModalOpen(false);
\t\t\t\t\tsetPrintRecord(null);
\t\t\t\t\tsetPrintAddendumGroupId(null);
\t\t\t\t}}
\t\t\t\trecord={printRecord}
\t\t\t\taddendumGroupId={printAddendumGroupId}
\t\t\t\tservice={printRecord ? resolveServicePath(printRecord) : null}
\t\t\t\tcompanyType={printRecord ? getRowCompanyType(printRecord) : null}
\t\t\t/>`;

content = content.replace(brokenModal, fixedModal);

const brokenRow = "<ContractAddendaExpandedRow\\n\\t\\t\\t\\t\\t\\t\\tcontract={record}\\n\\t\\t\\t\\t\\t\\t\\tservice={resolveServicePath(record)}\\n\\t\\t\\t\\t\\t\\t\\tonPrint={async (addendumGroupId) => {\\n\\t\\t\\t\\t\\t\\t\\t\\tsetPrintRecord(record);\\n\\t\\t\\t\\t\\t\\t\\t\\tsetPrintAddendumGroupId(addendumGroupId);\\n\\t\\t\\t\\t\\t\\t\\t\\tsetSignFlowLoading(true);\\n\\t\\t\\t\\t\\t\\t\\t\\tsetSignFlowModalOpen(true);\\n\\t\\t\\t\\t\\t\\t\\t\\ttry {\\n\\t\\t\\t\\t\\t\\t\\t\\t\\tconst data = await fetchSignFlowPreview(resolveServicePath(record), record.id, addendumGroupId);\\n\\t\\t\\t\\t\\t\\t\\t\\t\\tsetSignFlowData(data);\\n\\t\\t\\t\\t\\t\\t\\t\\t}\\n\\t\\t\\t\\t\\t\\t\\t\\tcatch (err) {\\n\\t\\t\\t\\t\\t\\t\\t\\t\\tconsole.error(err);\\n\\t\\t\\t\\t\\t\\t\\t\\t\\twindow.$message?.error('خطا در دریافت اطلاعات گردش کار');\\n\\t\\t\\t\\t\\t\\t\\t\\t\\tsetSignFlowModalOpen(false);\\n\\t\\t\\t\\t\\t\\t\\t\\t}\\n\\t\\t\\t\\t\\t\\t\\t\\tfinally {\\n\\t\\t\\t\\t\\t\\t\\t\\t\\tsetSignFlowLoading(false);\\n\\t\\t\\t\\t\\t\\t\\t\\t}\\n\\t\\t\\t\\t\\t\\t\\t}}\\n\\t\\t\\t\\t\\t\\t/>";

const fixedRow = `<ContractAddendaExpandedRow
\t\t\t\t\t\t\tcontract={record}
\t\t\t\t\t\t\tservice={resolveServicePath(record)}
\t\t\t\t\t\t\tonPrint={async (addendumGroupId) => {
\t\t\t\t\t\t\t\tsetPrintRecord(record);
\t\t\t\t\t\t\t\tsetPrintAddendumGroupId(addendumGroupId);
\t\t\t\t\t\t\t\tsetSignFlowLoading(true);
\t\t\t\t\t\t\t\tsetSignFlowModalOpen(true);
\t\t\t\t\t\t\t\ttry {
\t\t\t\t\t\t\t\t\tconst data = await fetchSignFlowPreview(resolveServicePath(record), record.id, addendumGroupId);
\t\t\t\t\t\t\t\t\tsetSignFlowData(data);
\t\t\t\t\t\t\t\t}
\t\t\t\t\t\t\t\tcatch (err) {
\t\t\t\t\t\t\t\t\tconsole.error(err);
\t\t\t\t\t\t\t\t\twindow.$message?.error('خطا در دریافت اطلاعات گردش کار');
\t\t\t\t\t\t\t\t\tsetSignFlowModalOpen(false);
\t\t\t\t\t\t\t\t}
\t\t\t\t\t\t\t\tfinally {
\t\t\t\t\t\t\t\t\tsetSignFlowLoading(false);
\t\t\t\t\t\t\t\t}
\t\t\t\t\t\t\t}}
\t\t\t\t\t\t/>`;

content = content.replace(brokenRow, fixedRow);
fs.writeFileSync("src/features/contract/list/ui/ContractListPage.tsx", content);
