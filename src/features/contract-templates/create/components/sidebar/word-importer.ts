import type { Editor } from "@tiptap/react";
import { message } from "antd";
import JSZip from "jszip";
import mammoth from "mammoth";

function collectTextNodes(el: Element, marks: any[] = []): any[] {
	const nodes: any[] = [];

	if (el.nodeName === "STRONG" || el.nodeName === "B") {
		marks = [...marks, { type: "bold" }];
	}
	else if (el.nodeName === "EM" || el.nodeName === "I") {
		marks = [...marks, { type: "italic" }];
	}
	else if (el.nodeName === "U") {
		marks = [...marks, { type: "underline" }];
	}
	else if (el.nodeName === "SPAN") {
		const spanMarks = [...marks];
		const style = (el as HTMLElement).style;
		const cssClass = (el as HTMLElement).className;

		if (style.color) {
			spanMarks.push({ type: "textStyle", attrs: { color: style.color } });
		}
		if (style.backgroundColor) {
			spanMarks.push({ type: "highlight", attrs: { color: style.backgroundColor } });
		}

		const fontSizeMatch = cssClass.match(/font-size-(\d+)/);
		if (fontSizeMatch) {
			spanMarks.push({ type: "textStyle", attrs: { fontSize: `${fontSizeMatch[1]}pt` } });
		}

		const fontFamilyMatch = cssClass.match(/font-family-(\S+)/);
		if (fontFamilyMatch) {
			const fontName = fontFamilyMatch[1].replace(/_/g, " ");
			spanMarks.push({ type: "textStyle", attrs: { fontFamily: fontName } });
		}

		marks = spanMarks;
	}

	el.childNodes.forEach((child) => {
		if (child.nodeType === Node.TEXT_NODE) {
			if (child.textContent) {
				const node: any = { type: "text", text: child.textContent };
				if (marks.length > 0)
					node.marks = marks;
				nodes.push(node);
			}
		}
		else if (child.nodeType === Node.ELEMENT_NODE) {
			const childEl = child as Element;
			const childMarks = [...marks];
			if (childEl.nodeName === "STRONG" || childEl.nodeName === "B") {
				childMarks.push({ type: "bold" });
			}
			else if (childEl.nodeName === "EM" || childEl.nodeName === "I") {
				childMarks.push({ type: "italic" });
			}
			else if (childEl.nodeName === "U") {
				childMarks.push({ type: "underline" });
			}
			else if (childEl.nodeName === "SPAN") {
				const style = (childEl as HTMLElement).style;
				const cssClass = (childEl as HTMLElement).className;
				if (style.color) {
					childMarks.push({ type: "textStyle", attrs: { color: style.color } });
				}
				if (style.backgroundColor) {
					childMarks.push({ type: "highlight", attrs: { color: style.backgroundColor } });
				}
				const fontSizeMatch = cssClass.match(/font-size-(\d+)/);
				if (fontSizeMatch) {
					childMarks.push({ type: "textStyle", attrs: { fontSize: `${fontSizeMatch[1]}pt` } });
				}
				const fontFamilyMatch = cssClass.match(/font-family-(\S+)/);
				if (fontFamilyMatch) {
					const fontName = fontFamilyMatch[1].replace(/_/g, " ");
					childMarks.push({ type: "textStyle", attrs: { fontFamily: fontName } });
				}
			}
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

	const contentNodes: any[] = [];
	let hasParagraph = false;

	cell.childNodes.forEach((child) => {
		if (child.nodeType === Node.ELEMENT_NODE) {
			const childEl = child as HTMLElement;
			const tag = childEl.tagName.toLowerCase();
			if (tag === "p" || tag === "div") {
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
	const rowEls = Array.from(table.querySelectorAll("tr")) as HTMLElement[];
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

	const pmRows: any[] = rowEls.map((row, ri) => {
		const cells = Array.from(row.querySelectorAll("td, th")) as HTMLElement[];
		const pmCells: any[] = [];
		let ci = 0;

		for (let col = 0; col < maxCols; col++) {
			if (grid[ri][col] === undefined) {
				pmCells.push({ type: "tableCell", attrs: { colspan: 1, rowspan: 1, colwidth: null }, content: [{ type: "paragraph" }] });
				grid[ri][col] = ri;
			}
			else if (grid[ri][col] === ri) {
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
		}
		return { type: "tableRow", content: pmCells };
	});

	return { type: "table", content: pmRows };
}

function htmlToPmDoc(html: string): any {
	const parser = new DOMParser();
	const doc = parser.parseFromString(html, "text/html");

	(Array.from(doc.querySelectorAll("span[class*=\'font-family-\']")) as HTMLElement[]).forEach((span) => {
		const m = span.className.match(/font-family-([\w-]+)/);
		if (m) {
			const fontName = m[1].replace(/_/g, " ");
			span.style.fontFamily = fontName;
			span.className = span.className.replace(m[0], "").trim();
		}
	});

	(Array.from(doc.querySelectorAll("span[class*=\'font-size-\']")) as HTMLElement[]).forEach((span) => {
		const m = span.className.match(/font-size-(\d+)/);
		if (m) {
			span.style.fontSize = `${m[1]}pt`;
			span.className = span.className.replace(/font-size-\d+/, "").trim();
		}
	});

	(Array.from(doc.querySelectorAll("[class*=\'align-\']")) as HTMLElement[]).forEach((el) => {
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

export async function importWordToEditor(
	file: File,
	editor: Editor,
	onComplete?: () => void,
	onMissingFonts?: (fontNames: string[]) => Promise<void>,
) {
	message.loading({ content: "?? ??? ?????? ????...", key: "import-word", duration: 0 });
	await new Promise(resolve => setTimeout(resolve, 100));

	try {
		const arrayBuffer = await file.arrayBuffer();
		const zip = await JSZip.loadAsync(arrayBuffer.slice(0));
		const docXmlFile = zip.file("word/document.xml");
		const tableProperties: { bgColor: string | null }[][][] = [];
		const xmlParas: Array<{
			textAlign: string | null
			lineHeight: string | null
			marginTop: string | null
			marginBottom: string | null
			isPageBreak: boolean
		}> = [];
		let dominantFont: string | null = null;
		let fontToApply: string | null = null;
		const fontCounts: Record<string, number> = {};

		if (docXmlFile) {
			const xmlStr = await docXmlFile.async("string");

			// eslint-disable-next-line regexp/no-super-linear-backtracking
			const fontRegex = /<w:rFonts\s+([^>]+)>/g;
			let match;
			let matchCount = 0;
			// eslint-disable-next-line no-cond-assign
			while ((match = fontRegex.exec(xmlStr)) !== null && matchCount < 10000) {
				matchCount++;
				const attrs = match[1];
				const ascii = attrs.match(/w:ascii="([^"]+)"/);
				const hAnsi = attrs.match(/w:hAnsi="([^"]+)"/);
				const cs = attrs.match(/w:cs="([^"]+)"/);
				const fontName = (ascii && ascii[1]) || (hAnsi && hAnsi[1]) || (cs && cs[1]);
				if (fontName && !fontName.includes("Theme") && fontName !== "Times New Roman" && fontName !== "Arial") {
					fontCounts[fontName] = (fontCounts[fontName] || 0) + 1;
				}
			}

			const stylesFile = zip.file("word/styles.xml");
			if (stylesFile) {
				const stylesXml = await stylesFile.async("string");
				let defMatch = null;
				const docDefIdx = stylesXml.indexOf("<w:docDefaults>");
				if (docDefIdx !== -1) {
					const rFontsIdx = stylesXml.indexOf("<w:rFonts", docDefIdx);
					if (rFontsIdx !== -1 && rFontsIdx < docDefIdx + 5000) {
						const endIdx = stylesXml.indexOf(">", rFontsIdx);
						if (endIdx !== -1) {
							const attrs = stylesXml.substring(rFontsIdx, endIdx);
							defMatch = [null, attrs];
						}
					}
				}
				if (defMatch && defMatch[1]) {
					const attrs = defMatch[1];
					const ascii = attrs.match(/w:ascii="([^"]+)"/);
					const hAnsi = attrs.match(/w:hAnsi="([^"]+)"/);
					const cs = attrs.match(/w:cs="([^"]+)"/);
					const fontName = (ascii && ascii[1]) || (hAnsi && hAnsi[1]) || (cs && cs[1]);
					if (fontName && fontName !== "Times New Roman" && fontName !== "Arial") {
						fontCounts[fontName] = (fontCounts[fontName] || 0) + 1000;
					}
				}
			}

			const sortedFonts = Object.entries(fontCounts).sort((a, b) => b[1] - a[1]);
			if (sortedFonts.length > 0) {
				dominantFont = sortedFonts[0][0];
			}

			if (sortedFonts.length > 0 && onMissingFonts) {
				const fontNames = sortedFonts.map(f => f[0]);
				await onMissingFonts(fontNames);
			}
			if (dominantFont) {
				fontToApply = dominantFont;
			}

			const tblBlocks = xmlStr.split("</w:tbl>");
			for (const tbl of tblBlocks) {
				if (!tbl.includes("<w:tbl"))
					continue;
				const tblContent = tbl.substring(tbl.lastIndexOf("<w:tbl"));
				const rowProps: { bgColor: string | null }[][] = [];
				const rows = tblContent.split("</w:tr>");
				for (const row of rows) {
					if (!row.includes("<w:tr"))
						continue;
					const rowContent = row.substring(row.lastIndexOf("<w:tr"));
					const cellProps: { bgColor: string | null }[] = [];
					const cells = rowContent.split("</w:tc>");
					for (const cell of cells) {
						if (!cell.includes("<w:tc"))
							continue;
						const cellContent = cell.substring(cell.lastIndexOf("<w:tc"));
						const shdMatch = cellContent.match(/<w:shd\s[^>]*w:fill="([^"]+)"/);
						let bgColor = null;
						if (shdMatch && shdMatch[1] !== "auto" && shdMatch[1] !== "FFFFFF")
							bgColor = `#${shdMatch[1]}`;
						cellProps.push({ bgColor });
					}
					if (cellProps.length > 0)
						rowProps.push(cellProps);
				}
				if (rowProps.length > 0)
					tableProperties.push(rowProps);
			}

			const pTags = xmlStr.split("</w:p>");
			for (const p of pTags) {
				if (!p.includes("<w:p"))
					continue;
				const pContent = p.substring(p.lastIndexOf("<w:p"));
				let textAlign = null;
				const jcMatch = pContent.match(/<w:jc\s+w:val="([^"]+)"/);
				if (jcMatch) {
					const val = jcMatch[1];
					if (val === "center")
						textAlign = "center";
					else if (val === "right")
						textAlign = "right";
					else if (val === "left")
						textAlign = "left";
					else if (val === "both")
						textAlign = "justify";
				}
				let lineHeight = null;
				let marginTop = null;
				let marginBottom = null;
				const spacingMatch = pContent.match(/<w:spacing([^>]+)>/);
				if (spacingMatch) {
					const attrs = spacingMatch[1];
					const before = attrs.match(/w:before="(\d+)"/);
					const after = attrs.match(/w:after="(\d+)"/);
					const line = attrs.match(/w:line="(\d+)"/);
					const lineRule = attrs.match(/w:lineRule="([^"]+)"/);
					if (line) {
						if (lineRule && (lineRule[1] === "exact" || lineRule[1] === "atLeast"))
							lineHeight = `${Number(line[1]) / 20}pt`;
						else lineHeight = (Number(line[1]) / 240).toFixed(2);
					}
					if (before)
						marginTop = `${Math.round(Number(before[1]) / 20)}pt`;
					if (after)
						marginBottom = `${Math.round(Number(after[1]) / 20)}pt`;
				}
				const isPageBreak = pContent.includes("<w:lastRenderedPageBreak") || pContent.includes("<w:pageBreakBefore") || pContent.includes("w:type=\"page\"");
				xmlParas.push({ textAlign, lineHeight, marginTop, marginBottom, isPageBreak });
			}
		}

		const styleMap: string[] = [
			"p[style-name=\'Heading 1\'] => h1:fresh",
			"p[style-name=\'Heading 2\'] => h2:fresh",
			"p[style-name=\'Heading 3\'] => h3:fresh",
			"p[style-name=\'Heading 4\'] => h4:fresh",
			"p[style-name=\'align-center\'] => p.align-center:fresh",
			"p[style-name=\'align-right\'] => p.align-right:fresh",
			"p[style-name=\'align-left\'] => p.align-left:fresh",
			"p[style-name=\'align-both\'] => p.align-justify:fresh",
			"p[style-name=\'align-justify\'] => p.align-justify:fresh",
			"p[style-name=\'h1-align-center\'] => h1.align-center:fresh",
			"p[style-name=\'h1-align-right\'] => h1.align-right:fresh",
			"p[style-name=\'h2-align-center\'] => h2.align-center:fresh",
			"p[style-name=\'h2-align-right\'] => h2.align-right:fresh",
			"p[style-name=\'h3-align-center\'] => h3.align-center:fresh",
			"p[style-name=\'h3-align-right\'] => h3.align-right:fresh",
		];
		for (let sz = 8; sz <= 72; sz++) styleMap.push(`r[style-name=\'fontSize-${sz}\'] => span.font-size-${sz}`);
		Object.keys(fontCounts).forEach((font) => {
			const cleanFont = font.replace(/\s+/g, "_");
			styleMap.push(`r[style-name=\'fontFamily-${cleanFont}\'] => span.font-family-${cleanFont}`);
		});

		function transformElement(el: any): any {
			const newEl = { ...el };
			if (el.children)
				newEl.children = el.children.map(transformElement);
			if (el.type === "break" && el.breakType === "page")
				return { type: "text", value: "[[PAGE_BREAK]]" };
			if (el.type === "run") {
				if (el.fontSize)
					newEl.styleName = `${newEl.styleName ? `${newEl.styleName} ` : ""}fontSize-${Math.round(el.fontSize)}`;
				if (el.font) {
					const cleanFont = el.font.replace(/\s+/g, "_");
					newEl.styleName = `${newEl.styleName ? `${newEl.styleName} ` : ""}fontFamily-${cleanFont}`;
				}
			}
			if (el.type === "paragraph") {
				const align = el.alignment;
				const name = (el.styleName || el.styleId || "").toLowerCase();
				if (name.includes("heading 1") || name.includes("تیتر 1") || name === "h1")
					newEl.styleName = align ? `h1-align-${align}` : "Heading 1";
				else if (name.includes("heading 2") || name.includes("تیتر 2") || name === "h2")
					newEl.styleName = align ? `h2-align-${align}` : "Heading 2";
				else if (name.includes("heading 3") || name.includes("تیتر 3") || name === "h3")
					newEl.styleName = align ? `h3-align-${align}` : "Heading 3";
				else if (align)
					newEl.styleName = `align-${align}`;
			}
			return newEl;
		}

		const result = await mammoth.convertToHtml(
			{ arrayBuffer: arrayBuffer.slice(0) },
			{
				styleMap,
				ignoreEmptyParagraphs: false,
				transformDocument: transformElement,
				convertImage: mammoth.images.imgElement((image) => {
					return Promise.race([
						image.read("base64").then((buf: any) => ({ src: `data:${image.contentType};base64,${buf}` })),
						new Promise(resolve => setTimeout(() => resolve({ src: "" }), 5000)),
					]) as Promise<any>;
				}),
			},
		);

		if (!result?.value)
			throw new Error("EMPTY_FILE");

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
					if (!prevEl || prevEl.tagName !== "HR")
						p.parentNode?.insertBefore(hr, p);
				}
			}
		});

		const pmDoc = htmlToPmDoc(tempDoc.body.innerHTML);
		editor.commands.setContent(pmDoc, { emitUpdate: true });
		if (fontToApply) {
			setTimeout(() => {
				editor.chain().selectAll().setFontFamily(fontToApply!).run();
				editor.commands.focus("start");
			}, 50);
		}
	}
	catch (error) {
		console.error("Word Import Error:", error);
		throw error;
	}
	finally {
		if (onComplete)
			onComplete();
	}
}
