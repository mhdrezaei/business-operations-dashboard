import { PrinterOutlined } from "@ant-design/icons";
import { Button, Modal, Spin } from "antd";
import React, { useEffect, useState } from "react";
import ProEditor from "../../../../contract-templates/create/components/editor/ProEditor";
import { useTemplateEditor } from "../../../../contract-templates/create/components/editor/ui/TemplateEditorCanvas";
import { useTemplateStore } from "../../../../contract-templates/store/useTemplateStore";

interface Props {
	open: boolean
	onClose: () => void
	initialHtml: string
	templateId: number | null
	onPrint: (html: string) => void
}

export const ContractTemplateEditorModal: React.FC<Props> = ({ open, onClose, initialHtml, templateId, onPrint }) => {
	const { fetchFonts, isFetchingFonts } = useTemplateStore();
	const [contentHtml, setContentHtml] = useState(initialHtml);

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

	const handlePrint = () => {
		if (editor) {
			onPrint(editor.getHTML());
		}
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
				<div className="flex justify-end gap-2 w-full px-4">
					<Button onClick={onClose}>انصراف</Button>
					<Button type="primary" icon={<PrinterOutlined />} onClick={handlePrint}>
						تایید و چاپ
					</Button>
				</div>
			)}
		>
			<div className="w-full h-full relative">
				{isFetchingFonts && (
					<div className="absolute inset-0 z-50 flex items-center justify-center bg-white/60 dark:bg-slate-900/60">
						<Spin size="large" tip="در حال بارگذاری فونت‌ها..." />
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
		</Modal>
	);
};
