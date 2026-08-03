// src/features/contract-templates/create/components/editor/ui/TemplateEditorCanvas.tsx
import type { Editor } from "@tiptap/react";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import { EditorContent, useEditor } from "@tiptap/react";
import { Button, Input, theme } from "antd";
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

import { PaginationPlus } from "tiptap-pagination-plus";
import { getEditorExtensions } from "../core/editor-extensions";

const PAGE_HEIGHT_PX = 1123;
const PAGE_WIDTH_PX = 794;
const PAGE_GAP_PX = 40;
const TOTAL_STEP_PX = PAGE_HEIGHT_PX + PAGE_GAP_PX;

export function useTemplateEditor({ initialContent = "" } = {}) {
	return useEditor({
		extensions: [
			...getEditorExtensions(),
			PaginationPlus.configure({
				pageHeight: PAGE_HEIGHT_PX,
				pageWidth: PAGE_WIDTH_PX,
				pageGap: PAGE_GAP_PX,
				marginTop: 96,
				marginBottom: 96,
				marginLeft: 72,
				marginRight: 72,
			}),
		],
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

const TemplateEditorCanvas = forwardRef<EditorCanvasRef, TemplateEditorCanvasProps>(({ editor }, ref) => {
	const { token } = theme.useToken();
	const [pageIndex, setPageIndex] = useState(0);
	const [pageCount, setPageCount] = useState(1);
	const [jumpValue, setJumpValue] = useState("");

	const pageCountRef = useRef(1);
	useEffect(() => {
		pageCountRef.current = pageCount;
	}, [pageCount]);

	useEffect(() => {
		if (!editor || !editor.view.dom)
			return;
		const dom = editor.view.dom as HTMLElement;

		const updatePagination = () => {
			const totalHeight = dom.scrollHeight;
			const newCount = Math.max(1, Math.ceil(totalHeight / TOTAL_STEP_PX));
			if (newCount !== pageCountRef.current) {
				setPageCount(newCount);
			}
		};

		let cursorTimer: any = null;

		const followCursor = () => {
			if (!editor.view.hasFocus())
				return;

			clearTimeout(cursorTimer);
			cursorTimer = setTimeout(() => {
				try {
					const { head } = editor.state.selection;
					const coords = editor.view.coordsAtPos(head);
					const rect = dom.getBoundingClientRect();

					const absoluteY = coords.top - rect.top;
					const activePage = Math.floor(Math.max(0, absoluteY) / TOTAL_STEP_PX);

					setPageIndex((prev) => {
						if (activePage !== prev && activePage >= 0 && activePage < pageCountRef.current) {
							return activePage;
						}
						return prev;
					});
				}
				catch {}
			}, 100);
		};

		editor.on("update", updatePagination);
		editor.on("selectionUpdate", followCursor);

		setTimeout(updatePagination, 150);

		return () => {
			clearTimeout(cursorTimer);
			editor.off("update", updatePagination);
			editor.off("selectionUpdate", followCursor);
		};
	}, [editor]);

	useEffect(() => {
		if (pageIndex >= pageCount)
			setPageIndex(Math.max(0, pageCount - 1));
	}, [pageCount, pageIndex]);

	const goPrev = () => setPageIndex(i => Math.max(0, i - 1));
	const goNext = () => setPageIndex(i => Math.min(pageCount - 1, i + 1));
	const goToPage = (page: number) => setPageIndex(Math.min(Math.max(page - 1, 0), pageCount - 1));

	const submitJump = (e: React.FormEvent) => {
		e.preventDefault();
		const page = Number(jumpValue);
		if (Number.isFinite(page) && page >= 1 && page <= pageCount)
			goToPage(page);
		setJumpValue("");
	};

	useImperativeHandle(ref, () => ({
		goToVariableKey(key: string) {
			if (!editor)
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
				const rect = editor.view.dom.getBoundingClientRect();
				const targetPage = Math.floor((coords.top - rect.top) / TOTAL_STEP_PX);
				setPageIndex(Math.min(Math.max(targetPage, 0), pageCount - 1));
				return true;
			}
			catch { return false; }
		},
	}));

	const handleCanvasClick = (e: React.MouseEvent) => {
		if (!editor)
			return;
		const target = e.target as HTMLElement;
		if (!target.closest(".ProseMirror p, .ProseMirror h1, .ProseMirror table, .ProseMirror span")) {
			editor.chain().focus("end").run();
		}
	};

	const pager = (
		<div className="flex flex-wrap items-center justify-center gap-3 p-3 flex-shrink-0 z-10 shadow-sm border-b" style={{ backgroundColor: token.colorBgContainer, borderColor: token.colorBorderSecondary }} dir="rtl">
			<Button size="small" onClick={goNext} disabled={pageIndex >= pageCount - 1} className="flex items-center gap-1 font-medium">
				صفحه بعد
				{" "}
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
							<span key={item} className="px-1 text-xs" style={{ color: token.colorTextDescription }}>…</span>
						),
				)}
			</div>

			<Button size="small" onClick={goPrev} disabled={pageIndex === 0} className="flex items-center gap-1 font-medium">
				<RightOutlined className="text-[10px]" />
				{" "}
				صفحه قبل
			</Button>

			<form onSubmit={submitJump} className="flex items-center gap-1.5 mr-2">
				<span className="text-xs font-medium" style={{ color: token.colorTextSecondary }}>برو به صفحه</span>
				<Input size="small" type="number" min={1} max={pageCount} value={jumpValue} onChange={e => setJumpValue(e.target.value)} placeholder={String(pageIndex + 1)} className="w-14 text-center" style={{ backgroundColor: token.colorBgLayout, color: token.colorText }} />
			</form>
		</div>
	);

	return (
		<div className="flex flex-col h-full w-full relative" style={{ backgroundColor: token.colorBgLayout }}>

			<style>
				{`
                .ms-word-editor .ProseMirror {
                    outline: none !important;
                    border: none !important;
                    box-shadow: none !important;
                    background: transparent !important;
                    color: #1a1a1a;
                    font-family: 'Vazirmatn', Tahoma, sans-serif;
                }

                .ms-word-editor .ProseMirror p {
                    line-height: 1.8; 
                    margin-bottom: 14px;
                    text-align: justify;
                }

                /* رفع باگ استایل‌دهی: اسپَن‌ها باید فونت‌فمیلی خودشان (که تولبار تعیین میکند) را دریافت کنند */
                .ms-word-editor .ProseMirror span {
                    font-family: inherit;
                }

                .ms-word-editor {
                    cursor: text;
                }

                .ms-word-editor [data-rm-pagination] {
                    background-color: #ffffff !important;
                }
            `}
			</style>

			{pager}

			<div className="flex-1 w-full flex justify-center py-6 overflow-hidden bg-black/5 dark:bg-black/20">
				<div
					className="ms-word-editor relative shadow-2xl rounded-sm bg-white"
					onClick={handleCanvasClick}
					onScroll={e => e.currentTarget.scrollTop = 0}
					style={{
						width: `${PAGE_WIDTH_PX}px`,
						height: `${PAGE_HEIGHT_PX}px`,
						minHeight: `${PAGE_HEIGHT_PX}px`,
						maxHeight: `${PAGE_HEIGHT_PX}px`,
						overflow: "hidden",
						boxSizing: "border-box",
					}}
				>
					<div
						style={{
							transform: `translateY(-${pageIndex * TOTAL_STEP_PX}px)`,
							transition: "transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)",
							willChange: "transform",
						}}
					>
						<EditorContent editor={editor} />
					</div>
				</div>
			</div>
		</div>
	);
});

export default TemplateEditorCanvas;
