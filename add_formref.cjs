const fs = require("node:fs");

let c = fs.readFileSync("src/pages/contracts/sign-flows/constants.tsx", "utf8");

c = c.replace(/getSignFlowColumns\(serviceOptions:\s*Array<\{ label: any, value: any \}>\)/, "getSignFlowColumns(serviceOptions: Array<{ label: any, value: any }>, formRef: any)");

c = c.replace(/fieldProps: \{([\s\S]*?options:[\s\S]*?)\}/g, (match, p1) => {
	return `fieldProps: {${p1},\n\t\t\tonChange: () => formRef?.current?.submit()\n\t\t\t}`;
});

fs.writeFileSync("src/pages/contracts/sign-flows/constants.tsx", c);
