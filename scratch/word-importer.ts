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
	const textStyleAttrs: any = {};
	if (el.style.fontSize)
		textStyleAttrs.fontSize = el.style.fontSize;
	if (el.style.fontFamily)
		textStyleAttrs.fontFamily = el.style.fontFamily;
	if (el.style.color)
		textStyleAttrs.color = el.style.color;
	if (Object.keys(textStyleAttrs).length > 0) {
		marks.push({ type: "textStyle", attrs: { fontSize: null, fontFamily: null, color: null, ...textStyleAttrs } });
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
			// Handle line breaks as hardBreak nodes
			if (childEl.tagName === "BR") {
				nodes.push({ type: "hardBreak" });
				return;
			}
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
				if (childEl.getAttribute("style"))
					paraAttrs.style = childEl.getAttribute("style");

				const inlineNodes = collectTextNodes(childEl);
				const paraNode: any = { type: "paragraph", content: inlineNodes.length > 0 ? inlineNodes : undefined };
				if (Object.keys(paraAttrs).length > 0)
					paraNode.attrs = paraAttrs;
				contentNodes.push(paraNode);
			}
			else if (/^h[1-6]$/.test(tag)) {
				hasParagraph = true;
				const level = Number.parseInt(tag[1]);
				const inlineNodes = collectTextNodes(childEl);
				const headAttrs: any = { level };
				if (childEl.style.textAlign)
					headAttrs.textAlign = childEl.style.textAlign;
				if (childEl.getAttribute("style"))
					headAttrs.style = childEl.getAttribute("style");
				contentNodes.push({
					type: "heading",
					attrs: headAttrs,
					content: inlineNodes.length > 0 ? inlineNodes : undefined,
				});
			}
		}
	});

	if (!hasParagraph) {
		// Treat entire cell as one paragraph
		const inlineNodes = collectTextNodes(cell);
		const paraAttrs: any = {};
		if (cell.style.textAlign)
			paraAttrs.textAlign = cell.style.textAlign;
		if (cell.getAttribute("style"))
			paraAttrs.style = cell.getAttribute("style");

		contentNodes.push({
			type: "paragraph",
			attrs: Object.keys(paraAttrs).length > 0 ? paraAttrs : undefined,
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
	(Array.from(doc.querySelectorAll("[class*='align-']")) as HTMLElement[]).forEach((el) => {
		const cls = el.className || "";
		if (cls.includes("align-center"))
			el.style.textAlign = "center";
		else if (cls.includes("align-right"))
			el.style.textAlign = "right";
		else if (cls.includes("align-left"))
			el.style.textAlign = "left";
		else if (cls.includes("align-justify") || cls.includes("align-both"))
			el.style.textAlign = "justify";
		el.className = cls.replace(/align-(center|right|left|justify|both)/g, "").trim();
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
			const headAttrs: any = { level };
			if (el.style.textAlign)
				headAttrs.textAlign = el.style.textAlign;
			if (el.getAttribute("style"))
				headAttrs.style = el.getAttribute("style");
			content.push({
				type: "heading",
				attrs: headAttrs,
				content: inlineNodes.length > 0 ? inlineNodes : undefined,
			});
		}
		else if (tag === "p" || tag === "div") {
			const textAlign = el.style.textAlign || undefined;
			const paraAttrs: any = {};
			if (textAlign)
				paraAttrs.textAlign = textAlign;
			if (el.getAttribute("style"))
				paraAttrs.style = el.getAttribute("style");
			const inlineNodes = collectTextNodes(el);
			const paraNode: any = { type: "paragraph", content: inlineNodes.length > 0 ? inlineNodes : undefined };
			if (Object.keys(paraAttrs).length > 0)
				paraNode.attrs = paraAttrs;
			content.push(paraNode);
		}
		else if (tag === "hr") {
			content.push({ type: "horizontalRule" });
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

export async function importWordToEditor(
	file: File,
	editor: Editor,
	onComplete?: () => void,
	onMissingFont?: (fontName: string) => Promise<string | null>, // Returns font family to use, or null to cancel
) {
	message.loading({ content: "در حال پردازش فایل...", key: "import-word", duration: 0 });
	await new Promise(resolve => setTimeout(resolve, 100));

	try {
		const arrayBuffer = await file.arrayBuffer();

		// Extract cell background colors and paragraph properties from raw XML
		const zip = await JSZip.loadAsync(arrayBuffer);
		const docXmlFile = zip.file("word/document.xml");
		let tableProperties: { bgColor: string | null }[][][] = [];
		const xmlParas: Array<{
			textAlign: string | null
			lineHeight: string | null
			marginTop: string | null
			marginBottom: string | null
			isPageBreak: boolean
		}> = [];
		let dominantFont: string | null = null;

		if (docXmlFile) {
			const xmlStr = await docXmlFile.async("string");

			// 1. Detect dominant font
			const fontCounts: Record<string, number> = {};
			const fontRegex = /<w:rFonts[^>]*?(?:w:ascii|w:cs|w:hAnsi|w:eastAsia)="([^"]+)"/g;
			let fontMatch;
			while ((fontMatch = fontRegex.exec(xmlStr)) !== null) {
				const fontName = fontMatch[1];
				// Ignore basic/theme fonts that might just be fallbacks
				if (fontName && !fontName.includes("Theme") && fontName !== "Times New Roman" && fontName !== "Arial") {
					fontCounts[fontName] = (fontCounts[fontName] || 0) + 1;
				}
			}

			// Check styles.xml for docDefaults
			const stylesFile = zip.file("word/styles.xml");
			if (stylesFile) {
				const stylesXml = await stylesFile.async("string");
				const defaultRegex = /<w:docDefaults>.*?<w:rFonts[^>]*?(?:w:ascii|w:cs|w:hAnsi)="([^"]+)"/s;
				const defMatch = defaultRegex.exec(stylesXml);
				if (defMatch && defMatch[1] && defMatch[1] !== "Times New Roman" && defMatch[1] !== "Arial") {
					fontCounts[defMatch[1]] = (fontCounts[defMatch[1]] || 0) + 1000;
				}
			}

			const sortedFonts = Object.entries(fontCounts).sort((a, b) => b[1] - a[1]);
			if (sortedFonts.length > 0) {
				dominantFont = sortedFonts[0][0];
			}

			// Ask user if we should use this font if it's missing
			let fontToApply: string | null = null;
			if (dominantFont && onMissingFont) {
				const resolvedFont = await onMissingFont(dominantFont);
				if (typeof resolvedFont === "string" && resolvedFont !== "") {
					fontToApply = resolvedFont;
				}
			}
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

			// Extract all paragraphs in document order
			let rawPList = Array.from(xmlDoc.getElementsByTagNameNS(NS, "p"));
			if (rawPList.length === 0)
				rawPList = Array.from(xmlDoc.getElementsByTagName("w:p"));

			rawPList.forEach((p) => {
				const jcEl = Array.from(p.childNodes).find((n: any) => n.localName === "pPr") as any;
				const jc = jcEl ? (Array.from(jcEl.childNodes).find((n: any) => n.localName === "jc") as any)?.getAttribute("w:val") : null;
				const spacing = jcEl ? (Array.from(jcEl.childNodes).find((n: any) => n.localName === "spacing") as any) : null;
				const before = spacing?.getAttribute("w:before");
				const after = spacing?.getAttribute("w:after");
				const line = spacing?.getAttribute("w:line");
				const lineRule = spacing?.getAttribute("w:lineRule");

				let isPageBreak = p.getElementsByTagName("w:lastRenderedPageBreak").length > 0 || p.getElementsByTagName("w:pageBreakBefore").length > 0;
				if (!isPageBreak) {
					const brs = Array.from(p.getElementsByTagName("w:br"));
					isPageBreak = brs.some((b: any) => b.getAttribute("w:type") === "page");
				}

				let lineHeight: string | null = null;
				if (line) {
					if (lineRule === "exact" || lineRule === "atLeast") {
						lineHeight = `${Number(line) / 20}pt`;
					}
					else {
						lineHeight = (Number(line) / 240).toFixed(2);
					}
				}

				let marginTop: string | null = null;
				if (before)
					marginTop = `${Math.round(Number(before) / 20)}pt`;

				let marginBottom: string | null = null;
				if (after)
					marginBottom = `${Math.round(Number(after) / 20)}pt`;

				let textAlign: string | null = null;
				if (jc === "center")
					textAlign = "center";
				else if (jc === "right")
					textAlign = "right";
				else if (jc === "left")
					textAlign = "left";
				else if (jc === "both")
					textAlign = "justify";

				xmlParas.push({ textAlign, lineHeight, marginTop, marginBottom, isPageBreak });
			});
		}

		// Convert with Mammoth
		const styleMap: string[] = [
			"p[style-name='Heading 1'] => h1:fresh",
			"p[style-name='Heading 2'] => h2:fresh",
			"p[style-name='Heading 3'] => h3:fresh",
			"p[style-name='Heading 4'] => h4:fresh",
			"p[style-name='align-center'] => p.align-center:fresh",
			"p[style-name='align-right'] => p.align-right:fresh",
			"p[style-name='align-left'] => p.align-left:fresh",
			"p[style-name='align-both'] => p.align-justify:fresh",
			"p[style-name='align-justify'] => p.align-justify:fresh",
			"p[style-name='h1-align-center'] => h1.align-center:fresh",
			"p[style-name='h1-align-right'] => h1.align-right:fresh",
			"p[style-name='h2-align-center'] => h2.align-center:fresh",
			"p[style-name='h2-align-right'] => h2.align-right:fresh",
			"p[style-name='h3-align-center'] => h3.align-center:fresh",
			"p[style-name='h3-align-right'] => h3.align-right:fresh",
		];
		for (let sz = 8; sz <= 72; sz++) styleMap.push(`r[style-name='fontSize-${sz}'] => span.font-size-${sz}`);

		// Fully recursive transformer – must process ALL levels (including inside table cells)
		function transformElement(el: any): any {
			if (el.children) {
				el.children = el.children.map(transformElement);
			}
			if (el.type === "break" && el.breakType === "page") {
				return { type: "text", value: "[[PAGE_BREAK]]" };
			}
			if (el.type === "run" && el.fontSize) {
				el.styleName = `fontSize-${Math.round(el.fontSize)}`;
			}
			if (el.type === "paragraph") {
				const align = el.alignment;
				const name = (el.styleName || el.styleId || "").toLowerCase();
				if (name.includes("heading 1") || name.includes("تیتر 1") || name === "h1") {
					el.styleName = align ? `h1-align-${align}` : "Heading 1";
				}
				else if (name.includes("heading 2") || name.includes("تیتر 2") || name === "h2") {
					el.styleName = align ? `h2-align-${align}` : "Heading 2";
				}
				else if (name.includes("heading 3") || name.includes("تیتر 3") || name === "h3") {
					el.styleName = align ? `h3-align-${align}` : "Heading 3";
				}
				else if (align) {
					el.styleName = `align-${align}`;
				}
			}
			return el;
		}

		const result = await mammoth.convertToHtml(
			{ arrayBuffer },
			{
				styleMap,
				ignoreEmptyParagraphs: false,
				transformDocument: transformElement,
				convertImage: mammoth.images.imgElement(image =>
					image.read("base64").then(buf => ({ src: `data:${image.contentType};base64,${buf}` })),
				),
			},
		);

		if (!result?.value) {
			message.destroy("import-word"); message.warning({ content: "فایل ورد فاقد محتوای متنی است.", duration: 4 });
			return;
		}

		const tempParser = new DOMParser();
		const tempDoc = tempParser.parseFromString(result.value, "text/html");

		// Apply bgColors from XML into HTML tables
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

		// Enrich paragraphs with XML properties (alignment, spacing, page breaks)
		const htmlParas = Array.from(tempDoc.querySelectorAll("p, h1, h2, h3, h4, h5, h6")) as HTMLElement[];
		htmlParas.forEach((el, i) => {
			const xmlP = xmlParas[i];
			if (!xmlP)
				return;

			if (xmlP.textAlign && !el.style.textAlign)
				el.style.textAlign = xmlP.textAlign;
			if (xmlP.lineHeight && !el.style.lineHeight)
				el.style.lineHeight = xmlP.lineHeight;
			if (xmlP.marginTop && !el.style.marginTop)
				el.style.marginTop = xmlP.marginTop;
			if (xmlP.marginBottom && !el.style.marginBottom)
				el.style.marginBottom = xmlP.marginBottom;

			if (xmlP.isPageBreak && i > 0) {
				const prevEl = el.previousElementSibling;
				if (!prevEl || prevEl.tagName !== "HR") {
					const hr = tempDoc.createElement("hr");
					hr.className = "page-break";
					el.parentNode?.insertBefore(hr, el);
				}
			}
		});

		// Handle [[PAGE_BREAK]] text markers from Mammoth break runs
		Array.from(tempDoc.querySelectorAll("p")).forEach((p) => {
			if (p.textContent && p.textContent.includes("[[PAGE_BREAK]]")) {
				const hr = tempDoc.createElement("hr");
				hr.className = "page-break";
				p.textContent = p.textContent.replace("[[PAGE_BREAK]]", "").trim();
				if (!p.textContent) {
					p.parentNode?.replaceChild(hr, p);
				}
				else {
					const prevEl = p.previousElementSibling;
					if (!prevEl || prevEl.tagName !== "HR") {
						p.parentNode?.insertBefore(hr, p);
					}
				}
			}
		});

		// Fix inline font sizes
		(Array.from(tempDoc.querySelectorAll("span[class*='font-size-']")) as HTMLElement[]).forEach((span) => {
			const m = span.className.match(/font-size-(\d+)/);
			if (m) {
				span.style.fontSize = `${m[1]}pt`;
				span.className = span.className.replace(/font-size-\d+/, "").trim();
			}
		});

		// Fix alignment classes → inline styles
		(Array.from(tempDoc.querySelectorAll("[class*='align-']")) as HTMLElement[]).forEach((el) => {
			const cls = el.className || "";
			if (cls.includes("align-center"))
				el.style.textAlign = "center";
			else if (cls.includes("align-right"))
				el.style.textAlign = "right";
			else if (cls.includes("align-left"))
				el.style.textAlign = "left";
			else if (cls.includes("align-justify") || cls.includes("align-both"))
				el.style.textAlign = "justify";
			el.className = cls.replace(/align-(center|right|left|justify|both)/g, "").trim();
		});

		// Convert HTML → ProseMirror JSON (no TipTap HTML parser involved for tables)
		const pmDoc = htmlToPmDoc(tempDoc.body.innerHTML);

		// Set content as safe ProseMirror JSON (no HTML parser, no crash)
		editor.commands.setContent(pmDoc, { emitUpdate: true });
		if (fontToApply) {
			setTimeout(() => {
				editor.chain().selectAll().setFontFamily(fontToApply!).run();
				editor.commands.focus("start");
			}, 50);
		}
		message.destroy("import-word"); message.success({ content: "فایل با موفقیت ایمپورت شد.", duration: 3 });
	}
	catch (error) {
		console.error("Word Import Error:", error);
		message.destroy("import-word"); message.error({ content: "خطا در پردازش فایل ورد.", duration: 3 });
	}
	finally {
		message.destroy("import-word"); if (onComplete)
			onComplete();
	}
}
