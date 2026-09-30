const fs = require("node:fs");

let c = fs.readFileSync("src/router/routes/modules/contract.ts", "utf8");

if (!c.includes("SignFlowListPage")) {
	const importStr = "const SignFlowListPage = lazy(() => import(\"#src/pages/contracts/sign-flows\"));\n";
	c = c.replace(/const ContractTemplate.*\n/, match => match + importStr);

	const routeStr = `
			{
				path: "/contracts/sign-flows",
				Component: SignFlowListPage,
				handle: {
					icon: createElement(UnorderedListOutlined),
					title: "گردش‌های امضای قرارداد",
					accessDomain: "contracts",
					accessAction: "view",
				},
			},`;

	c = c.replace(/children:\s*\[/, match => match + routeStr);

	fs.writeFileSync("src/router/routes/modules/contract.ts", c);
}
