import type { ContractServicePath } from "../../../api/contracts.api";
import type { ContractListItemType } from "../../model/contracts.list.types";
import { PrinterOutlined } from "@ant-design/icons";
import { App, Card, Empty, List, message, Modal, Spin, theme, Typography } from "antd";
import React, { useEffect, useState } from "react";
import { usePreferencesStore } from "../../../../../store/preferences";
import { TemplateCreateApi } from "../../../../contract-templates/api/api";
import { getVariable } from "../../../../contract-templates/create/components/editor/variables/registry";
import { fetchContractDetail, fetchContractTemplates } from "../../../api/contracts.api";
import { ContractTemplateEditorModal } from "./ContractTemplateEditorModal";

interface Props {
	open: boolean
	onClose: () => void
	record: ContractListItemType | null
	service: ContractServicePath | null
	companyType: string | null
}

function getVariableValueFromContract(varKey: string, data: any): string | undefined {
	if (!data)
		return undefined;

	// Explicit mappings for common keys
	const mappings: Record<string, any> = {
		company_name: data.company?.name || data.company?.legal_name,
		name: data.company?.name,
		company_legal_name: data.company?.legal_name || data.company?.name,
		company_national_id: data.company?.national_id,
		national_id: data.company?.national_id,
		company_registration_number: data.company?.registration_number,
		contract_number: data.contract_number || data.contractNumber,
		service_name: data.service?.name,
		start_jy: data.start_jy,
		start_jm: data.start_jm,
		end_jy: data.end_jy,
		end_jm: data.end_jm,
		today_jalali: new Date().toLocaleDateString("fa-IR"), // Always available at generation time
	};

	if (varKey in mappings) {
		const val = mappings[varKey];
		return (val !== null && val !== undefined && val !== "") ? String(val) : undefined;
	}

	// Fallback: search anywhere in the object
	let foundValue: string | undefined;
	const search = (obj: any) => {
		if (foundValue !== undefined)
			return;
		if (!obj || typeof obj !== "object")
			return;

		for (const [k, v] of Object.entries(obj)) {
			// Basic match or camelCase to snake_case match
			if ((k === varKey || k === varKey.replace(/_([a-z])/g, g => g[1].toUpperCase())) && v !== null && v !== undefined && v !== "") {
				foundValue = String(v);
				return;
			}
			if (typeof v === "object") {
				search(v);
			}
		}
	};
	search(data);

	return foundValue;
}

function replaceVariablesInHtml(html: string, contractData: any, missingVars: string[]): string {
	if (!html)
		return "";

	return html.replace(/<span([^>]*)data-variable=["']([^"']+)["']([^>]*)>.*?<\/span>/gi, (match, before, key, after) => {
		const value = getVariableValueFromContract(key, contractData);
		if (value !== undefined) {
			const formattedValue = String(value).replace(/\n/g, "<br/>");
			return `<span${before}${after}>${formattedValue}</span>`;
		}
		else {
			missingVars.push(key);
			const label = getVariable(key)?.label || key;
			return `<mark style="background-color: #fef0f0; color: #f5222d;"><span${before}${after}>[${label}]</span></mark>`;
		}
	});
}

export const ContractTemplatePrintModal: React.FC<Props> = ({ open, onClose, record, service, companyType }) => {
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
			fetchContractTemplates(serviceStr, companyType)
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
	}, [open, service, companyType]);

	const handleSelectTemplate = async (template: any) => {
		if (!record || !service)
			return;

		setComparingId(template.id);
		try {
			const [templateData, contractData] = await Promise.all([
				TemplateCreateApi.getTemplate(template.id),
				fetchContractDetail(service, record.id),
			]);

			const templateHtml = templateData?.content_html || "";
			const missingVars: string[] = [];
			const newHtml = replaceVariablesInHtml(templateHtml, contractData, missingVars);

			// De-duplicate missing vars
			const uniqueMissingVars = Array.from(new Set(missingVars));

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

			if (uniqueMissingVars.length > 0) {
				const missingLabels = uniqueMissingVars.map(v => getVariable(v)?.label || v);
				modal.confirm({
					title: "عدم تطابق اطلاعات قرارداد با قالب",
					icon: <PrinterOutlined className="text-orange-500" />,
					content: (
						<div>
							<p className="mb-2">اطلاعات زیر در قرارداد یافت نشد. این مقادیر در ویرایشگر به‌صورت هایلایت نمایش داده می‌شوند تا بتوانید آن‌ها را تکمیل کنید:</p>
							<ul className="mt-2 pl-4 list-disc max-h-60 overflow-y-auto" style={{ color: token.colorError }}>
								{missingLabels.map(label => <li key={label} className="mb-1">{label}</li>)}
							</ul>
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
					initialHtml={processedHtml}
					templateId={currentTemplateId}
					contractId={record?.id || null}
					service={service}
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
