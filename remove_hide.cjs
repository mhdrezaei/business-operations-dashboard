const fs = require("node:fs");

let c = fs.readFileSync("src/pages/contracts/sign-flows/constants.tsx", "utf8");

c = c.replace(/title: "تاریخ شروع",[\s\S]*?hideInTable: true,/, match => match.replace("hideInTable: true,", ""));
c = c.replace(/title: "تاریخ پایان",[\s\S]*?hideInTable: true,/, match => match.replace("hideInTable: true,", ""));
c = c.replace(/title: "دلیل لغو\/رد",[\s\S]*?hideInTable: true,/, match => match.replace("hideInTable: true,", ""));

fs.writeFileSync("src/pages/contracts/sign-flows/constants.tsx", c);
