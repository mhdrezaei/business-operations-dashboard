// src/features/contract-templates/create/components/word-importer.ts
import type { Editor } from "@tiptap/react";
import { message } from "antd";
import mammoth from "mammoth";

export async function importWordToEditor(file: File, editor: Editor, onComplete?: () => void) {
	message.loading({ content: "در حال پردازش امن فایل و تبدیل چیدمان‌ها...", key: "import-word", duration: 0 });

	await new Promise(resolve => setTimeout(resolve, 100));

	try {
		const arrayBuffer = await file.arrayBuffer();
		const result = await mammoth.convertToHtml(
			{ arrayBuffer },
			{
				convertImage: mammoth.images.imgElement((image) => {
					return image.read("base64").then((imageBuffer) => {
						return { src: `data:${image.contentType};base64,${imageBuffer}` };
					});
				}),
				styleMap: [
					"p[style-name='Heading 1'] => h1:fresh",
					"p[style-name='Heading 2'] => h2:fresh",
					"p[style-name='Heading 3'] => h3:fresh",
				],
			},
		);

		if (!result || !result.value) {
			message.warning({ content: "این فایل ورد فاقد محتوای متنی است یا با فرمت پشتیبانی‌شده همخوانی ندارد.", key: "import-word", duration: 4 });
			return;
		}

		const parser = new DOMParser();
		const doc = parser.parseFromString(result.value, "text/html");

		const allTables = Array.from(doc.querySelectorAll("table"));

		allTables.forEach((table) => {
			const container = doc.createElement("div");

			const rows = Array.from(table.querySelectorAll("tr"));
			rows.forEach((row) => {
				const cells = Array.from(row.querySelectorAll("td, th"));

				const cellTexts = cells
					.map(cell => cell.textContent?.trim())
					.filter(text => text && text.length > 0);

				if (cellTexts.length > 0) {
					const p = doc.createElement("p");

					if (cellTexts.length === 1) {
						p.innerHTML = cellTexts[0] as string;
					}
					else {
						const firstCol = `<strong>${cellTexts[0]}</strong>`;
						const otherCols = cellTexts.slice(1).join(" &nbsp;&nbsp;|&nbsp;&nbsp; ");
						p.innerHTML = `${firstCol} &nbsp;&nbsp;&nbsp;&nbsp; ${otherCols}`;
					}

					container.appendChild(p);
				}
			});

			if (container.childNodes.length > 0) {
				container.style.marginTop = "1rem";
				container.style.marginBottom = "1rem";
				table.replaceWith(container);
			}
			else {
				table.remove();
			}
		});

		const finalHtml = doc.body.innerHTML;

		if (finalHtml) {
			editor.chain().focus().setContent(finalHtml).run();
			message.success({ content: "فایل با موفقیت و ۱۰۰٪ بدون کرش ایمپورت شد.", key: "import-word", duration: 3 });
		}
		else {
			message.warning({ content: "فایل خوانده شد اما متنی پیدا نشد.", key: "import-word", duration: 3 });
		}
	}
	catch (error) {
		console.error("Word Import Error:", error);
		message.error({ content: "خطا در پردازش فایل ورد. فایل نامعتبر است.", key: "import-word", duration: 3 });
	}
	finally {
		if (onComplete)
			onComplete();
	}
}
