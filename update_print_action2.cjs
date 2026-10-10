const fs = require("node:fs");

let c = fs.readFileSync("src/features/contract/list/ui/ContractListPage.tsx", "utf8");

const mainClickRegex = /onClick=\{\s*async\s*\(\)\s*=>\s*\{\s*setPrintRecord\(record\);\s*setSignFlowLoading\(true\);\s*setSignFlowModalOpen\(true\);\s*try\s*\{[\s\S]*?catch\s*\(err\)\s*\{[\s\S]*?finally\s*\{[\s\S]*?\}\s*\}\}/;
const mainReplacement = `onClick={async () => {
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
									const data = await fetchSignFlowPreview(resolveServicePath(record), record.id);
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
							}}`;
c = c.replace(mainClickRegex, mainReplacement);

const addendumClickRegex = /onPrint=\{\s*async\s*\(addendumGroupId\)\s*=>\s*\{\s*try\s*\{\s*const status = await checkOfficialPdfStatus[\s\S]*?finally\s*\{[\s\S]*?\}\s*\}\}/;
const addendumFallbackRegex = /onPrint=\{\s*async\s*\(addendumGroupId\)\s*=>\s*\{\s*setPrintRecord\(record\);\s*setPrintAddendumGroupId\(addendumGroupId\);\s*setSignFlowLoading\(true\);\s*setSignFlowModalOpen\(true\);\s*try\s*\{[\s\S]*?finally\s*\{[\s\S]*?\}\s*\}\}/;

const addendumReplacement = `onPrint={async (addendumGroupId) => {
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
							}}`;

if (c.match(addendumClickRegex)) {
	c = c.replace(addendumClickRegex, addendumReplacement);
}
else {
	c = c.replace(addendumFallbackRegex, addendumReplacement);
}

fs.writeFileSync("src/features/contract/list/ui/ContractListPage.tsx", c);
