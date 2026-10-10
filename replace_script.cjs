const fs = require("node:fs");

let content = fs.readFileSync("src/features/contract/list/ui/ContractListPage.tsx", "utf8");

const oldTag = `\t\t\t\t\t\t<ContractAddendaExpandedRow
\t\t\t\t\t\t\tcontract={record}
\t\t\t\t\t\t\tservice={resolveServicePath(record)}
\t\t\t\t\t\t/>`;

const newTag = `\t\t\t\t\t\t<ContractAddendaExpandedRow
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

content = content.replace(oldTag, newTag);

const oldModal = `\t\t\t<ContractTemplatePrintModal
\t\t\t\topen={printModalOpen}
\t\t\t\tonClose={() => {
\t\t\t\t\tsetPrintModalOpen(false);
\t\t\t\t\tsetPrintRecord(null);
\t\t\t\t}}
\t\t\t\trecord={printRecord}
\t\t\t\tservice={printRecord ? resolveServicePath(printRecord) : null}
\t\t\t\tcompanyType={printRecord ? getRowCompanyType(printRecord) : null}
\t\t\t/>`;

const newModal = `\t\t\t<ContractTemplatePrintModal
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

content = content.replace(oldModal, newModal);
fs.writeFileSync("src/features/contract/list/ui/ContractListPage.tsx", content);
