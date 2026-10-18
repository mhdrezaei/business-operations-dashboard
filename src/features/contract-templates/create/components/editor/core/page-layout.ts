// src/features/contract-templates/create/components/editor/core/page-layout.ts
//
// Single source of truth for the A4 page geometry used by the editor canvas,
// the pagination plugin and the PDF export (ContractTemplateEditorModal).

export const PAGE_WIDTH_PX = 794;
export const PAGE_HEIGHT_PX = 1123;
/** Visual gap between two pages (not part of any page; skipped by the PDF export). */
export const PAGE_GAP_PX = 24;
export const PAGE_STRIDE_PX = PAGE_HEIGHT_PX + PAGE_GAP_PX;
/** Space reserved at the top of every page (the header overlay lives at 20..100px). */
export const PAGE_MARGIN_TOP_PX = 110;
export const PAGE_MARGIN_BOTTOM_PX = 72;
export const PAGE_MARGIN_SIDE_PX = 72;
export const PAGE_CONTENT_WIDTH_PX = PAGE_WIDTH_PX - 2 * PAGE_MARGIN_SIDE_PX; // 650
export const PAGE_CONTENT_HEIGHT_PX = PAGE_HEIGHT_PX - PAGE_MARGIN_TOP_PX - PAGE_MARGIN_BOTTOM_PX;

/** Manual page breaks in content_html (`<hr>`, legacy `hr.page-break`). */
export const PAGE_BREAK_SELECTOR = "hr, .page-break";

/** Top of page `index` relative to the paged root (`.ms-word-editor`). */
export const pageTop = (index: number) => index * PAGE_STRIDE_PX;

/** First y of the writable area of page `index` (below the header area). */
export const contentTop = (index: number) => pageTop(index) + PAGE_MARGIN_TOP_PX;

/** Last y of the writable area of page `index` (above the bottom margin). */
export const contentBottom = (index: number) => pageTop(index) + PAGE_HEIGHT_PX - PAGE_MARGIN_BOTTOM_PX;

/** Index of the page (or the gap after it) containing offset `y` from the paged root. */
export const pageIndexAt = (y: number) => Math.max(0, Math.floor(y / PAGE_STRIDE_PX));

/** Total height of `count` pages including the gaps between them. */
export const pagesHeight = (count: number) => Math.max(1, count) * PAGE_STRIDE_PX - PAGE_GAP_PX;

/**
 * Page rectangles relative to the paged root (`.ms-word-editor`, which
 * carries `data-page-count`). Each page is exactly PAGE_HEIGHT_PX tall;
 * gaps between pages are not included.
 */
export function getPageRects(root: HTMLElement): { top: number, height: number }[] {
	const fromAttr = Number(root.dataset.pageCount);
	const count = fromAttr > 0
		? fromAttr
		: Math.max(1, Math.round((root.offsetHeight + PAGE_GAP_PX) / PAGE_STRIDE_PX));
	return Array.from({ length: count }, (_, i) => ({ top: pageTop(i), height: PAGE_HEIGHT_PX }));
}
