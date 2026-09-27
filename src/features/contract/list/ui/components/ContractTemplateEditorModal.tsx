import { CheckCircleOutlined, FilePdfOutlined } from "@ant-design/icons";
import { Button, message, Modal, Spin } from "antd";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import React, { useEffect, useState } from "react";
import ProEditor from "../../../../contract-templates/create/components/editor/ProEditor";
import { useTemplateEditor } from "../../../../contract-templates/create/components/editor/ui/TemplateEditorCanvas";
import { useTemplateStore } from "../../../../contract-templates/store/useTemplateStore";
import { fetchSignFlowPreview, requestOfficialPdf } from "../../../api/contracts.api";
import { SignFlowPreviewModal } from "./SignFlowPreviewModal";

interface Props {
	open: boolean
	onClose: () => void
	initialHtml: string
	templateId: number | null
	onPrint: (html: string) => void
	contractId: number | null
	service: any
}

export const ContractTemplateEditorModal: React.FC<Props> = ({ open, onClose, initialHtml, templateId, contractId, service }) => {
	const { fetchFonts, isFetchingFonts } = useTemplateStore();
	const [contentHtml, setContentHtml] = useState(initialHtml);
	const [isPdfLoading, setIsPdfLoading] = useState(false);
	const [signFlowModalOpen, setSignFlowModalOpen] = useState(false);
	const [signFlowLoading, setSignFlowLoading] = useState(false);
	const [signFlowData, setSignFlowData] = useState<any>(null);

	const editor = useTemplateEditor({ initialContent: contentHtml });

	useEffect(() => {
		if (open) {
			// eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
			setContentHtml(initialHtml);
			if (editor && initialHtml) {
				editor.commands.setContent(initialHtml);
			}
			fetchFonts();
		}
	}, [open, initialHtml, templateId, fetchFonts, editor]);

	const generatePdfBlob = async (): Promise<Blob> => {
		const editorNode = document.querySelector(".ms-word-editor") as HTMLElement;
		if (!editorNode)
			throw new Error("Editor node not found");

		// Hide the active page highlight
		const highlight = Array.from(editorNode.children).find(c =>
			(c as HTMLElement).style.zIndex === "10" && (c as HTMLElement).style.pointerEvents === "none",
		) as HTMLElement;
		let oldHighlightDisplay = "";
		if (highlight) {
			oldHighlightDisplay = highlight.style.display;
			highlight.style.display = "none";
		}

		// Hide column resize handles
		const resizeHandles = Array.from(editorNode.querySelectorAll(".column-resize-handle")) as HTMLElement[];
		const oldResizeDisplays = resizeHandles.map(el => el.style.display);
		resizeHandles.forEach(el => el.style.display = "none");

		// Temporarily replace <mark> tags with dotted lines
		const originalMarks: { element: HTMLElement, bg: string, color: string, html: string }[] = [];
		const marks = editorNode.querySelectorAll("mark");
		marks.forEach((mark) => {
			originalMarks.push({
				element: mark,
				bg: mark.style.backgroundColor,
				color: mark.style.color,
				html: mark.innerHTML,
			});
			const span = document.createElement("span");
			span.style.letterSpacing = "2px";
			span.textContent = "........................................";
			mark.innerHTML = "";
			mark.appendChild(span);
			mark.style.backgroundColor = "transparent";
			mark.style.color = "inherit";
		});

		try {
			// Find page offsets based on TemplateEditorCanvas logic
			const hrs = Array.from(editorNode.querySelectorAll("hr, .page-break")) as HTMLElement[];
			const editorRect = editorNode.getBoundingClientRect();
			// offsets array tells us exactly where each page starts relative to the top of editorNode
			const offsets = [0, ...hrs.map(hr => hr.getBoundingClientRect().bottom - editorRect.top)];

			const PAGE_HEIGHT_PX = 1123;
			const PAGE_WIDTH_PX = 794;

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
			});

			let pageAdded = false;

			// Now we crop it precisely for each page (or split if a page is overflowing)
			for (let i = 0; i < offsets.length; i++) {
				const chunkStartY = offsets[i];
				const chunkEndY = i < hrs.length ? hrs[i].getBoundingClientRect().top - editorRect.top : editorRect.height;

				let currentY = chunkStartY;

				// Slice this chunk into PAGE_HEIGHT_PX pieces if it overflows
				while (currentY < chunkEndY) {
					const sliceHeight = Math.min(chunkEndY - currentY, PAGE_HEIGHT_PX);

					const cropCanvas = document.createElement("canvas");
					cropCanvas.width = PAGE_WIDTH_PX * 2;
					cropCanvas.height = PAGE_HEIGHT_PX * 2;
					const ctx = cropCanvas.getContext("2d");

					if (ctx) {
						ctx.fillStyle = "#ffffff";
						ctx.fillRect(0, 0, cropCanvas.width, cropCanvas.height);
						// Draw exactly the content of this slice
						ctx.drawImage(
							giantCanvas,
							0,
							currentY * 2,
							PAGE_WIDTH_PX * 2,
							sliceHeight * 2, // Source crop
							0,
							0,
							PAGE_WIDTH_PX * 2,
							sliceHeight * 2, // Destination
						);
					}

					if (pageAdded)
						doc.addPage();
					doc.addImage(cropCanvas.toDataURL("image/jpeg", 0.98), "JPEG", 0, 0, PAGE_WIDTH_PX, PAGE_HEIGHT_PX);
					pageAdded = true;

					currentY += sliceHeight;
				}
			}

			return doc.output("blob");
		}
		finally {
			// Revert marks
			originalMarks.forEach((m) => {
				m.element.style.backgroundColor = m.bg;
				m.element.style.color = m.color;
				m.element.innerHTML = m.html;
			});
			// Revert highlight and resize handles
			if (highlight)
				highlight.style.display = oldHighlightDisplay;
			resizeHandles.forEach((el, idx) => el.style.display = oldResizeDisplays[idx]);
		}
	};

	const handleDownloadPdf = async () => {
		if (!contractId || !editor)
			return;

		try {
			setIsPdfLoading(true);
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
			setIsPdfLoading(false);
		}
	};

	const handleFinalApproval = async () => {
		if (!contractId || !service || !editor)
			return;

		setSignFlowLoading(true);
		setIsPdfLoading(true);
		try {
			// 1. Generate PDF Blob
			const pdfBlob = await generatePdfBlob();

			// 2. Upload PDF to backend
			const formData = new FormData();
			formData.append("file", pdfBlob, `contract_${contractId}.pdf`);
			await requestOfficialPdf(service, contractId, formData);

			// 3. Fetch Sign Flow preview
			const res = await fetchSignFlowPreview(service, contractId);
			setSignFlowData(res);

			// 4. Open Modal
			setSignFlowModalOpen(true);
		}
		catch (error) {
			console.error(error);
			message.error("خطا در تایید نهایی و ارتباط با سرور");
		}
		finally {
			setSignFlowLoading(false);
			setIsPdfLoading(false);
		}
	};

	const handleStartSignFlow = () => {
		// Mock implementation as the real API is unknown yet
		message.success("گردش کار با موفقیت شروع شد!");
		setSignFlowModalOpen(false);
		onClose();
	};

	return (
		<Modal
			title="پیش‌نمایش و ویرایش قرارداد"
			open={open}
			onCancel={onClose}
			width="100%"
			style={{ top: 0, padding: 0, margin: 0, height: "100vh", maxWidth: "100vw" }}
			styles={{ body: { height: "calc(100vh - 110px)", padding: 0, overflow: "hidden" } }}
			destroyOnClose
			footer={(
				<div className="flex justify-between items-center w-full px-4">
					<div className="flex gap-2">
						<Button onClick={onClose} size="large">انصراف</Button>
					</div>
					<div className="flex gap-2">
						<Button
							size="large"
							icon={<FilePdfOutlined />}
							onClick={handleDownloadPdf}
							loading={isPdfLoading}
						>
							دانلود نسخه PDF
						</Button>
						<Button
							type="primary"
							size="large"
							icon={<CheckCircleOutlined />}
							onClick={handleFinalApproval}
						>
							تایید نهایی
						</Button>
					</div>
				</div>
			)}
		>
			<div className="w-full h-full relative">
				{(isFetchingFonts || isPdfLoading) && (
					<div className="absolute inset-0 z-50 flex items-center justify-center bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm transition-all duration-300">
						<div className="flex flex-col items-center">
							<Spin size="large" />
							<span className="mt-4 text-slate-800 dark:text-slate-200 font-medium text-lg bg-white/80 dark:bg-slate-800/80 px-4 py-2 rounded-lg shadow-sm">
								{isPdfLoading ? "در حال آماده‌سازی PDF... لطفا صبور باشید" : "در حال بارگذاری فونت‌ها..."}
							</span>
						</div>
					</div>
				)}
				<div
					className="w-full h-full custom-modal-scroll"
					style={{
						overflowY: "auto",
						height: "100%",
						visibility: isFetchingFonts ? "hidden" : "visible",
					}}
				>
					<ProEditor editor={editor} onChange={setContentHtml} />
				</div>
			</div>

			<SignFlowPreviewModal
				open={signFlowModalOpen}
				onClose={() => setSignFlowModalOpen(false)}
				loading={signFlowLoading}
				data={signFlowData}
				onStart={handleStartSignFlow}
			/>
		</Modal>
	);
};
