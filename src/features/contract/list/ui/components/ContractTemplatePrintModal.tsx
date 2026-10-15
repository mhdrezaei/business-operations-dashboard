import type { ContractServicePath, TemplateTagValuesResponse } from "../../../api/contracts.api";
import type { ContractListItemType } from "../../model/contracts.list.types";
import { PrinterOutlined } from "@ant-design/icons";
import { App, Card, Empty, List, message, Modal, Spin, theme, Typography } from "antd";
import React, { useEffect, useState } from "react";
import { usePreferencesStore } from "../../../../../store/preferences";
import { TemplateCreateApi } from "../../../../contract-templates/api/api";
import { getVariable } from "../../../../contract-templates/create/components/editor/variables/registry";
import { mapTemplateHeader, useTemplateStore } from "../../../../contract-templates/store/useTemplateStore";
import { fetchContractTemplates, fetchTemplateTagValues } from "../../../api/contracts.api";

import { ContractTemplateEditorModal } from "./ContractTemplateEditorModal";

interface Props {
	open: boolean
	onClose: () => void
	onSuccess?: () => void
	record: ContractListItemType | null
	service: ContractServicePath | null
	companyType: string | null
	addendumGroupId?: string | null
}

function replaceVariablesInHtml(html: string, tagValues: TemplateTagValuesResponse, missingVars: string[], unknownVars: string[]): string {
	if (!html)
		return "";

	return html.replace(/<span([^>]*)data-variable=["']([^"']+)["']([^>]*)>.*?<\/span>/gi, (match, before, key, after) => {
		const value = tagValues.values[key];
		const isMissing = tagValues.missing.includes(key);
		const isUnknown = tagValues.unknown.includes(key);

		if (!isMissing && !isUnknown && value !== undefined && value !== null) {
			const formattedValue = String(value).replace(/\n/g, "<br/>");
			return `<span${before}${after}>${formattedValue}</span>`;
		}
		else {
			if (isUnknown)
				unknownVars.push(key);
			else
				missingVars.push(key);

			const label = tagValues.labels[key] || getVariable(key)?.label || key;
			return `<mark style="background-color: #fef0f0; color: #f5222d;"><span${before}${after}>[${label}]</span></mark>`;
		}
	});
}

