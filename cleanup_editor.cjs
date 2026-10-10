const fs = require("node:fs");

let c = fs.readFileSync("src/features/contract/list/ui/components/ContractTemplateEditorModal.tsx", "utf8");

c = c.replace(/import \{ fetchSignFlowPreview, requestOfficialPdf \} from "\.\.\/\.\.\/\.\.\/api\/contracts\.api";/, "import { requestOfficialPdf } from \"../../../api/contracts.api\";");

c = c.replace(/import \{ SignFlowPreviewModal \} from "\.\/SignFlowPreviewModal";\r?\n?/, "");

c = c.replace(/\tconst \[signFlowModalOpen, setSignFlowModalOpen\] = useState\(false\);\r?\n\tconst \[signFlowLoading, setSignFlowLoading\] = useState\(false\);\r?\n\tconst \[signFlowData, setSignFlowData\] = useState<any>\(null\);\r?\n?/, "");

c = c.replace(/\t\tsetSignFlowLoading\(true\);\r?\n/, "");

const handleFinalApprovalRegex = /\/\/ 3\. Fetch Sign Flow preview[\s\S]*?setSignFlowModalOpen\(true\);/;
c = c.replace(handleFinalApprovalRegex, "message.success(\"نسخه نهایی با موفقیت آپلود شد.\");\n\t\t\tonClose();");

c = c.replace(/\t\t\tsetSignFlowLoading\(false\);\r?\n/, "");

const handleStartSignFlowRegex = /\tconst handleStartSignFlow = \(\) => \{[\s\S]*?onClose\(\);\r?\n\t\};\r?\n\r?\n/;
c = c.replace(handleStartSignFlowRegex, "");

const signFlowComponentRegex = /\t\t\t<SignFlowPreviewModal[\s\S]*?\/>\r?\n/;
c = c.replace(signFlowComponentRegex, "");

fs.writeFileSync("src/features/contract/list/ui/components/ContractTemplateEditorModal.tsx", c);
