const fs = require("node:fs");

let c = fs.readFileSync("src/pages/contracts/sign-flows/constants.tsx", "utf8");

// 1. hideInTable for started_at, finished_at, cancel_reason
c = c.replace(/title: "تاریخ شروع",[\s\S]*?search: false,/, match => `${match}\n\t\t\thideInTable: true,`);
c = c.replace(/title: "تاریخ پایان",[\s\S]*?search: false,/, match => `${match}\n\t\t\thideInTable: true,`);
c = c.replace(/title: "دلیل لغو\/رد",[\s\S]*?search: false,/, match => `${match}\n\t\t\thideInTable: true,`);

// 2. move state column to the end.
const stateRegex = /\t\t\{\s*title: "وضعیت",[\s\S]*?render: \(_, record\) => \{\s*const s = SIGN_FLOW_STATE_MAP\[record\.state\];\s*if \(!s\) return record\.state;\s*return <Tag color=\{s\.color\}>\{s\.label\}<\/Tag>;\s*\}\s*\},/;

const stateMatch = c.match(stateRegex);
if (stateMatch) {
	c = c.replace(stateRegex, "");
	c = c.replace(/\];\s*\}\s*$/, `\t\t${stateMatch[0].trim()}\n\t];\n}`);
}

fs.writeFileSync("src/pages/contracts/sign-flows/constants.tsx", c);
