const fs = require("node:fs");

let code = fs.readFileSync("src/pages/contracts/sign-flows/components/SignFlowDetailModal.tsx", "utf8");

code = code.replace(
	/(\t*)<\/Space>\r?\n\s*\)\}\r?\n\s*<\/Scrollbar>/,
	"$1</Space>\n$1);\n$1})()}\n$1</Scrollbar>",
);

fs.writeFileSync("src/pages/contracts/sign-flows/components/SignFlowDetailModal.tsx", code);
