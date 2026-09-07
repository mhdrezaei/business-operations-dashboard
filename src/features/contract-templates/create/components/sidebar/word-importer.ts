// src/features/contract-templates/create/components/sidebar/word-importer.ts
import type { Editor } from "@tiptap/react";
import { message } from "antd";
import JSZip from "jszip";
import mammoth from "mammoth";

// ─────────────────────────────────────────────────────────────────────────────
// HTML → ProseMirror JSON converter
// We bypass TipTap's HTML parser entirely for tables to avoid TableMap crashes
// ─────────────────────────────────────────────────────────────────────────────

function inlineStylesToPmMarks(el: HTMLElement): any[] {
	const marks: any[] = [];
	if (el.tagName === "STRONG" || el.tagName === "B" || el.style.fontWeight === "bold" || Number.parseInt(el.style.fontWeight) >= 700)
		marks.push({ type: "bold" });
	if (el.tagName === "EM" || el.tagName === "I" || el.style.fontStyle === "italic")
		marks.push({ type: "italic" });
	if (el.tagName === "U" || el.style.textDecoration?.includes("underline"))
		marks.push({ type: "underline" });
	if (el.tagName === "S" || el.style.textDecoration?.includes("line-through"))
		marks.push({ type: "strike" });
	if (el.style.fontSize) {
		marks.push({ type: "textStyle", attrs: { fontSize: el.style.fontSize, fontFamily: null, color: null } });
	}
	return marks;
}

function collectTextNodes(el: Node, inheritedMarks: any[] = []): any[] {
	const nodes: any[] = [];

	el.childNodes.forEach((child) => {
		if (child.nodeType === Node.TEXT_NODE) {
			const text = child.textContent || "";
			if (text) {
				const node: any = { type: "text", text };
				if (inheritedMarks.length > 0)
					node.marks = inheritedMarks;
				nodes.push(node);
			}
		}
		else if (child.nodeType === Node.ELEMENT_NODE) {
			const childEl = child as HTMLElement;
			const childMarks = [...inheritedMarks, ...inlineStylesToPmMarks(childEl)];
			nodes.push(...collectTextNodes(childEl, childMarks));
		}
	});

	return nodes;
}

function cellToPmNode(cell: HTMLElement, cellType: "tableCell" | "tableHeader"): any {
	const colspan = Number.parseInt(cell.getAttribute("colspan") || "1", 10) || 1;
	const rowspan = Number.parseInt(cell.getAttribute("rowspan") || "1", 10) || 1;
	const attrs: any = { colspan, rowspan, colwidth: null };

	if (cell.style.backgroundColor)
		attrs.background = cell.style.backgroundColor;

	// Collect paragraphs from the cell content
	const contentNodes: any[] = [];
	let hasParagraph = false;

	cell.childNodes.forEach((child) => {
		if (child.nodeType === Node.ELEMENT_NODE) {
			const childEl = child as HTMLElement;
			const tag = childEl.tagName.toLowerCase();

			if (tag === "p") {
				hasParagraph = true;
				const textAlign = childEl.style.textAlign || undefined;
				const paraAttrs: any = {};
				if (textAlign)
					paraAttrs.textAlign = textAlign;

				const inlineNodes = collectTextNodes(childEl);
				contentNodes.push({
					type: "paragraph",
					...(Object.keys(paraAttrs).length > 0 ? { attrs: paraAttrs } : {}),
					content: inlineNodes.length > 0 ? inlineNodes : undefined,
				});
			}
			else if (/^h[1-6]$/.test(tag)) {
				hasParagraph = true;
				const level = Number.parseInt(tag[1]);
				const inlineNodes = collectTextNodes(childEl);
				contentNodes.push({
					type: "heading",
					attrs: { level },
					content: inlineNodes.length > 0 ? inlineNodes : undefined,
				});
			}
		}
	});

	if (!hasParagraph) {
		// Treat entire cell as one paragraph
		const inlineNodes = collectTextNodes(cell);
		contentNodes.push({
			type: "paragraph",
			content: inlineNodes.length > 0 ? inlineNodes : undefined,
		});
	}

	return {
		type: cellType,
		attrs,
		content: contentNodes.length > 0 ? contentNodes : [{ type: "paragraph" }],
	};
}

