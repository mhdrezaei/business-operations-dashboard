const fs = require("node:fs");

let code = fs.readFileSync("src/pages/contracts/sign-flows/components/SignFlowDetailModal.tsx", "utf8");

const regex = /\{isLoadingHistory \? \([\s\S]*?\) : \(!history \|\| history\.length === 0\) \? \([\s\S]*?\) : \([\s\S]*?<Space direction="vertical" size="middle" className="w-full">\s*\{history\.map\(\(h\) => \{/;

const replacement = `{(() => {
								if (isLoadingHistory) {
									return <div className="flex justify-center p-4"><Spin /></div>;
								}
								if (!history || history.length === 0) {
									return <Empty description="تاریخچه‌ای وجود ندارد" />;
								}
								return (
									<Space direction="vertical" size="middle" className="w-full">
										{history.map((h) => {`;

code = code.replace(regex, replacement);
fs.writeFileSync("src/pages/contracts/sign-flows/components/SignFlowDetailModal.tsx", code);
