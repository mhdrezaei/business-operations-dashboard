import type { Editor } from "@tiptap/react";
import { FilePdfOutlined, PrinterOutlined } from "@ant-design/icons";
import { DOMSerializer } from "@tiptap/pm/model";
import { Button, message, Modal, theme } from "antd";
import React, { useMemo } from "react";
import { useTemplateStore } from "../../store/useTemplateStore";
import { useVariableRegistry } from "./editor/variables/VariableRegistryContext";

interface TemplatePrintPreviewModalProps {
	isOpen: boolean
	onClose: () => void
	editor: Editor | null
}

export default function TemplatePrintPreviewModal({ isOpen, onClose, editor }: TemplatePrintPreviewModalProps) {
	const { token } = theme.useToken();
	const { headerData, customFonts } = useTemplateStore();

	const registry = useVariableRegistry() as any;
	const staticGroups = registry?.staticGroups || [];

	const variableLabelsMap = useMemo(() => {
		const map: Record<string, string> = {};
		for (const group of staticGroups) {
			if (group.variables) {
				for (const variable of group.variables) {
					if (variable.key && variable.label) {
						map[variable.key] = variable.label;
					}
				}
			}
		}
		return map;
	}, [staticGroups]);

	const headerHTML = useMemo(() => {
		const defaultLogo = "/karashab-logo.png";
		const logo = headerData?.logo_url || headerData?.logo_data_url || defaultLogo;
		const showContractNo = headerData?.show_contract_number !== false;
		const contractNumber = "[شماره قرارداد / الحاقیه]";
		const text = headerData?.extra_text || "";
		const fontFamily = headerData?.header_font_family ? `'${headerData.header_font_family}', sans-serif` : "inherit";
		const fontSize = headerData?.header_font_size ? `${headerData.header_font_size}px` : "13px";

		return `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 35px; font-family: ${fontFamily};">
                <div style="display: flex; flex-direction: column; align-items: flex-start;">
                    <img src="${logo}" style="max-height: 45px; object-fit: contain; margin-bottom: 12px; max-width: 250px;" />
                    ${text ? `<div style="font-size: ${fontSize}; font-weight: normal; color: #000;">${text}</div>` : ""}
                </div>
                ${showContractNo
					? `
                <div style="display: flex; flex-direction: column; align-items: center; width: 180px; padding-top: 10px;">
                    <div style="font-weight: bold; font-size: 13px; margin-bottom: 8px; color: #000;">شماره قرارداد : ${contractNumber}</div>
                    <div style="width: 100%; height: 14px; background-color: #465b8e; clip-path: polygon(15px 0, 100% 0, 100% 100%, 0% 100%);"></div>
                </div>
                `
					: ""}
            </div>
        `;
	}, [headerData]);
	const rawContentHTML = useMemo(() => {
		if (!isOpen || !editor)
			return "";

		try {
			const json = editor.getJSON();
			const transformJSON = (node: any): any => {
				if (node.type === "templateVariable") {
					const key = node.attrs?.key || node.attrs?.id || "";
					const persianLabel = variableLabelsMap[key] || node.attrs?.label || key || "متغیر";
					return {
						type: "text",
						marks: [{ type: "bold" }],
						text: `[${persianLabel.trim()}]`,
					};
				}
				if (node.content && Array.isArray(node.content)) {
					return { ...node, content: node.content.map(transformJSON) };
				}
				return node;
			};

			const printJson = transformJSON(json);
			const pmNode = editor.schema.nodeFromJSON(printJson);
			const serializer = DOMSerializer.fromSchema(editor.schema);
			const fragment = serializer.serializeFragment(pmNode.content);

			const div = document.createElement("div");
			div.appendChild(fragment);

			return div.innerHTML;
		}
		catch (error) {
			console.error("خطا در پردازش متغیرها:", error);
			return editor.getHTML();
		}
	}, [isOpen, editor, variableLabelsMap]);

	const editorStyles = `
		.tiptap-content p { margin-top: 0; margin-bottom: 0.5em; line-height: 1.6; min-height: 1.5em; }
		.tiptap-content table { display: table !important; border-collapse: collapse; width: 100%; margin: 1rem 0; table-layout: auto; }
		.tiptap-content table tbody { display: table-row-group !important; }
		.tiptap-content table tr { display: table-row !important; }
		.tiptap-content table td, .tiptap-content table th { display: table-cell !important; border: 1px solid #94a3b8; padding: 6px 10px; vertical-align: top; box-sizing: border-box; min-width: 1em; word-break: break-word; }
		.tiptap-content table th { font-weight: bold; background-color: #f1f5f9; }
		.tiptap-content h1 { font-size: 22px; font-weight: bold; margin-top: 1em; margin-bottom: 0.5em; }
		.tiptap-content h2 { font-size: 18px; font-weight: bold; margin-top: 0.8em; margin-bottom: 0.4em; }
		.tiptap-content h3 { font-size: 16px; font-weight: bold; margin-top: 0.6em; margin-bottom: 0.3em; }
	`;

	// Split document into physical pages for beautiful preview
	const pages = useMemo(() => {
		if (!rawContentHTML)
			return [];
		// Clean up paragraph wrappers around PAGE_BREAK to avoid broken HTML
		const cleanHTML = rawContentHTML.replace(/<p[^>]*>\s*(?:<[^>]+>)*\[\[PAGE_BREAK\]\](?:<\/[^>]+>)*\s*<\/p>/g, "[[PAGE_BREAK]]");
		return cleanHTML.split("[[PAGE_BREAK]]");
	}, [rawContentHTML]);

	const printContentHTML = useMemo(() => {
		if (!rawContentHTML)
			return "";
		const cleanHTML = rawContentHTML.replace(/<p[^>]*>\s*(?:<[^>]+>)*\[\[PAGE_BREAK\]\](?:<\/[^>]+>)*\s*<\/p>/g, "[[PAGE_BREAK]]");
		return `<div class="tiptap-content">${cleanHTML.replace(/\[\[PAGE_BREAK\]\]/g, "</div><div style=\"page-break-after: always; clear: both;\"></div><div class=\"tiptap-content\">")}</div>`;
	}, [rawContentHTML]);

	const handlePrint = (isPDF: boolean = false) => {
		const printWindow = window.open("", "_blank");
		if (!printWindow)
			return;

		if (isPDF) {
			message.info("لطفاً در پنجره چاپ، قسمت Destination را روی «Save as PDF» تنظیم کنید.");
		}

		const customFontFaces = customFonts.map(f => `
            @font-face {
                font-family: '${f.family || f.name}';
                src: url('${f.file_url}') format('${f.format || "truetype"}');
                font-weight: normal;
                font-style: normal;
            }
        `).join("\n");

		printWindow.document.write(`
            <style>
                ${customFontFaces}
                html, body {
                    padding: 0;
                    margin: 0;
                    font-family: 'Vazirmatn', Tahoma, sans-serif;
                    direction: rtl;
                    background: #ffffff;
                    color: #000000;
                    line-height: 2.2;
                }
                .print-container {
                    max-width: 21cm;
                    margin: 0 auto;
                    padding: 1.5cm 2cm;
                    text-align: justify;
                }
                ${editorStyles}
                .print-container * {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                @media print {
                    body { -webkit-print-color-adjust: exact; }
                    .print-container { padding: 0 !important; }
                }
            </style>
        `);
		printWindow.document.write(`
            <table style="width: 100%; border-collapse: collapse; border: none;">
                <thead>
                    <tr>
                        <td style="border: none; padding-bottom: 10px;">
                            ${headerHTML}
                        </td>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="border: none;">
                            <div class="print-container">
                                ${printContentHTML}
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        `);
		printWindow.document.close();
		printWindow.focus();

		setTimeout(() => {
			printWindow.print();
			printWindow.close();
		}, 600);
	};

	return (
		<Modal
			title={<div className="text-lg font-bold">پیش‌نمایش چاپ قرارداد</div>}
			open={isOpen}
			onCancel={onClose}
			width={950}
			zIndex={10000}
			centered
			styles={{
				body: { padding: 0, overflow: "hidden", borderRadius: "0 0 8px 8px" },
				header: { padding: "20px 24px", borderBottom: `1px solid ${token.colorBorderSecondary}` },
			}}
			footer={(
				<div className="px-6 py-4 flex justify-end gap-3" style={{ borderTop: `1px solid ${token.colorBorderSecondary}` }}>
					<Button key="back" onClick={onClose} size="large">
						بستن
					</Button>
					<Button key="pdf" type="default" icon={<FilePdfOutlined />} onClick={() => handlePrint(true)} size="large">
						دانلود PDF
					</Button>
					<Button key="print" type="primary" icon={<PrinterOutlined />} onClick={() => handlePrint(false)} size="large">
						چاپ سند
					</Button>
				</div>
			)}
		>
			<div className="flex flex-col items-center max-h-[70vh] overflow-y-auto custom-scrollbar bg-slate-100 dark:bg-slate-800 p-8 gap-8">
				<style>{editorStyles}</style>
				{pages.map((pageHtml, index) => (
					<div
						key={index}
						className="bg-white shadow-xl flex-shrink-0"
						style={{
							width: "100%",
							maxWidth: "21cm",
							minHeight: "29.7cm",
							padding: "1.5cm 2cm",
							color: "#000000",
							lineHeight: "2.2",
							textAlign: "justify",
							direction: "rtl",
						}}
					>
						<div dangerouslySetInnerHTML={{ __html: headerHTML }} />
						<div className="tiptap-content" dangerouslySetInnerHTML={{ __html: pageHtml }} />
					</div>
				))}
			</div>
		</Modal>
	);
}