function tableToPmNode(table: HTMLElement): any {
	// Collect all tr elements directly (not nested)
	const rowEls = Array.from(table.querySelectorAll("tr")) as HTMLElement[];

	// Build a normalized grid to detect max column count
	const grid: number[][] = [];
	let maxCols = 0;

	rowEls.forEach((row, ri) => {
		if (!grid[ri])
			grid[ri] = [];
		const cells = Array.from(row.querySelectorAll("td, th")) as HTMLElement[];
		let ci = 0;
		cells.forEach((cell) => {
			while (grid[ri][ci] !== undefined) ci++;
			const cs = Math.max(1, Number.parseInt(cell.getAttribute("colspan") || "1", 10) || 1);
			const rs = Math.min(
				Math.max(1, Number.parseInt(cell.getAttribute("rowspan") || "1", 10) || 1),
				rowEls.length - ri,
			);
			for (let r = 0; r < rs; r++) {
				for (let c = 0; c < cs; c++) {
					if (!grid[ri + r])
						grid[ri + r] = [];
					grid[ri + r][ci + c] = ri;
				}
			}
			ci += cs;
		});
		if (grid[ri].length > maxCols)
			maxCols = grid[ri].length;
	});

	// Build ProseMirror rows
	const pmRows: any[] = rowEls.map((row, ri) => {
		const cells = Array.from(row.querySelectorAll("td, th")) as HTMLElement[];
		const pmCells: any[] = [];
		let ci = 0;

		for (let col = 0; col < maxCols; col++) {
			if (grid[ri][col] === undefined) {
				// Fill hole
				pmCells.push({ type: "tableCell", attrs: { colspan: 1, rowspan: 1, colwidth: null }, content: [{ type: "paragraph" }] });
				grid[ri][col] = ri;
			}
			else if (grid[ri][col] === ri) {
				// This row owns this cell
				const cell = cells[ci];
				if (!cell) {
					pmCells.push({ type: "tableCell", attrs: { colspan: 1, rowspan: 1, colwidth: null }, content: [{ type: "paragraph" }] });
					ci++;
					continue;
				}
				const cs = Math.max(1, Number.parseInt(cell.getAttribute("colspan") || "1", 10) || 1);
				const cellType = cell.tagName.toLowerCase() === "th" ? "tableHeader" : "tableCell";
				pmCells.push(cellToPmNode(cell, cellType));
				col += cs - 1;
				ci++;
			}
			// else: spanned from previous row — skip
		}

		return { type: "tableRow", content: pmCells };
	});

	return { type: "table", content: pmRows };
}

