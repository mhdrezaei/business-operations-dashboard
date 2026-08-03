// src/features/contract-templates/create/components/TemplatePrintPreviewModal.tsx
import type { Editor } from "@tiptap/react";
import { FilePdfOutlined, PrinterOutlined } from "@ant-design/icons";
import { DOMSerializer } from "@tiptap/pm/model";
import { Button, message, Modal, theme } from "antd";
import React, { useMemo } from "react";
// 🔴 فراخوانی استور برای دریافت یکپارچه‌ی داده‌ها
import { useTemplateStore } from "../../store/useTemplateStore";
import { useVariableRegistry } from "./editor/variables/VariableRegistryContext";

// 🔴 پراپ‌های اضافی حذف شدند
interface TemplatePrintPreviewModalProps {
	isOpen: boolean
	onClose: () => void
	editor: Editor | null
}

export default function TemplatePrintPreviewModal({ isOpen, onClose, editor }: TemplatePrintPreviewModalProps) {
	const { token } = theme.useToken();

	// 🔴 خواندن مستقیم هدر و فونت‌ها از استور
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
		const text = headerData?.extra_text || "";

		return `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 35px;">
                <!-- سمت راست: لوگو و متن ثابت -->
                <div style="display: flex; flex-direction: column; align-items: flex-start;">
                    <img src="${logo}" style="max-height: 45px; object-fit: contain; margin-bottom: 12px; max-width: 250px;" />
                    ${text ? `<div style="font-size: 13px; font-weight: normal; color: #000;">${text}</div>` : ""}
                </div>
                <!-- سمت چپ: شماره قرارداد و نوار آبی -->
                ${showContractNo
					? `
                <div style="display: flex; flex-direction: column; align-items: center; width: 180px; padding-top: 10px;">
                    <div style="font-weight: bold; font-size: 13px; margin-bottom: 8px; color: #000;">شماره قرارداد : ۱۴۰۳/۱۲۳۴</div>
                    <div style="width: 100%; height: 14px; background-color: #465b8e; clip-path: polygon(15px 0, 100% 0, 100% 100%, 0% 100%);"></div>
                </div>
                `
					: ""}
            </div>
        `;
	}, [headerData]);

	const processedHTML = useMemo(() => {
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

	const handlePrint = (isPDF: boolean = false) => {
		const printWindow = window.open("", "_blank");
		if (!printWindow)
			return;

		if (isPDF) {
			message.info("لطفاً در پنجره چاپ، قسمت Destination را روی «Save as PDF» تنظیم کنید.");
		}

		// 🔴 استفاده از f.family || f.name تا مطمئن شویم در پرینت هم دقیقاً نام صحیح اعمال می‌شود
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
                /* استایل برای حفظ کردن تگ‌های inline تیپ‌تپ مثل font-family */
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
            <div class="print-container">
                ${headerHTML}
                ${processedHTML}
            </div>
        `);
		printWindow.document.close();
		printWindow.focus();

		// کمی تأخیر بیشتر (۶۰۰ میلی‌ثانیه) تا فونت‌ها کاملاً توسط مرورگر لود شوند و بعد پنجره چاپ باز شود
		setTimeout(() => {
			printWindow.print();
			printWindow.close();
		}, 600);
	};

	return (
		<Modal
			title="پیش‌نمایش چاپ قرارداد"
			open={isOpen}
			onCancel={onClose}
			width={850}
			zIndex={10000}
			footer={[
				<Button key="back" onClick={onClose}>
					بستن
				</Button>,
				<Button key="pdf" type="default" icon={<FilePdfOutlined />} onClick={() => handlePrint(true)}>
					دانلود PDF
				</Button>,
				<Button key="print" type="primary" icon={<PrinterOutlined />} onClick={() => handlePrint(false)}>
					چاپ سند
				</Button>,
			]}
		>
			<div
				className="max-h-[65vh] overflow-y-auto p-8 rounded-lg border shadow-inner my-4 custom-scrollbar"
				style={{
					backgroundColor: "#ffffff",
					color: "#000000",
					borderColor: token.colorBorderSecondary,
					lineHeight: "2.2",
					textAlign: "justify",
				}}
			>
				<div dangerouslySetInnerHTML={{ __html: headerHTML }} />
				<div dangerouslySetInnerHTML={{ __html: processedHTML }} />
			</div>
		</Modal>
	);
}