export const ContractTemplatePrintModal: React.FC<Props> = ({ open, onClose, onSuccess, record, service, companyType, addendumGroupId }) => {
	const [templates, setTemplates] = useState<any[]>([]);
	const [loading, setLoading] = useState(false);
	const [comparingId, setComparingId] = useState<number | null>(null);
	const [editorModalOpen, setEditorModalOpen] = useState(false);
	const [currentTemplateId, setCurrentTemplateId] = useState<number | null>(null);
	const [processedHtml, setProcessedHtml] = useState<string>("");

	const { modal } = App.useApp();
	const { token } = theme.useToken();
	const prefTheme = usePreferencesStore(state => state.theme);
	const isDark = prefTheme === "dark" || (prefTheme === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);

	useEffect(() => {
		if (open && service) {
			// eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
			setLoading(true);
			const serviceStr = service.split("/")[0]; // e.g. sms/client -> sms
			fetchContractTemplates(serviceStr, companyType, addendumGroupId ? "addendum" : "contract")
				.then((res) => {
					// Handle paginated response or array
					const data = res?.results ?? res ?? [];
					setTemplates(Array.isArray(data) ? data : []);
				})
				.catch((_err) => {
					console.error(_err);
					window.$message?.error("خطا در دریافت لیست قالب‌ها");
				})
				.finally(() => {
					setLoading(false);
				});
		}
		else {
			// eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
			setTemplates([]);
		}
	}, [open, service, companyType, addendumGroupId]);

	const handleSelectTemplate = async (template: any) => {
		if (!record || !service)
			return;

		setComparingId(template.id);
		try {
			const [templateData, tagValues] = await Promise.all([
				TemplateCreateApi.getTemplate(template.id),
				fetchTemplateTagValues(template.id, record.id, addendumGroupId),
			]);

			useTemplateStore.getState().setHeaderData(mapTemplateHeader(templateData?.header));

			const templateHtml = templateData?.content_html || "";
			const missingVars: string[] = [];
			const unknownVars: string[] = [];
			const newHtml = replaceVariablesInHtml(templateHtml, tagValues, missingVars, unknownVars);

			// De-duplicate
			const uniqueMissingVars = Array.from(new Set(missingVars));
			const uniqueUnknownVars = Array.from(new Set(unknownVars));

			const onContinue = () => {
				modal.confirm({
					title: "تنظیمات مرورگر",
					content: "توجه: برای بهترین نمایش و جلوگیری از به‌هم‌ریختگی قالب در هنگام چاپ، لطفاً مطمئن شوید که زوم مرورگر شما روی ۱۰۰٪ تنظیم شده است.",
					okText: "تایید و ادامه",
					cancelText: "انصراف",
					onOk: () => {
						setProcessedHtml(newHtml);
						setCurrentTemplateId(template.id);
						setEditorModalOpen(true);
					},
				});
			};

			if (uniqueMissingVars.length > 0 || uniqueUnknownVars.length > 0) {
				const missingLabels = uniqueMissingVars.map(v => tagValues.labels[v] || getVariable(v)?.label || v);
				const unknownLabels = uniqueUnknownVars.map(v => tagValues.labels[v] || getVariable(v)?.label || v);

				modal.confirm({
					title: "عدم تطابق اطلاعات قرارداد با قالب",
					icon: <PrinterOutlined className="text-orange-500" />,
					content: (
						<div>
							{uniqueMissingVars.length > 0 && (
								<>
									<p className="mb-2">اطلاعات زیر در قرارداد یافت نشد. این مقادیر در ویرایشگر به‌صورت هایلایت نمایش داده می‌شوند تا بتوانید آن‌ها را تکمیل کنید:</p>
									<ul className="mt-2 pl-4 list-disc max-h-40 overflow-y-auto" style={{ color: token.colorError }}>
										{missingLabels.map(label => <li key={label} className="mb-1">{label}</li>)}
									</ul>
								</>
							)}
							{uniqueUnknownVars.length > 0 && (
								<>
									<p className="mb-2 mt-4 text-orange-500">متغیرهای زیر در این سیستم شناسایی نشدند (ممکن است قالب نیاز به بروزرسانی داشته باشد):</p>
									<ul className="mt-2 pl-4 list-disc max-h-40 overflow-y-auto" style={{ color: "#faad14" }}>
										{unknownLabels.map(label => <li key={label} className="mb-1">{label}</li>)}
									</ul>
								</>
							)}
						</div>
					),
					okText: "ادامه به ویرایشگر",
					cancelText: "انصراف",
					onOk: onContinue,
				});
			}
			else {
				modal.confirm({
					title: "قالب سازگار است",
					content: "قالب انتخاب شده به‌طور کامل با اطلاعات قرارداد سازگار است. آیا می‌خواهید برای مشاهده و چاپ وارد ویرایشگر شوید؟",
					okText: "ادامه به ویرایشگر",
					cancelText: "انصراف",
					onOk: onContinue,
				});
			}
		}
		catch (error) {
			console.error(error);
			message.error("خطا در بررسی تطابق قالب و قرارداد.");
		}
		finally {
			setComparingId(null);
		}
	};

	return (
		<Modal
			title="انتخاب قالب قرارداد جهت چاپ"
			open={open}
			onCancel={onClose}
			footer={null}
			width={700}
			rootClassName={isDark ? "dark" : ""}
			destroyOnClose
		>
			<Spin spinning={loading}>
				{templates.length === 0 && !loading
					? (
						<Empty description="قالبی یافت نشد" className="my-8" />
					)
					: (
						<List
							className="mt-4"
							grid={{ gutter: 16, column: 2, xs: 1, sm: 1, md: 2 }}
							dataSource={templates}
							renderItem={item => (
								<List.Item>
									<Spin spinning={comparingId === item.id} tip="در حال مقایسه...">
										<Card
											hoverable
											onClick={() => {
												if (comparingId !== item.id) {
													handleSelectTemplate(item);
												}
											}}
											className={`border border-solid transition-colors shadow-sm ${comparingId === item.id ? "border-primary-500 opacity-80" : "border-gray-200 dark:border-gray-700 hover:border-primary-500"}`}
										>
											<Card.Meta
												avatar={(
													<div className="bg-primary-50 dark:bg-primary-900 p-3 rounded-full flex items-center justify-center">
														<PrinterOutlined className="text-xl text-primary-500" />
													</div>
												)}
												title={<span className="text-base font-medium">{item.name || item.title || "قالب قرارداد"}</span>}
												description={(
													<Typography.Text type="secondary" className="line-clamp-2 mt-2 text-sm">
														{item.description || "جهت بررسی سازگاری و چاپ این قالب، کلیک کنید"}
													</Typography.Text>
												)}
											/>
										</Card>
									</Spin>
								</List.Item>
							)}
						/>
					)}
			</Spin>
			{editorModalOpen && (
				<ContractTemplateEditorModal
					open={editorModalOpen}
					onClose={() => setEditorModalOpen(false)}
					onSuccess={() => {
						setEditorModalOpen(false);
						onClose();
						onSuccess?.();
					}}
					initialHtml={processedHtml}
					templateId={currentTemplateId}
					contractId={record?.id || null}
					service={service}
					addendumGroupId={addendumGroupId}
					onPrint={(html) => {
						const win = window.open("", "_blank", "width=1100,height=860");
						if (win) {
							win.document.open();
							win.document.write(`
								<!DOCTYPE html>
								<html lang="fa" dir="rtl">
								<head>
									<meta charset="UTF-8">
									<title>چاپ قرارداد</title>
									<style>
										@page { margin: 20mm; }
										body { font-family: "Vazirmatn", Tahoma, Arial, sans-serif; }
										table { border-collapse: collapse; width: 100%; }
										td, th { border: 1px solid #000; padding: 8px; }
										table[data-borderless="true"] td, table[data-borderless="true"] th { border-color: transparent; }
									</style>
								</head>
								<body>
									${html}
								</body>
								</html>
							`);
							win.document.close();
							setTimeout(() => {
								win.focus();
								win.print();
							}, 500);
						}
					}}
				/>
			)}
		</Modal>
	);
};