function htmlToPmDoc(html: string): any {
	const parser = new DOMParser();
	const doc = parser.parseFromString(html, "text/html");

	// Fix inline font sizes
	(Array.from(doc.querySelectorAll("span[class*='font-size-']")) as HTMLElement[]).forEach((span) => {
		const m = span.className.match(/font-size-(\d+)/);
		if (m) {
			span.style.fontSize = `${m[1]}pt`;
			span.className = span.className.replace(/font-size-\d+/, "").trim();
		}
	});

	// Fix alignment classes → inline styles
	(Array.from(doc.querySelectorAll(".align-center,.align-right,.align-left,.align-justify")) as HTMLElement[]).forEach((el) => {
		if (el.classList.contains("align-center"))
			el.style.textAlign = "center";
		else if (el.classList.contains("align-right"))
			el.style.textAlign = "right";
		else if (el.classList.contains("align-left"))
			el.style.textAlign = "left";
		else if (el.classList.contains("align-justify"))
			el.style.textAlign = "justify";
		el.className = el.className.replace(/align-(center|right|left|justify)/g, "").trim();
	});

	const content: any[] = [];

	doc.body.childNodes.forEach((node) => {
		if (node.nodeType !== Node.ELEMENT_NODE)
			return;
		const el = node as HTMLElement;
		const tag = el.tagName.toLowerCase();

		if (tag === "table") {
			content.push(tableToPmNode(el));
		}
		else if (/^h[1-6]$/.test(tag)) {
			const level = Number.parseInt(tag[1]);
			const inlineNodes = collectTextNodes(el);
			content.push({
				type: "heading",
				attrs: { level },
				content: inlineNodes.length > 0 ? inlineNodes : undefined,
			});
		}
		else if (tag === "p" || tag === "div") {
			const textAlign = el.style.textAlign || undefined;
			const paraAttrs: any = {};
			if (textAlign)
				paraAttrs.textAlign = textAlign;
			const inlineNodes = collectTextNodes(el);
			content.push({
				type: "paragraph",
				...(Object.keys(paraAttrs).length > 0 ? { attrs: paraAttrs } : {}),
				content: inlineNodes.length > 0 ? inlineNodes : undefined,
			});
		}
		else if (tag === "ul" || tag === "ol") {
			const listType = tag === "ul" ? "bulletList" : "orderedList";
			const items = Array.from(el.querySelectorAll("li")).map(li => ({
				type: "listItem",
				content: [{ type: "paragraph", content: collectTextNodes(li) }],
			}));
			if (items.length > 0)
				content.push({ type: listType, content: items });
		}
	});

	if (content.length === 0)
		content.push({ type: "paragraph" });

	return { type: "doc", content };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main import function
// ─────────────────────────────────────────────────────────────────────────────

export async function importWordToEditor(file: File, editor: Editor, onComplete?: () => void) {
	message.loading({ content: "در حال پردازش فایل...", key: "import-word", duration: 0 });
	await new Promise(resolve => setTimeout(resolve, 100));

	try {
		const arrayBuffer = await file.arrayBuffer();

		// Extract cell background colors from raw XML
		const zip = await JSZip.loadAsync(arrayBuffer);
		const docXmlFile = zip.file("word/document.xml");
		let tableProperties: { bgColor: string | null }[][][] = [];

		if (docXmlFile) {
			const xmlStr = await docXmlFile.async("string");
			const xmlDoc = new DOMParser().parseFromString(xmlStr, "text/xml");
			const NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

			let wTables = Array.from(xmlDoc.getElementsByTagNameNS(NS, "tbl"));
			if (wTables.length === 0)
				wTables = Array.from(xmlDoc.getElementsByTagName("w:tbl"));

			tableProperties = wTables.map((tbl) => {
				const rows = Array.from(tbl.childNodes).filter((n: any) => n.localName === "tr");
				return rows.map(row =>
					Array.from(row.childNodes)
						.filter((n: any) => n.localName === "tc")
						.map((cell) => {
							const pr = Array.from(cell.childNodes).find((n: any) => n.localName === "tcPr") as any;
							if (!pr)
								return { bgColor: null };
							const shd = Array.from(pr.childNodes).find((n: any) => n.localName === "shd") as any;
							if (!shd)
								return { bgColor: null };
							const fill = shd.getAttribute("w:fill");
							return { bgColor: fill && fill !== "auto" && fill !== "FFFFFF" ? `#${fill}` : null };
						}),
				);
			});
		}

		// Convert with Mammoth
		const styleMap: string[] = [
			"p[style-name='Heading 1'] => h1:fresh",
			"p[style-name='Heading 2'] => h2:fresh",
			"p[style-name='Heading 3'] => h3:fresh",
			"p[style-name='Heading 4'] => h4:fresh",
			"p[style-name='تیتر 1'] => h1:fresh",
			"p[style-name='تیتر 2'] => h2:fresh",
			"p[style-name='تیتر 3'] => h3:fresh",
			"p[style-name$='align-center'] => p.align-center:fresh",
			"p[style-name$='align-right'] => p.align-right:fresh",
			"p[style-name$='align-left'] => p.align-left:fresh",
			"p[style-name$='align-both'] => p.align-justify:fresh",
		];
		for (let sz = 8; sz <= 72; sz++) styleMap.push(`r[style-name='fontSize-${sz}'] => span.font-size-${sz}`);

		const result = await mammoth.convertToHtml(
			{ arrayBuffer },
			{
				styleMap,
				transformDocument: (el: any) => {
					if (el.children) {
						el.children = el.children.map((c: any) => {
							if (c.type === "run" && c.fontSize)
								c.styleName = `fontSize-${Math.round(c.fontSize)}`;
							if (c.type === "paragraph" && c.alignment)
								c.styleName = `${c.styleName || "Normal"} align-${c.alignment}`;
							return c;
						});
					}
					if (el.type === "run" && el.fontSize)
						el.styleName = `fontSize-${Math.round(el.fontSize)}`;
					if (el.type === "paragraph" && el.alignment)
						el.styleName = `${el.styleName || "Normal"} align-${el.alignment}`;
					return el;
				},
				convertImage: mammoth.images.imgElement(image =>
					image.read("base64").then(buf => ({ src: `data:${image.contentType};base64,${buf}` })),
				),
			},
		);

		if (!result?.value) {
			message.warning({ content: "فایل ورد فاقد محتوای متنی است.", key: "import-word", duration: 4 });
			return;
		}

		// Apply bgColors from XML into HTML before conversion
		const tempParser = new DOMParser();
		const tempDoc = tempParser.parseFromString(result.value, "text/html");
		const htmlTables = Array.from(tempDoc.querySelectorAll("table"));
		htmlTables.forEach((table, ti) => {
			const tProps = tableProperties[ti] || [];
			const rows = Array.from(table.querySelectorAll("tr"));
			rows.forEach((row, ri) => {
				const cells = Array.from(row.querySelectorAll("td, th")) as HTMLElement[];
				cells.forEach((cell, ci) => {
					const bg = tProps[ri]?.[ci]?.bgColor;
					if (bg)
						cell.style.backgroundColor = bg;
				});
			});
		});

		// Convert HTML → ProseMirror JSON (no TipTap HTML parser involved for tables)
		const pmDoc = htmlToPmDoc(tempDoc.body.innerHTML);

		// Set content as safe ProseMirror JSON (no HTML parser, no PaginationPlus crash)
		editor.commands.setContent(pmDoc, false);
		message.success({ content: "فایل با موفقیت ایمپورت شد.", key: "import-word", duration: 3 });
	}
	catch (error) {
		console.error("Word Import Error:", error);
		message.error({ content: "خطا در پردازش فایل ورد.", key: "import-word", duration: 3 });
	}
	finally {
		if (onComplete)
			onComplete();
	}
}
