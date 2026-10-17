// src/features/contract-templates/create/components/editor/ui/TemplateEditorCanvas.tsx
import type { Editor } from "@tiptap/react";
import { EditorContent, useEditor } from "@tiptap/react";
import { Spin, theme } from "antd";
import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";

import { useTemplateStore } from "../../../../store/useTemplateStore";
import { getEditorExtensions } from "../core/editor-extensions";
import { fontFaceCss } from "../core/font-faces";
import {
	contentBottom,
	PAGE_GAP_PX,
	PAGE_HEIGHT_PX,
	PAGE_MARGIN_BOTTOM_PX,
	PAGE_MARGIN_SIDE_PX,
	PAGE_MARGIN_TOP_PX,
	PAGE_WIDTH_PX,
	pageIndexAt,
	pagesHeight,
	pageTop,
} from "../core/page-layout";
import { Pagination } from "../core/pagination";

const EDITOR_PROPS = { attributes: { dir: "rtl" } };

export function useTemplateEditor({ initialContent = "" } = {}) {
	// Keep options referentially stable so TipTap's useEditor does not call
	// editor.setOptions (view.setProps + updateState) on every render.
	// Content is only used for the initial creation; later changes are applied
	// by consumers via editor.commands.setContent.
	const initialContentRef = useRef(initialContent);
	const extensions = useMemo(() => [...getEditorExtensions(), Pagination], []);
	return useEditor({
		extensions,
		content: initialContentRef.current,
		editorProps: EDITOR_PROPS,
	});
}

// Load a saved document as the editor's starting point: not undoable, so
// Ctrl+Z can never wipe the loaded template.
export function loadEditorContent(editor: Editor, html: string) {
	editor.chain().setMeta("addToHistory", false).setContent(html).run();
}

export interface EditorCanvasRef {
	goToVariableKey: (key: string) => boolean
}

interface TemplateEditorCanvasProps {
	editor: Editor | null
	onPageChange?: (current: number, total: number) => void
}

