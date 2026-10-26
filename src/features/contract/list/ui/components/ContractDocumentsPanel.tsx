import type { UploadFile, UploadProps } from "antd";
import type { ContractDocumentDto } from "../../../api/contract-documents.api";
import { DeleteOutlined, DownloadOutlined, EyeOutlined, FileTextOutlined } from "@ant-design/icons";
import { Button, Card, Empty, Modal, Popconfirm, Spin, Upload } from "antd";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	createContractDocument,
	deleteContractDocument,
	downloadContractDocument,
	fetchContractDocumentBlob,
} from "../../../api/contract-documents.api";
import { CONTRACT_DOCUMENT_ACCEPT, CONTRACT_DOCUMENT_MAX_COUNT, getContractDocumentRejection } from "../../../shared/model/contract-documents";

interface Props {
	contractId: number
	initialDocuments: UploadFile[]
	loading?: boolean
	readOnly?: boolean
}

function documentToUploadFile(document: ContractDocumentDto): UploadFile {
	return {
		uid: String(document.id),
		documentId: document.id,
		name: document.original_filename,
		size: document.size,
		type: document.mime_type,
		status: "done",
	} as UploadFile;
}

function getDocumentId(file: UploadFile) {
	const id = Number((file as UploadFile & { documentId?: number }).documentId ?? file.uid);
	return Number.isFinite(id) ? id : null;
}

function formatFileSize(size?: number) {
	if (size == null)
		return "—";
	if (size < 1024)
		return `${new Intl.NumberFormat("fa-IR").format(size)} B`;
	if (size < 1024 * 1024)
		return `${new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 }).format(size / 1024)} KB`;
	return `${new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 }).format(size / (1024 * 1024))} MB`;
}

interface DocumentPreview {
	name: string
	url: string
	isImage: boolean
}

