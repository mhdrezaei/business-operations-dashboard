const fs = require("node:fs");

let c = fs.readFileSync("src/router/routes/modules/contract.ts", "utf8");
c = c.replace(/const ContractTemplate = lazy\(\(\) => import\("#src\/pages\/contracts\/contract-template"\)\);/, "const ContractTemplate = lazy(() => import(\"#src/pages/contracts/contract-template\"));\nconst SignFlowListPage = lazy(() => import(\"#src/pages/contracts/sign-flows\"));");
fs.writeFileSync("src/router/routes/modules/contract.ts", c);