const TemplateEditorCanvas = forwardRef<EditorCanvasRef, TemplateEditorCanvasProps>((
	{ editor, onPageChange },
	ref,
) => {
	const { token } = theme.useToken();
	const scrollRef = useRef<HTMLDivElement>(null);
	const pagesRef = useRef<HTMLDivElement>(null);
	const [pageIndex, setPageIndex] = useState(0);
	const [pageCount, setPageCount] = useState(1);
	const pageCountRef = useRef(1);
	const headerData = useTemplateStore(s => s.headerData);
	const customFonts = useTemplateStore(s => s.customFonts);
	const [fontsReady, setFontsReady] = useState(false);

	// Load custom fonts on mount
	useEffect(() => {
		useTemplateStore.getState().fetchFonts().then(() => setFontsReady(true)).catch(() => setFontsReady(true));
	}, []);

	// Page count is computed by the Pagination extension (core/pagination.ts);
	// it dispatches a (doc-neutral) transaction whenever the layout changes.
	useEffect(() => {
		if (!editor)
			return;
		const sync = () => {
			const count = Math.max(1, editor.storage.pagination?.pageCount || 1);
			pageCountRef.current = count;
			setPageCount(prev => (prev === count ? prev : count));
		};
		sync();
		editor.on("transaction", sync);
		return () => {
			editor.off("transaction", sync);
		};
	}, [editor]);

	// Current page = page under the vertical middle of the visible part of the
	// canvas. Whichever ancestor actually scrolls (canvas, modal card, layout or
	// window) depends on the host, so listen to every scroll in capture phase and
	// clip the canvas to the viewport instead of trusting its own height.
	useEffect(() => {
		if (!editor)
			return;
		let frame = 0;
		const compute = () => {
			frame = 0;
			const inner = scrollRef.current;
			const pages = pagesRef.current;
			if (!inner || !pages)
				return;
			const view = inner.getBoundingClientRect();
			const top = Math.max(view.top, 0);
			const bottom = Math.min(view.bottom, window.innerHeight);
			// Canvas fully off-screen: snap to its nearest edge (first/last page).
			const mid = bottom > top ? (top + bottom) / 2 : (view.top > 0 ? view.top : view.bottom);
			const y = mid - pages.getBoundingClientRect().top;
			setPageIndex(Math.min(pageIndexAt(y), pageCountRef.current - 1));
		};
		const schedule = () => {
			if (!frame)
				frame = requestAnimationFrame(compute);
		};

		document.addEventListener("scroll", schedule, { capture: true, passive: true });
		window.addEventListener("resize", schedule);
		compute();
		return () => {
			document.removeEventListener("scroll", schedule, { capture: true });
			window.removeEventListener("resize", schedule);
			if (frame)
				cancelAnimationFrame(frame);
		};
	}, [editor, pageCount]);

	useEffect(() => {
		onPageChange?.(Math.min(pageIndex, pageCount - 1) + 1, pageCount);
	}, [pageIndex, pageCount, onPageChange]);

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
				style={{ top: `${top + 20}px`, height: "80px", overflow: "hidden", direction: "rtl", fontFamily }}
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

	const renderPageHighlight = () => {
		const idx = Math.min(Math.max(pageIndex, 0), pageCount - 1);
		// NOTE: ContractTemplateEditorModal finds this element by inline
		// zIndex "10" + pointerEvents "none" to hide it during PDF capture.
		const style: React.CSSProperties = {
			position: "absolute",
			left: 0,
			right: 0,
			top: `${pageTop(idx)}px`,
			height: `${PAGE_HEIGHT_PX}px`,
			pointerEvents: "none",
			zIndex: 10,
			boxShadow: `0 0 0 2px ${token.colorPrimary}, 0 0 30px 5px ${token.colorPrimary}40, inset 0 0 0 2px ${token.colorPrimary}, inset 0 0 30px ${token.colorPrimary}15`,
			borderRadius: "2px",
		};
		return <div style={style} />;
	};

	// Clip anything that could not be paginated (oversized unbreakable content,
	// a not-yet-remeasured frame) so it never covers a margin, a gap or the next
	// page's header: white over the bottom/top margins, layout color over the gap.
	const renderMarginMasks = () => Array.from({ length: pageCount - 1 }).map((_, i) => (
		<div
			// eslint-disable-next-line react/no-array-index-key
			key={i}
			className="absolute left-0 right-0 pointer-events-none"
			style={{
				top: `${contentBottom(i)}px`,
				backgroundColor: token.colorBgLayout,
				height: `${PAGE_GAP_PX}px`,
				borderTop: `${PAGE_MARGIN_BOTTOM_PX}px solid #fff`,
				borderBottom: `${PAGE_MARGIN_TOP_PX}px solid #fff`,
				boxSizing: "content-box",
				zIndex: 3,
			}}
		/>
	));

	const totalHeight = pagesHeight(pageCount);

	return (
		<div className="flex flex-col h-full w-full relative" style={{ backgroundColor: token.colorBgLayout }}>
			<style>
				{`
        ${fontFaceCss(customFonts)}

        /* ─── Editor core ─────────────────────────────────────── */
        .ms-word-editor {
          background-color: transparent !important;
        }

        .ms-word-editor .ProseMirror {
          outline: none !important;
          border: none !important;
          box-shadow: none !important;
          color: #1a1a1a;
          font-family: var(--font-family-persian);
          font-size: 14.5px;
          /* Page geometry: header area on top, margins on the sides/bottom.
             Pagination spacers (core/pagination.ts) push content that would
             cross a page's content-bottom to the next page's content-top. */
          padding: ${PAGE_MARGIN_TOP_PX}px ${PAGE_MARGIN_SIDE_PX}px ${PAGE_MARGIN_BOTTOM_PX}px ${PAGE_MARGIN_SIDE_PX}px;
          box-sizing: border-box;
          width: ${PAGE_WIDTH_PX}px;
          min-width: ${PAGE_WIDTH_PX}px;
          max-width: ${PAGE_WIDTH_PX}px;
          min-height: ${totalHeight}px;
          background-color: transparent !important;
          position: relative;
          /* Above the page backgrounds, below the margin masks and header overlays. */
          z-index: 2;
        }

        .ms-word-editor .ProseMirror p {
          margin-top: 0;
          margin-bottom: 0.5em;
          line-height: 1.6;
          min-height: 1.5em;
        }

        /* ─── Pagination spacers (decorations, never saved) ──── */
        .ms-word-editor .ProseMirror .pg-spacer {
          display: block;
          margin: 0;
          padding: 0;
          border: 0;
          pointer-events: none;
          user-select: none;
        }
        /* Full-width inline box: the line before it wraps softly, so it stays justified. */
        .ms-word-editor .ProseMirror .pg-spacer-inline {
          display: inline-block;
          width: 100%;
          vertical-align: top;
        }
        .ms-word-editor .ProseMirror .pg-spacer-row {
          display: table-row !important;
        }
        /* Borders (and repeated header) of a table cell split across pages. */
        .ms-word-editor .ProseMirror .pg-frame {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 0;
        }
        .ms-word-editor .ProseMirror .pg-frame-line {
          position: absolute;
          left: -1px;
          right: -1px;
          border-top: 1px solid #94a3b8;
        }
        .ms-word-editor .ProseMirror .pg-frame > table {
          position: absolute;
          max-width: none;
        }
        .ms-word-editor .ProseMirror table[data-borderless="true"] .pg-frame-line {
          display: none;
        }
        .ms-word-editor .ProseMirror .pg-spacer-row > td {
          display: table-cell !important;
          border: none !important;
          padding: 0 !important;
          background: transparent !important;
        }
        .ms-word-editor .ProseMirror.pg-measuring .pg-spacer {
          display: none !important;
        }

        /* ─── Manual page break (<hr>) ───────────────────────── */
        .ms-word-editor .ProseMirror hr,
        .ms-word-editor .ProseMirror .page-break {
          display: block;
          height: 0;
          border: none;
          border-top: 1px dashed #94a3b8;
          margin: 14px 0 14px 0;
          overflow: visible;
          position: relative;
          clear: both;
          cursor: default;
          user-select: none;
        }
        .ms-word-editor .ProseMirror hr::after,
        .ms-word-editor .ProseMirror .page-break::after {
          content: "شکست صفحه";
          position: absolute;
          top: 0;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 11px;
          font-weight: 500;
          line-height: 16px;
          color: #64748b;
          background: #ffffff;
          padding: 0 12px;
          border-radius: 9999px;
          border: 1px dashed #cbd5e1;
          white-space: nowrap;
        }
        .ms-word-editor .ProseMirror hr.ProseMirror-selectednode {
          border-top-color: ${token.colorPrimary};
        }

        .ms-word-editor .ProseMirror .kept-selection {
          background-color: #b4d5fe;
        }

        /* Beat the app-wide html[lang="fa"] * font rule: inside the document a font
           comes only from the editor default or a textStyle span (bold/italic/
           cells/... inherit it). */
        .ms-word-editor .ProseMirror * {
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
        .ms-word-editor .ProseMirror .tableWrapper {
          max-width: 100%;
          overflow: visible;
          margin: 1rem 0;
        }
        .ms-word-editor .ProseMirror table {
          display: table !important;
          border-collapse: collapse;
          width: 100%;
          max-width: 100%;
          margin: 0;
          table-layout: fixed;
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
          position: relative;
          overflow-wrap: break-word;
          word-break: normal;
        }
        .ms-word-editor .ProseMirror table td p,
        .ms-word-editor .ProseMirror table th p {
          margin-bottom: 0;
        }
        .ms-word-editor .ProseMirror table th {
          font-weight: bold;
          background-color: #f1f5f9;
        }
        .ms-word-editor .ProseMirror table[data-borderless="true"] td,
        .ms-word-editor .ProseMirror table[data-borderless="true"] th {
          border-color: transparent;
        }
        .ms-word-editor .ProseMirror table[data-borderless="true"] th {
          background-color: transparent;
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
        .ms-word-editor .ProseMirror.resize-cursor {
          cursor: col-resize;
        }
      `}
			</style>
			<div
				ref={scrollRef}
				className="flex-1 w-full flex justify-center py-8 overflow-y-auto overflow-x-hidden bg-slate-100 dark:bg-slate-900"
			>
				<div
					ref={pagesRef}
					className="ms-word-editor relative"
					data-page-count={pageCount}
					style={{
						width: `${PAGE_WIDTH_PX}px`,
						minHeight: `${totalHeight}px`,
						boxSizing: "border-box",
						flexShrink: 0,
					}}
				>
					{/* Physical A4 pages (background) */}
					{Array.from({ length: pageCount }).map((_, i) => (
						<div
							// eslint-disable-next-line react/no-array-index-key
							key={i}
							className="absolute bg-white shadow-lg border border-gray-200"
							style={{
								top: `${pageTop(i)}px`,
								left: 0,
								width: `${PAGE_WIDTH_PX}px`,
								height: `${PAGE_HEIGHT_PX}px`,
								boxSizing: "border-box",
								zIndex: 1,
								pointerEvents: "none",
							}}
						/>
					))}
					{renderMarginMasks()}
					{renderPageHighlight()}
					{fontsReady
						? (
							Array.from({ length: pageCount }).map((_, i) => (
								// eslint-disable-next-line react/no-array-index-key
								<React.Fragment key={i}>{renderHeaderOverlay(pageTop(i))}</React.Fragment>
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