export function ContractDocumentsPanel({ contractId, initialDocuments, loading = false, readOnly = false }: Props) {
	const { t } = useTranslation();
	const [documents, setDocuments] = useState<UploadFile[]>(initialDocuments);
	const [uploading, setUploading] = useState(false);
	const [deletingId, setDeletingId] = useState<number | null>(null);
	const [downloadingId, setDownloadingId] = useState<number | null>(null);
	const [previewingId, setPreviewingId] = useState<number | null>(null);
	const [preview, setPreview] = useState<DocumentPreview | null>(null);

	useEffect(() => () => {
		if (preview)
			URL.revokeObjectURL(preview.url);
	}, [preview]);

	const uploadProps: UploadProps = {
		accept: CONTRACT_DOCUMENT_ACCEPT,
		multiple: true,
		showUploadList: false,
		beforeUpload: (file) => {
			const rejection = getContractDocumentRejection(file, documents.length);
			if (rejection) {
				window.$message?.warning(t(`contract.documents.${rejection}`, { name: file.name }));
				return Upload.LIST_IGNORE;
			}
			return true;
		},
		customRequest: async ({ file, onSuccess, onError }) => {
			setUploading(true);
			try {
				const document = await createContractDocument(contractId, file as File);
				setDocuments(current => [...current, documentToUploadFile(document)]);
				onSuccess?.(document);
				window.$message?.success(t("contract.documents.uploadSuccess"));
			}
			catch (error) {
				onError?.(error as Error);
				window.$message?.error(t("contract.documents.uploadFailed"));
			}
			finally {
				setUploading(false);
			}
		},
	};

	const handleDelete = async (file: UploadFile) => {
		const documentId = getDocumentId(file);
		if (documentId == null)
			return;

		setDeletingId(documentId);
		try {
			await deleteContractDocument(documentId);
			setDocuments(current => current.filter(document => getDocumentId(document) !== documentId));
			window.$message?.success(t("contract.documents.deleted"));
		}
		catch {
			window.$message?.error(t("contract.documents.deleteFailed"));
		}
		finally {
			setDeletingId(null);
		}
	};

	const handleDownload = async (file: UploadFile) => {
		const documentId = getDocumentId(file);
		if (documentId == null)
			return;

		setDownloadingId(documentId);
		try {
			await downloadContractDocument(documentId, file.name);
		}
		catch {
			window.$message?.error(t("contract.documents.downloadFailed"));
		}
		finally {
			setDownloadingId(null);
		}
	};

	const handlePreview = async (file: UploadFile) => {
		const documentId = getDocumentId(file);
		if (documentId == null)
			return;

		setPreviewingId(documentId);
		try {
			const blob = await fetchContractDocumentBlob(documentId);
			setPreview({ name: file.name, url: URL.createObjectURL(blob), isImage: blob.type.startsWith("image/") });
		}
		catch {
			window.$message?.error(t("contract.documents.previewFailed"));
		}
		finally {
			setPreviewingId(null);
		}
	};

	return (
		<Card
			size="small"
			className="w-full !rounded-2xl !bg-bgContainer [&_.ant-card-body]:p-4"
		>
			<Spin spinning={loading}>
				<div className="flex flex-col gap-4">
					<div className="flex items-center justify-between gap-3 px-1">
						<span className="font-semibold text-text">{t("contract.documents.title")}</span>
						<Upload className={readOnly ? "hidden" : undefined} {...uploadProps} disabled={readOnly || uploading || documents.length >= CONTRACT_DOCUMENT_MAX_COUNT}>
							<Button loading={uploading} className="!rounded-xl">
								{t("common.add")}
							</Button>
						</Upload>
					</div>

					{documents.length === 0
						? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("contract.documents.empty")} />
						: (
							<div className="flex flex-col gap-3">
								{documents.map((file) => {
									const documentId = getDocumentId(file);
									return (
										<Card
											key={file.uid}
											size="small"
											className="!rounded-2xl !bg-bgElevated [&_.ant-card-body]:!p-4"
										>
											<div className="flex min-w-0 items-center gap-3">
												<span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-lg text-[var(--ant-color-text-light-solid)]">
													<FileTextOutlined />
												</span>
												<div className="min-w-0 flex-1">
													<button
														type="button"
														className="block max-w-full cursor-pointer truncate bg-transparent p-0 text-start font-medium text-text"
														onClick={() => handleDownload(file)}
													>
														{file.name}
													</button>
													<span className="text-xs text-textTertiary">{formatFileSize(file.size)}</span>
												</div>
												<div className="ms-auto flex shrink-0 items-center gap-1">
													<Button
														type="text"
														size="small"
														icon={<EyeOutlined />}
														loading={previewingId === documentId}
														className="!text-primary"
														aria-label={t("contract.documents.preview")}
														onClick={() => handlePreview(file)}
													/>
													<Button
														type="text"
														size="small"
														icon={<DownloadOutlined />}
														loading={downloadingId === documentId}
														className="!text-primary"
														onClick={() => handleDownload(file)}
													/>
													<Popconfirm
														title={t("contract.documents.deleteTitle")}
														description={t("contract.documents.deleteConfirm")}
														okText={t("common.delete")}
														cancelText={t("common.cancel")}
														onConfirm={() => handleDelete(file)}
													>
														<Button
															danger
															className={readOnly ? "hidden" : undefined}
															type="text"
															size="small"
															icon={<DeleteOutlined />}
															loading={deletingId === documentId}
														/>
													</Popconfirm>
												</div>
											</div>
										</Card>
									);
								})}
							</div>
						)}
				</div>
			</Spin>
			<Modal open={preview != null} title={preview?.name} footer={null} width={900} onCancel={() => setPreview(null)} destroyOnHidden>
				{preview?.isImage
					? <img src={preview.url} alt={preview.name} className="mx-auto max-h-[70vh] max-w-full" />
					: <iframe src={preview?.url} title={preview?.name} className="h-[70vh] w-full border-0" />}
			</Modal>
		</Card>
	);
}
