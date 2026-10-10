const fs = require("node:fs");

let code = fs.readFileSync("src/pages/contracts/sign-flows/components/SignFlowDetailModal.tsx", "utf8");

code = code.replace(
	/\}\)\}\n\s*<\/Space>\n\s*\)\}\n\s*<\/Scrollbar>/g,
	"})}\n\t\t\t\t\t\t\t\t</Space>\n\t\t\t\t\t\t\t);\n\t\t\t\t\t\t})()}\n\t\t\t\t\t\t</Scrollbar>",
);

fs.writeFileSync("src/pages/contracts/sign-flows/components/SignFlowDetailModal.tsx", code);
