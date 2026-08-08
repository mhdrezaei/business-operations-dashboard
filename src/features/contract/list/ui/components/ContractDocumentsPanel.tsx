import type { UploadFile, UploadProps } from "antd";
import type { ContractDocumentDto } from "../../../api/contract-documents.api";
import { DeleteOutlined, DownloadOutlined, FileTextOutlined } from "@ant-design/icons";
import { Button, Card, Empty, Popconfirm, Spin, Upload } from "antd";
import { useState } from "react";
import {
	createContractDocument,
	deleteContractDocument,
	downloadContractDocument,
} from "../../../api/contract-documents.api";

interface Props {
	contractId: number
	initialDocuments: UploadFile[]
	loading?: boolean
}

const MAX_FILE_COUNT = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

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

export function ContractDocumentsPanel({ contractId, initialDocuments, loading = false }: Props) {
	const [documents, setDocuments] = useState<UploadFile[]>(initialDocuments);
	const [uploading, setUploading] = useState(false);
	const [deletingId, setDeletingId] = useState<number | null>(null);
	const [downloadingId, setDownloadingId] = useState<number | null>(null);

	const uploadProps: UploadProps = {
		accept: ".pdf,.png,.jpg,.jpeg",
		multiple: true,
		showUploadList: false,
		beforeUpload: (file) => {
			if (documents.length >= MAX_FILE_COUNT) {
				window.$message?.error("حداکثر ۱۰ فایل قابل افزودن است");
				return Upload.LIST_IGNORE;
			}
			if (file.size > MAX_FILE_SIZE) {
				window.$message?.error("حجم هر فایل باید حداکثر ۵ مگابایت باشد");
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
				window.$message?.success("فایل با موفقیت افزوده شد");
			}
			catch (error) {
				onError?.(error as Error);
				window.$message?.error("افزودن فایل ناموفق بود");
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
			window.$message?.success("فایل حذف شد");
		}
		catch {
			window.$message?.error("حذف فایل ناموفق بود");
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
			window.$message?.error("دریافت فایل ناموفق بود");
		}
		finally {
			setDownloadingId(null);
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
						<span className="font-semibold text-text">فایل‌های پیوست</span>
						<Upload {...uploadProps} disabled={uploading || documents.length >= MAX_FILE_COUNT}>
							<Button loading={uploading} className="!rounded-xl">
								افزودن
							</Button>
						</Upload>
					</div>

					{documents.length === 0
						? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="فایلی پیوست نشده است" />
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
														icon={<DownloadOutlined />}
														loading={downloadingId === documentId}
														className="!text-primary"
														onClick={() => handleDownload(file)}
													/>
													<Popconfirm
														title="حذف فایل"
														description="این فایل حذف شود؟"
														okText="حذف"
														cancelText="انصراف"
														onConfirm={() => handleDelete(file)}
													>
														<Button
															danger
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
		</Card>
	);
}
