const fs = require("node:fs");

let c = fs.readFileSync("src/pages/contracts/sign-flows/index.tsx", "utf8");

if (!c.includes("formRef = useRef")) {
	c = c.replace(/import type \{ ActionType \} from "@ant-design\/pro-components";/, "import type { ActionType, ProFormInstance } from \"@ant-design/pro-components\";");
	c = c.replace(/const actionRef = useRef<ActionType>\(null\);/, "const actionRef = useRef<ActionType>(null);\n\tconst formRef = useRef<ProFormInstance>();");
	c = c.replace(/getSignFlowColumns\(serviceOptions\)/, "getSignFlowColumns(serviceOptions, formRef)");
	c = c.replace(/actionRef=\{actionRef\}/, "actionRef={actionRef}\n\t\t\t\tformRef={formRef}");
	fs.writeFileSync("src/pages/contracts/sign-flows/index.tsx", c);
}
