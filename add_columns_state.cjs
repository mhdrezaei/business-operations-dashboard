const fs = require("node:fs");

let c = fs.readFileSync("src/pages/contracts/sign-flows/index.tsx", "utf8");

c = c.replace(/actionRef=\{actionRef\}/, `actionRef={actionRef}
				columnsState={{
					defaultValue: {
						started_at: { show: false },
						finished_at: { show: false },
						cancel_reason: { show: false },
					}
				}}`);

fs.writeFileSync("src/pages/contracts/sign-flows/index.tsx", c);
