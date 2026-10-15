import { CheckCircleOutlined, FilePdfOutlined } from "@ant-design/icons";
import { Button, message, Modal, Spin } from "antd";
import React, { useEffect, useState } from "react";
import { usePreferencesStore } from "../../../../../store/preferences";
import { getPageRects, PAGE_BREAK_SELECTOR, PAGE_HEIGHT_PX, PAGE_WIDTH_PX } from "../../../../contract-templates/create/components/editor/core/page-layout";
import ProEditor from "../../../../contract-templates/create/components/editor/ProEditor";
import { loadEditorContent, useTemplateEditor } from "../../../../contract-templates/create/components/editor/ui/TemplateEditorCanvas";
import { useTemplateStore } from "../../../../contract-templates/store/useTemplateStore";
import { requestOfficialPdf } from "../../../api/contracts.api";

interface Props {
	open: boolean
	onClose: () => void
	onSuccess?: () => void
	initialHtml: string
	templateId: number | null
	onPrint: (html: string) => void
	contractId: number | null
	service: any
	addendumGroupId?: string | null
}

export const ContractTemplateEditorModal: React.FC<Props> = ({ open, onClose, onSuccess, initialHtml, templateId, contractId, service, addendumGroupId }) => {
	const { fetchFonts, isFetchingFonts } = useTemplateStore();
	const [contentHtml, setContentHtml] = useState(initialHtml);
	const [loadingAction, setLoadingAction] = useState<"none" | "pdf" | "approval">("none");

	const theme = usePreferencesStore(state => state.theme);
	const isDark = theme === "dark" || (theme === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);

	const editor = useTemplateEditor({ initialContent: contentHtml });

	useEffect(() => {
		if (open) {
			// eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
			setContentHtml(initialHtml);
			if (editor && initialHtml) {
				loadEditorContent(editor, initialHtml);
			}
			fetchFonts();
		}
	}, [open, initialHtml, templateId, fetchFonts, editor]);

	const generatePdfBlob = async (): Promise<Blob> => {
		const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
			import("html2canvas"),
			import("jspdf"),
		]);
		const editorNode = document.querySelector(".ms-word-editor") as HTMLElement;
		if (!editorNode)
			throw new Error("Editor node not found");

		// Let pending pagination passes settle: content still crossing a page edge
		// would be hidden by the margin masks in the capture.
		let misplaced = 0;
		for (let i = 0; i < 10; i++) {
			await new Promise(resolve => setTimeout(resolve, 100));
			misplaced = editor?.storage.pagination?.misplaced ?? 0;
			if (!misplaced && i > 0)
				break;
		}
		if (misplaced)
			console.warn(`[pdf] ${misplaced} block(s) still cross a page edge; parts may be hidden in the PDF.`);

		// All capture-only tweaks are applied to html2canvas' clone, never to the
		// live editor DOM (ProseMirror would observe the mutations). None of them
		// changes layout, so the clone stays paginated exactly like the editor.
		const prepareClone = (_doc: Document, root: HTMLElement) => {
			// Active page highlight (see TemplateEditorCanvas.renderPageHighlight)
			// and page shadows (html2canvas paints them over the white page as gray)
			Array.from(root.children).forEach((c) => {
				const el = c as HTMLElement;
				el.style.boxShadow = "none";
				if (el.style.zIndex === "10" && el.style.pointerEvents === "none")
					el.style.display = "none";
			});
			root.querySelectorAll<HTMLElement>(".column-resize-handle").forEach(el => el.style.display = "none");
			// Selection kept visible while the editor is blurred (Selection extension)
			root.querySelectorAll<HTMLElement>(".kept-selection").forEach(el => el.style.backgroundColor = "transparent");
			// Missing variables become a dotted blank of the same width
			root.querySelectorAll<HTMLElement>("mark").forEach((mark) => {
				mark.style.backgroundColor = "transparent";
				mark.style.color = "transparent";
				mark.style.borderBottom = "1px dotted #000";
				mark.querySelectorAll<HTMLElement>("*").forEach(el => el.style.color = "transparent");
			});
			// Page breaks keep their space but are not printed
			root.querySelectorAll<HTMLElement>(PAGE_BREAK_SELECTOR).forEach(el => el.style.opacity = "0");
		};

		// Fixed-size editor pages (separated by visual gaps) relative to editorNode
		const pageRects = getPageRects(editorNode);

		// eslint-disable-next-line new-cap
		const doc = new jsPDF({ unit: "px", format: [PAGE_WIDTH_PX, PAGE_HEIGHT_PX], orientation: "portrait" });

		// We capture one giant canvas of the entire editor
		const giantCanvas = await html2canvas(editorNode, {
			scale: 2,
			useCORS: true,
			logging: false,
			backgroundColor: "#ffffff",
			windowWidth: editorNode.scrollWidth,
			windowHeight: editorNode.scrollHeight,
			onclone: prepareClone,
		});

		let pageAdded = false;

		// One PDF page per editor page; the gaps between pages are skipped
		for (const { top, height } of pageRects) {
			const cropCanvas = document.createElement("canvas");
			cropCanvas.width = PAGE_WIDTH_PX * 2;
			cropCanvas.height = PAGE_HEIGHT_PX * 2;
			const ctx = cropCanvas.getContext("2d");

			if (ctx) {
				ctx.fillStyle = "#ffffff";
				ctx.fillRect(0, 0, cropCanvas.width, cropCanvas.height);
				ctx.drawImage(
					giantCanvas,
					0,
					top * 2,
					PAGE_WIDTH_PX * 2,
					height * 2, // Source crop
					0,
					0,
					PAGE_WIDTH_PX * 2,
					height * 2, // Destination
				);
			}

			if (pageAdded)
				doc.addPage();
			doc.addImage(cropCanvas.toDataURL("image/jpeg", 0.98), "JPEG", 0, 0, PAGE_WIDTH_PX, PAGE_HEIGHT_PX);
			pageAdded = true;
		}

		return doc.output("blob");
	};

	const handleDownloadPdf = async () => {
		if (!contractId || !editor)
			return;

		try {
			setLoadingAction("pdf");
			const pdfBlob = await generatePdfBlob();

			// Download logic for blob
			const url = URL.createObjectURL(pdfBlob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `contract_${contractId}.pdf`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);

			message.success("نسخه PDF با موفقیت دانلود شد.");
		}
		catch (error) {
			console.error(error);
			message.error("خطا در درخواست دانلود نسخه PDF");
		}
		finally {
			setLoadingAction("none");
		}
	};

	const handleFinalApproval = async () => {
		if (!contractId || !service || !editor)
			return;

		setLoadingAction("approval");
		try {
			// 1. Generate PDF Blob
			const pdfBlob = await generatePdfBlob();

			// 2. Upload PDF to backend
			const formData = new FormData();
			formData.append("file", pdfBlob, `contract_${contractId}.pdf`);
			await requestOfficialPdf(service, contractId, formData, addendumGroupId);

			message.success("نسخه نهایی با موفقیت آپلود شد.");
			onSuccess?.();
			onClose();
		}
		catch (error: any) {
			console.error(error);
			if (error?.name === "TimeoutError") {
				message.error("مهلت ارسال و پردازش فایل به پایان رسید (Timeout). لطفا دوباره تلاش کنید.");
			}
			else {
				message.error("خطا در تایید نهایی و ارتباط با سرور");
			}
		}
		finally {
			setLoadingAction("none");
		}
	};

	return (
		<Modal
			title="پیش‌نمایش و ویرایش قرارداد"
			open={open}
			onCancel={onClose}
			width="100%"
			rootClassName={isDark ? "dark" : ""}
			style={{ top: 0, padding: 0, margin: 0, height: "100vh", maxWidth: "100vw" }}
			styles={{ body: { height: "calc(100vh - 110px)", padding: 0, overflow: "hidden" } }}
			destroyOnClose
			footer={(
				<div className="flex justify-between items-center w-full px-4">
					<div className="flex gap-2">
						<Button onClick={onClose} size="large" disabled={loadingAction !== "none"}>انصراف</Button>
					</div>
					<div className="flex gap-2">
						<Button
							size="large"
							icon={<FilePdfOutlined />}
							onClick={handleDownloadPdf}
							loading={loadingAction === "pdf"}
							disabled={loadingAction !== "none"}
						>
							دانلود نسخه PDF
						</Button>
						<Button
							type="primary"
							size="large"
							icon={<CheckCircleOutlined />}
							onClick={handleFinalApproval}
							loading={loadingAction === "approval"}
							disabled={loadingAction !== "none"}
						>
							تایید نهایی
						</Button>
					</div>
				</div>
			)}
		>
			<div className="w-full h-full relative">
				{(isFetchingFonts || loadingAction !== "none") && (
					<div className={`absolute inset-0 z-50 flex items-center justify-center backdrop-blur-sm transition-all duration-300 ${isDark ? "bg-gray-900/70" : "bg-white/70"}`}>
						<div className="flex flex-col items-center">
							<Spin size="large" />
							<span className={`mt-4 font-medium text-lg px-4 py-2 rounded-lg shadow-sm ${isDark ? "text-slate-200 bg-gray-800/80" : "text-slate-800 bg-white/80"}`}>
								{loadingAction === "approval" ? "در حال تایید نهایی قرارداد..." : (loadingAction === "pdf" ? "... لطفا صبور باشید" : "در حال بارگذاری فونت‌ها...")}
							</span>
						</div>
					</div>
				)}
				<div
					className="w-full h-full custom-modal-scroll"
					style={{
						overflowY: "hidden",
						height: "100%",
						visibility: isFetchingFonts ? "hidden" : "visible",
					}}
				>
					<ProEditor editor={editor} onChange={setContentHtml} />
				</div>
			</div>

		</Modal>
	);
};
