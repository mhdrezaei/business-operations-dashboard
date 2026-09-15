// src/features/contract-templates/create/components/editor/ui/TemplateEditorCanvas.tsx
import type { Editor } from "@tiptap/react";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import { EditorContent, useEditor } from "@tiptap/react";
import { Button, Input, Spin, theme } from "antd";
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

import { useTemplateStore } from "../../../../store/useTemplateStore";
import { getEditorExtensions } from "../core/editor-extensions";

const PAGE_HEIGHT_PX = 1123;
const PAGE_WIDTH_PX = 794;

export function useTemplateEditor({ initialContent = "" } = {}) {
	return useEditor({
		extensions: [...getEditorExtensions()],
		content: initialContent,
		editorProps: {
			attributes: { dir: "rtl" },
		},
	});
}

export interface EditorCanvasRef {
	goToVariableKey: (key: string) => boolean
}

interface TemplateEditorCanvasProps {
	editor: Editor | null
}

function buildPageList(current: number, count: number) {
	const pages = new Set([1, count, current, Math.max(1, current - 1), Math.min(count, current + 1)]);
	const sorted = Array.from(pages).sort((a, b) => a - b);
	const result: (number | string)[] = [];
	sorted.forEach((page, index) => {
		if (index > 0 && page - sorted[index - 1] > 1)
			result.push(`ellipsis-${page}`);
		result.push(page);
	});
	return result;
}

