const fs = require("node:fs");

let c = fs.readFileSync("src/features/contract/list/ui/ContractListPage.tsx", "utf8");

if (!c.includes("checkOfficialPdfStatus")) {
	c = c.replace(
		/import \{ fetchContractsList, fetchDeleteContract \} from "\.\.\/api\/contracts\.api";/,
		"import { checkOfficialPdfStatus, fetchContractsList, fetchDeleteContract, fetchSignFlowPreview } from \"../api/contracts.api\";",
	);
}

// We need to replace the logic inside onPrint (main contract) and onPrint (addendum)
// First, let's find the main contract print logic.
const mainPrintRegex = /onPrint:\s*async\s*\(\)\s*=>\s*\{\s*setPrintRecord\(record\);\s*setPrintAddendumGroupId\(null\);\s*setSignFlowLoading\(true\);\s*setSignFlowModalOpen\(true\);\s*try\s*\{[\s\S]*?catch\s*\(err\)\s*\{[\s\S]*?finally\s*\{[\s\S]*?\}\s*\}/;

const mainPrintReplacement = `onPrint: async () => {
								try {
									const status = await checkOfficialPdfStatus(resolveServicePath(record), record.id);
									if (!status.can_upload && status.has_official_pdf) {
										window.$message?.warning("نسخه رسمی این قرارداد قبلا آپلود شده و در حال گرفتن تایید می باشد");
										return;
									}
								} catch (error) {
									console.error(error);
									window.$message?.error("خطا در بررسی وضعیت نسخه رسمی");
									return;
								}
								setPrintRecord(record);
								setPrintAddendumGroupId(null);
								setSignFlowLoading(true);
								setSignFlowModalOpen(true);
								try {
									const data = await fetchSignFlowPreview(resolveServicePath(record), record.id, null);
									setSignFlowData(data);
								}
								catch (err) {
									console.error(err);
									window.$message?.error("خطا در دریافت اطلاعات گردش کار");
									setSignFlowModalOpen(false);
								}
								finally {
									setSignFlowLoading(false);
								}
							}`;

c = c.replace(mainPrintRegex, mainPrintReplacement);

const addendumPrintRegex = /onPrint:\s*async\s*\(addendumGroupId\)\s*=>\s*\{\s*setPrintRecord\(record\);\s*setPrintAddendumGroupId\(addendumGroupId\);\s*setSignFlowLoading\(true\);\s*setSignFlowModalOpen\(true\);\s*try\s*\{[\s\S]*?catch\s*\(err\)\s*\{[\s\S]*?finally\s*\{[\s\S]*?\}\s*\}/;

const addendumPrintReplacement = `onPrint: async (addendumGroupId) => {
								try {
									const status = await checkOfficialPdfStatus(resolveServicePath(record), record.id, addendumGroupId);
									if (!status.can_upload && status.has_official_pdf) {
										window.$message?.warning("نسخه رسمی این قرارداد قبلا آپلود شده و در حال گرفتن تایید می باشد");
										return;
									}
								} catch (error) {
									console.error(error);
									window.$message?.error("خطا در بررسی وضعیت نسخه رسمی");
									return;
								}
								setPrintRecord(record);
								setPrintAddendumGroupId(addendumGroupId);
								setSignFlowLoading(true);
								setSignFlowModalOpen(true);
								try {
									const data = await fetchSignFlowPreview(resolveServicePath(record), record.id, addendumGroupId);
									setSignFlowData(data);
								}
								catch (err) {
									console.error(err);
									window.$message?.error("خطا در دریافت اطلاعات گردش کار");
									setSignFlowModalOpen(false);
								}
								finally {
									setSignFlowLoading(false);
								}
							}`;

c = c.replace(addendumPrintRegex, addendumPrintReplacement);

fs.writeFileSync("src/features/contract/list/ui/ContractListPage.tsx", c);
