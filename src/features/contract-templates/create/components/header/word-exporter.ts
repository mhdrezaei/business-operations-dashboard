// src/features/contract-templates/create/components/word-exporter.ts
import { message } from "antd";
import { saveAs } from "file-saver";
import { asBlob } from "html-docx-js-typescript";
import { getVariable } from "../editor/variables/registry";

export async function exportEditorToWord(htmlContent: string, fileName = "contract-template") {
	const hideLoading = message.loading("در حال آماده‌سازی و ساخت فایل Word...", 0);

	try {
		const parser = new DOMParser();
		const doc = parser.parseFromString(htmlContent, "text/html");

		doc.querySelectorAll("button, svg, script, noscript, style, iframe").forEach(el => el.remove());

		const allElements = Array.from(doc.querySelectorAll("*")).reverse();

		allElements.forEach((el) => {
			if (!el.parentNode)
				return;

			const titleAttr = el.getAttribute("title") || "";
			const isVariable = titleAttr.startsWith("{$") || el.hasAttribute("data-type") || el.hasAttribute("key") || el.getAttribute("contenteditable") === "false" || el.tagName.toLowerCase() === "variable-chip" || el.tagName.toLowerCase() === "node-view-wrapper";

			if (isVariable) {
				let key = el.getAttribute("key") || el.getAttribute("data-id") || el.getAttribute("data-key");
				if (!key && titleAttr.startsWith("{$")) {
					key = titleAttr.replace("{$", "").replace("}", "");
				}

				let label = "";
				if (key) {
					const variableDef = getVariable(key);
					label = variableDef ? variableDef.label : key;
				}

				if (!label) {
					label = el.textContent?.replace("X", "")?.trim() || "متغیر";
				}

				const strong = doc.createElement("strong");
				strong.textContent = ` [${label}] `;
				strong.style.color = "#1677ff";

				el.replaceWith(strong);
			}
		});

		Array.from(doc.querySelectorAll("*")).forEach((el) => {
			const attrs = Array.from(el.attributes);
			for (const attr of attrs) {
				const attrName = attr.name.toLowerCase();
				const safeAttributes = ["style", "dir", "colspan", "rowspan", "href", "src"];
				if (!safeAttributes.includes(attrName)) {
					el.removeAttribute(attrName);
				}
			}
		});

		const cleanedContent = doc.body.innerHTML;

		const fullHtml = `
            <!DOCTYPE html>
            <html dir="rtl" lang="fa">
            <head>
                <meta charset="UTF-8">
                <style>
                    body {
                        font-family: 'Tahoma', 'Arial', sans-serif;
                        direction: rtl;
                        text-align: justify;
                        line-height: 1.8;
                        font-size: 11pt;
                    }
                    table {
                        border-collapse: collapse;
                        width: 100%;
                        margin-bottom: 1rem;
                    }
                    td, th {
                        border: 1px solid #000000;
                        padding: 8px;
                        text-align: right;
                    }
                    th {
                        background-color: #f2f2f2;
                        font-weight: bold;
                    }
                </style>
            </head>
            <body>
                ${cleanedContent}
            </body>
            </html>
        `;

		const docxBlob = await asBlob(fullHtml, {
			orientation: "portrait",
			margins: {
				top: 1440,
				right: 1440,
				bottom: 1440,
				left: 1440,
			},
		});

		const blobData = Array.isArray(docxBlob) ? docxBlob[0] : docxBlob;
		saveAs(blobData as Blob, `${fileName}.docx`);

		hideLoading();
		message.success("فایل Word با موفقیت روی سیستم شما ذخیره شد.");
	}
	catch (error) {
		hideLoading();
		console.error("Word Export Error:", error);
		message.error("خطا در ساخت فایل Word. لطفاً مجدداً تلاش کنید.");
	}
}
