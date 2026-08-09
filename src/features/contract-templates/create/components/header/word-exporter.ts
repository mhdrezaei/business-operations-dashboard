import { message } from "antd";
import { saveAs } from "file-saver";
// src/features/contract-templates/create/components/word-exporter.ts
import { asBlob } from "html-docx-js-typescript";

export async function exportEditorToWord(htmlContent: string, fileName = "contract-template") {
	const hideLoading = message.loading("در حال آماده‌سازی و ساخت فایل Word...", 0);

	try {
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
                ${htmlContent}
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