const TemplateEditorCanvas = forwardRef<EditorCanvasRef, TemplateEditorCanvasProps>((
	{ editor },
	ref,
) => {
	const { token } = theme.useToken();
	const scrollRef = useRef<HTMLDivElement>(null);
	const [pageIndex, setPageIndex] = useState(0);
	const [pageCount, setPageCount] = useState(1);
	const [jumpValue, setJumpValue] = useState("");
	const pageCountRef = useRef(1);
	const { headerData, fetchFonts } = useTemplateStore();
	const [headerOffsets, setHeaderOffsets] = useState<number[]>([0]);
	const [fontsReady, setFontsReady] = useState(false);

	// Load custom fonts on mount
	useEffect(() => {
		fetchFonts().then(() => setFontsReady(true)).catch(() => setFontsReady(true));
	}, []);

	// Pagination effect – recompute offsets and page count when editor updates
	useEffect(() => {
		if (!editor)
			return;
		const dom = editor.view.dom as HTMLElement;
		const updatePagination = () => {
			const hrs = Array.from(dom.querySelectorAll("hr, .page-break")) as HTMLElement[];
			const offsets = [0, ...hrs.map(hr => hr.offsetTop + hr.offsetHeight)];
			setHeaderOffsets(offsets);

			const heightBased = Math.max(1, Math.ceil(dom.scrollHeight / PAGE_HEIGHT_PX));
			const newCount = Math.max(hrs.length + 1, heightBased);
			setPageCount(newCount);
			pageCountRef.current = newCount;
		};
		editor.on("update", updatePagination);
		// initial calculation after a short delay to let content render
		setTimeout(updatePagination, 150);
		return () => {
			editor.off("update", updatePagination);
		};
	}, [editor]);

	// Attach global scroll listener since the actual scrollbar is on .custom-modal-scroll
	useEffect(() => {
		const scrollContainer = scrollRef.current?.closest(".custom-modal-scroll") || scrollRef.current;
		if (!scrollContainer || !editor)
			return;

		const handleScroll = () => {
			const dom = editor.view.dom as HTMLElement;
			const hrs = Array.from(dom.querySelectorAll("hr, .page-break")) as HTMLElement[];
			if (hrs.length > 0) {
				const containerRect = scrollContainer.getBoundingClientRect();
				let curr = 0;
				for (let i = 0; i < hrs.length; i++) {
					const rect = hrs[i].getBoundingClientRect();
					if (rect.top - containerRect.top <= 200) {
						curr = i + 1;
					}
				}
				setPageIndex(Math.min(curr, pageCountRef.current - 1));
			}
			else {
				const scrollTop = scrollContainer.scrollTop;
				const currentPage = Math.round(scrollTop / PAGE_HEIGHT_PX);
				setPageIndex(Math.min(Math.max(currentPage, 0), pageCountRef.current - 1));
			}
		};

		scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
		// initial check
		handleScroll();
		return () => scrollContainer.removeEventListener("scroll", handleScroll);
	}, [editor, pageCount]);

	const scrollToPage = (index: number) => {
		const clamped = Math.min(Math.max(index, 0), pageCount - 1);
		setPageIndex(clamped);
		if (!editor?.view?.dom)
			return;
		const scrollContainer = scrollRef.current?.closest(".custom-modal-scroll") || scrollRef.current;
		if (!scrollContainer)
			return;

		const dom = editor.view.dom as HTMLElement;
		const hrs = Array.from(dom.querySelectorAll("hr, .page-break")) as HTMLElement[];
		const containerRect = scrollContainer.getBoundingClientRect();

		if (clamped > 0 && hrs[clamped - 1]) {
			const targetHr = hrs[clamped - 1];
			const hrRect = targetHr.getBoundingClientRect();
			// 90px offset accounts for the sticky toolbar and visual margin
			const targetScroll = scrollContainer.scrollTop + (hrRect.top - containerRect.top) - 90;
			scrollContainer.scrollTo({ top: Math.max(0, targetScroll), behavior: "smooth" });
		}
		else {
			const domRect = dom.getBoundingClientRect();
			const targetScroll = scrollContainer.scrollTop + (domRect.top - containerRect.top) - 90;
			scrollContainer.scrollTo({ top: Math.max(0, targetScroll), behavior: "smooth" });
		}
	};

	const goPrev = () => scrollToPage(pageIndex - 1);
	const goNext = () => scrollToPage(pageIndex + 1);
	const goToPage = (page: number) => scrollToPage(page - 1);

	const submitJump = (e: React.FormEvent) => {
		e.preventDefault();
		const page = Number(jumpValue);
		if (Number.isFinite(page) && page >= 1 && page <= pageCount) {
			goToPage(page);
		}
		setJumpValue("");
	};

	useImperativeHandle(ref, () => ({
		goToVariableKey(key: string) {
			if (!editor || !scrollRef.current)
				return false;
			let targetPos: number | null = null;
			editor.state.doc.descendants((node, pos) => {
				if (targetPos !== null)
					return false;
				if (node.type.name === "templateVariable" && node.attrs.key === key) {
					targetPos = pos;
					return false;
				}
				return true;
			});
			if (targetPos === null)
				return false;
			try {
				const coords = editor.view.coordsAtPos(targetPos);
				const containerRect = scrollRef.current.getBoundingClientRect();
				const targetScroll = scrollRef.current.scrollTop + (coords.top - containerRect.top) - 100;
				scrollRef.current.scrollTo({ top: Math.max(0, targetScroll), behavior: "smooth" });
				return true;
			}
			catch {
				return false;
			}
		},
	}));

	const handleCanvasClick = (e: React.MouseEvent) => {
		if (!editor)
			return;
		const target = e.target as HTMLElement;
		if (!target.closest(".ProseMirror")) {
			editor.chain().focus("end").run();
		}
	};

	const pager = (
		<div
			className="flex flex-wrap items-center justify-center gap-3 p-3 flex-shrink-0 z-10 shadow-sm border-b"
			style={{ backgroundColor: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
			dir="rtl"
		>
			<Button size="small" onClick={goNext} disabled={pageIndex >= pageCount - 1} className="flex items-center gap-1 font-medium">
				صفحه بعد
				<LeftOutlined className="text-[10px]" />
			</Button>
			<div className="flex items-center gap-1">
				{buildPageList(pageIndex + 1, pageCount).map(item =>
					typeof item === "number"
						? (
							<Button key={item} size="small" type={item === pageIndex + 1 ? "primary" : "default"} onClick={() => goToPage(item)}>
								{item}
							</Button>
						)
						: (
							<span key={item} className="px-1 text-xs" style={{ color: token.colorTextDescription }}>
								…
							</span>
						),
				)}
			</div>
			<Button size="small" onClick={goPrev} disabled={pageIndex === 0} className="flex items-center gap-1 font-medium">
				<RightOutlined className="text-[10px]" />
				صفحه قبل
			</Button>
			<form onSubmit={submitJump} className="flex items-center gap-1.5 mr-2">
				<span className="text-xs font-medium" style={{ color: token.colorTextSecondary }}>
					برو به صفحه
				</span>
				<Input
					size="small"
					type="number"
					min={1}
					max={pageCount}
					value={jumpValue}
					onChange={e => setJumpValue(e.target.value)}
					placeholder={String(pageIndex + 1)}
					className="w-14 text-center"
					style={{ backgroundColor: token.colorBgLayout, color: token.colorText }}
				/>
			</form>
		</div>
	);

	const renderHeaderOverlay = (top: number) => {
		const defaultLogo = "/karashab-logo.png";
		const logo = headerData?.logo_url || headerData?.logo_data_url || defaultLogo;
		const showContractNo = headerData?.show_contract_number !== false;
		const contractNumber = "[شماره قرارداد / الحاقیه]";
		const text = headerData?.extra_text || "";
		const fontFamily = headerData?.header_font_family ? `'${headerData.header_font_family}', sans-serif` : "inherit";
		const fontSize = headerData?.header_font_size ? `${headerData.header_font_size}px` : "13px";
		return (
			<div
				className="absolute left-0 right-0 px-[72px] pointer-events-none select-none flex justify-between items-start z-10"
				style={{ top: `${top + 20}px`, height: "80px", direction: "rtl", fontFamily }}
			>
				<div className="flex flex-col items-start">
					<img src={logo} style={{ maxHeight: "45px", objectFit: "contain", marginBottom: "12px", maxWidth: "250px" }} alt="logo" />
					{text && <div style={{ fontSize, fontWeight: "normal", color: "#000" }}>{text}</div>}
				</div>
				{showContractNo && (
					<div className="flex flex-col items-center pt-2.5" style={{ width: "180px" }}>
						<div style={{ fontWeight: "bold", fontSize: "13px", marginBottom: "8px", color: "#000" }}>
							شماره قرارداد :
							{" "}
							{contractNumber}
						</div>
						<div
							style={{
								width: "100%",
								height: "14px",
								backgroundColor: "#465b8e",
								clipPath: "polygon(15px 0, 100% 0, 100% 100%, 0% 100%)",
							}}
						/>
					</div>
				)}
			</div>
		);
	};

	return (
		<div className="flex flex-col h-full w-full relative" style={{ backgroundColor: token.colorBgLayout }}>
			<style>
				{`
        /* ─── Editor core ─────────────────────────────────────── */
        .ms-word-editor .ProseMirror {
          outline: none !important;
          border: none !important;
          box-shadow: none !important;
          color: #1a1a1a;
          font-family: 'Vazirmatn', Tahoma, sans-serif;
          font-size: 14.5px;
          /* Top padding 110px ensures text doesn't overlap the 80px header at top:20px */
          padding: 110px 72px 72px 72px;
          box-sizing: border-box;
          width: ${PAGE_WIDTH_PX}px;
          min-width: ${PAGE_WIDTH_PX}px;
          max-width: ${PAGE_WIDTH_PX}px;
          min-height: ${PAGE_HEIGHT_PX}px;
          background-color: #ffffff;
        }

        .ms-word-editor .ProseMirror p {
          margin-top: 0;
          margin-bottom: 0.5em;
          line-height: 1.6;
          min-height: 1.5em;
        }

        /* ─── Page Break Divider ─────────────────────────────── */
        .ms-word-editor .ProseMirror hr,
        .ms-word-editor .ProseMirror .page-break {
          display: block;
          border: none;
          height: 36px;
          margin: 36px -72px 100px -72px;
          background: #e2e8f0;
          border-top: 1px solid #cbd5e1;
          border-bottom: 1px solid #cbd5e1;
          position: relative;
          clear: both;
          cursor: default;
          user-select: none;
        }
        .ms-word-editor .ProseMirror hr::after,
        .ms-word-editor .ProseMirror .page-break::after {
          content: "━━━ شکست صفحه (صفحه بعد) ━━━";
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 11px;
          font-weight: 500;
          color: #64748b;
          background: #ffffff;
          padding: 2px 16px;
          border-radius: 9999px;
          border: 1px dashed #cbd5e1;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
          white-space: nowrap;
        }

        .ms-word-editor .ProseMirror span {
          font-family: inherit;
        }

        /* ─── Headings ───────────────────────────────────────── */
        .ms-word-editor .ProseMirror h1 {
          font-size: 22px;
          font-weight: bold;
          margin-top: 1em;
          margin-bottom: 0.5em;
        }
        .ms-word-editor .ProseMirror h2 {
          font-size: 18px;
          font-weight: bold;
          margin-top: 0.8em;
          margin-bottom: 0.4em;
        }
        .ms-word-editor .ProseMirror h3 {
          font-size: 16px;
          font-weight: bold;
          margin-top: 0.6em;
          margin-bottom: 0.3em;
        }

        /* ─── Tables ─────────────────────────────────────────── */
        .ms-word-editor .ProseMirror table {
          display: table !important;
          border-collapse: collapse;
          width: 100%;
          margin: 1rem 0;
          table-layout: auto;
        }
        .ms-word-editor .ProseMirror table tbody {
          display: table-row-group !important;
        }
        .ms-word-editor .ProseMirror table tr {
          display: table-row !important;
        }
        .ms-word-editor .ProseMirror table td,
        .ms-word-editor .ProseMirror table th {
          display: table-cell !important;
          border: 1px solid #94a3b8;
          padding: 6px 10px;
          vertical-align: top;
          box-sizing: border-box;
          min-width: 1em;
          word-break: break-word;
        }
        .ms-word-editor .ProseMirror table th {
          font-weight: bold;
          background-color: #f1f5f9;
        }
        .ms-word-editor .ProseMirror .selectedCell:after {
          z-index: 2; position: absolute; content: "";
          left: 0; right: 0; top: 0; bottom: 0;
          background: rgba(99,102,241,0.15); pointer-events: none;
        }
        .ms-word-editor .ProseMirror .column-resize-handle {
          position: absolute; right: -2px; top: 0; bottom: -2px;
          width: 4px; background: #6366f1; pointer-events: none; z-index: 20;
        }

        @media print {
          .ms-word-editor .ProseMirror hr,
          .ms-word-editor .ProseMirror .page-break {
            display: block;
            height: 0;
            margin: 0;
            border: none;
            page-break-after: always;
            break-after: page;
          }
          .ms-word-editor .ProseMirror hr::after,
          .ms-word-editor .ProseMirror .page-break::after {
            display: none;
          }
        }
      `}
			</style>
			{pager}
			<div
				ref={scrollRef}
				onClick={handleCanvasClick}
				className="flex-1 w-full flex justify-center py-8 overflow-y-auto overflow-x-hidden bg-slate-100 dark:bg-slate-900"
			>
				<div
					className="ms-word-editor relative shadow-2xl rounded-sm bg-white"
					style={{ width: `${PAGE_WIDTH_PX}px`, minHeight: `${PAGE_HEIGHT_PX}px`, boxSizing: "border-box", backgroundColor: "#ffffff" }}
				>
					{fontsReady
						? (
							headerOffsets.map((y, idx) => (
								<React.Fragment key={idx}>{renderHeaderOverlay(y)}</React.Fragment>
							))
						)
						: (
							<div className="absolute top-10 left-1/2 -translate-x-1/2 z-20">
								<Spin tip="در حال بارگذاری..." />
							</div>
						)}
					<EditorContent editor={editor} />
				</div>
			</div>
		</div>
	);
});

export default TemplateEditorCanvas;
