import type { ContractServicePath } from "../../../api/contracts.api";
import type { ContractListItemType } from "../../model/contracts.list.types";
import { PrinterOutlined } from "@ant-design/icons";
import { Card, Empty, List, message, Modal, Spin, Typography } from "antd";
import React, { useEffect, useState } from "react";
import { TemplateCreateApi } from "../../../../contract-templates/api/api";
import { getVariable } from "../../../../contract-templates/create/components/editor/variables/registry";
import { fetchContractDetail, fetchContractTemplates } from "../../../api/contracts.api";

interface Props {
	open: boolean
	onClose: () => void
	record: ContractListItemType | null
	service: ContractServicePath | null
	companyType: string | null
}

function extractTemplateVariablesFromHtml(html: string): string[] {
	if (!html)
		return [];
	const vars = new Set<string>();
	const regex = /data-variable=["']([^"']+)["']/g;
	let match = regex.exec(html);
	while (match !== null) {
		vars.add(match[1]);
		match = regex.exec(html);
	}
	return Array.from(vars);
}

function checkVariableInContract(varKey: string, data: any): boolean {
	if (!data)
		return false;

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
		today_jalali: true, // Always available at generation time
	};

	if (varKey in mappings) {
		const val = mappings[varKey];
		return val !== null && val !== undefined && val !== "";
	}

	// Fallback: search anywhere in the object
	let found = false;
	const search = (obj: any) => {
		if (found)
			return;
		if (!obj || typeof obj !== "object")
			return;

		for (const [k, v] of Object.entries(obj)) {
			// Basic match or camelCase to snake_case match
			if ((k === varKey || k === varKey.replace(/_([a-z])/g, g => g[1].toUpperCase())) && v !== null && v !== undefined && v !== "") {
				found = true;
				return;
			}
			if (typeof v === "object") {
				search(v);
			}
		}
	};
	search(data);

	return found;
};

export const ContractTemplatePrintModal: React.FC<Props> = ({ open, onClose, record, service, companyType }) => {
	const [templates, setTemplates] = useState<any[]>([]);
	const [loading, setLoading] = useState(false);
	const [comparingId, setComparingId] = useState<number | null>(null);

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
			const requiredVars = extractTemplateVariablesFromHtml(templateHtml);

			const missingVars: string[] = [];
			requiredVars.forEach((varKey) => {
				const hasValue = checkVariableInContract(varKey, contractData);
				if (!hasValue) {
					missingVars.push(varKey);
				}
			});

			if (missingVars.length > 0) {
				const missingLabels = missingVars.map(v => getVariable(v)?.label || v);
				Modal.warning({
					title: "عدم تطابق اطلاعات قرارداد با قالب",
					content: (
						<div className="text-[var(--ant-color-text)]">
							<p className="mb-2">اطلاعات زیر در قرارداد یافت نشد و این قالب به آن‌ها نیاز دارد:</p>
							<ul className="mt-2 pl-4 text-red-500 dark:text-red-400 list-disc max-h-60 overflow-y-auto">
								{missingLabels.map(label => <li key={label} className="mb-1">{label}</li>)}
							</ul>
						</div>
					),
					okText: "متوجه شدم",
				});
			}
			else {
				message.success("قالب انتخاب شده به‌طور کامل با اطلاعات قرارداد سازگار است.");
				// Additional actions (like opening the preview or printing) could be triggered here
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
		</Modal>
	);
};
