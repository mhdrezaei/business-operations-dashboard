import type { TFunction } from "i18next";

import { RHFProText, RHFSelect } from "#src/shared/ui/rhf-pro";
import { request } from "#src/utils/request/";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, Form, Modal } from "antd";
import React, { useMemo, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { z } from "zod";

import { agentCompanyId, createSmsCommissionAgent, deleteSmsCommissionAgent, updateSmsCommissionAgent } from "../../api/sms-commission-agents.api";
import { deleteTrafficDatacenter, updateTrafficDatacenter } from "../../api/traffic-datacenters.api";
import { smsCommissionAgentsQuery, trafficDatacentersQuery } from "../../queries/company-profile.queries";
import { companyNameFields } from "../utils/company-name-schema";
import { buildCompanyRenamePayload } from "../utils/company-rename";

interface Props {
	open: boolean
	disabled?: boolean
	serviceId: number
	companyType: string | null
	requiresCompanyType: boolean
	companyTypeOptions: Array<{ label: string, value: string }>
	isSmsCommission: boolean
	isDatacenter: boolean
	companyId: number | null
	companyName: string | null
	onClose: () => void
	onRenamed: (newName: string, newCompanyType: string | null) => void
	onDeleted: () => void
}

interface RenameCompanyFormValues {
	company_type: string | null
	name: string
	agent_name: string
}

function createRenameCompanySchema(t: TFunction) {
	return z.object(companyNameFields(t)) as unknown as z.ZodType<RenameCompanyFormValues, RenameCompanyFormValues>;
}

export default function CompanyRenameModal({
	open,
	disabled,
	serviceId,
	companyType,
	requiresCompanyType,
	companyTypeOptions,
	isSmsCommission,
	isDatacenter,
	companyId,
	companyName,
	onClose,
	onRenamed,
	onDeleted,
}: Props) {
	const qc = useQueryClient();
	const { t } = useTranslation();
	const { modal } = App.useApp();
	const renameCompanySchema = useMemo(() => createRenameCompanySchema(t), [t]);
	const [saving, setSaving] = useState(false);
	const [deleting, setDeleting] = useState(false);

	const needsAgent = isSmsCommission && !isDatacenter;
	const agentsQuery = useQuery({ ...smsCommissionAgentsQuery(), enabled: open && needsAgent });
	// تا بارگذاری لیست نمایندگان، نماینده موجود نامعلوم است و ثبت/حذف ممکن است تکراری شود یا رد شود
	const agentsNotReady = needsAgent && !agentsQuery.isSuccess;
	const existingAgent = useMemo(
		() => (agentsQuery.data ?? []).find(agent => agentCompanyId(agent) === companyId),
		[agentsQuery.data, companyId],
	);

	const defaultValues = useMemo<RenameCompanyFormValues>(() => ({
		company_type: companyType,
		name: companyName ?? "",
		agent_name: existingAgent?.name ?? "",
	}), [companyName, companyType, existingAgent?.name]);

	const methods = useForm<RenameCompanyFormValues>({
		defaultValues,
		resolver: zodResolver(renameCompanySchema),
		mode: "onBlur",
	});

	React.useEffect(() => {
		if (open) {
			methods.reset(defaultValues);
		}
	}, [open, companyId, defaultValues]);

	const isDisabled = !!disabled || !companyId || agentsNotReady;
	const current = methods.watch();
	const typeChanged = requiresCompanyType && !isDatacenter && current.company_type !== defaultValues.company_type;
	const agentChanged = needsAgent && current.agent_name.trim() !== defaultValues.agent_name.trim();
	const isChanged = current.name.trim() !== defaultValues.name.trim() || typeChanged || agentChanged;
	const kind = isDatacenter ? "datacenter" : "company";

	async function submit(values: RenameCompanyFormValues) {
		if (!companyId)
			return;
		const needsType = requiresCompanyType && !isDatacenter;
		if (needsType && !values.company_type) {
			window.$message?.warning(t("companyProfile.companyTypePlaceholder"));
			return;
		}
		if (needsAgent && !values.agent_name) {
			window.$message?.warning(t("companyProfile.agentNameRequired"));
			return;
		}

		modal.confirm({
			title: t(`companyProfile.${kind}.confirmTitle`),
			content: t(`companyProfile.${kind}.confirmContent`),
			okText: t("companyProfile.confirmRename"),
			cancelText: t("common.cancel"),
			onOk: () => save(companyId, values),
		});
	}

	async function save(id: number, values: RenameCompanyFormValues) {
		setSaving(true);
		try {
			const name = values.name.trim();
			if (isDatacenter) {
				await updateTrafficDatacenter(id, { name });
				await qc.invalidateQueries({ queryKey: trafficDatacentersQuery().queryKey });
			}
			else {
				const payload = buildCompanyRenamePayload(name, serviceId, values.company_type);

				await request.put(`common/companies/${id}/`, { json: payload }).json<unknown>();

				if (isSmsCommission) {
					const agentPayload = { name: values.agent_name, company: id };
					if (existingAgent)
						await updateSmsCommissionAgent(existingAgent.id, agentPayload);
					else
						await createSmsCommissionAgent(agentPayload);
					await qc.invalidateQueries({ queryKey: smsCommissionAgentsQuery().queryKey });
				}

				await qc.invalidateQueries({ queryKey: ["common", "companies", { serviceId }] });
			}

			window.$message?.success(t(`companyProfile.${kind}.renameSuccess`));
			onRenamed(name, values.company_type);
		}
		catch (e) {
			console.error(e);
			window.$message?.error(t("companyProfile.genericError"));
		}
		finally {
			setSaving(false);
		}
	}

	async function confirmDelete() {
		if (!companyId)
			return;

		modal.confirm({
			title: t(`companyProfile.${kind}.deleteTitle`),
			content: t(`companyProfile.${kind}.deleteContent`),
			okText: t("common.delete"),
			cancelText: t("common.cancel"),
			okButtonProps: { danger: true },
			onOk: async () => {
				setDeleting(true);
				try {
					if (isDatacenter) {
						await deleteTrafficDatacenter(companyId);
						await qc.invalidateQueries({ queryKey: trafficDatacentersQuery().queryKey });
					}
					else {
						if (needsAgent && existingAgent)
							await deleteSmsCommissionAgent(existingAgent.id);
						await request.delete(`common/companies/${companyId}/`).json<void>();

						await qc.invalidateQueries({ queryKey: ["common", "companies", { serviceId }] });

						await qc.invalidateQueries({ queryKey: ["contracts", "companyProfiles", { companyId }] });
					}

					window.$message?.success(t(`companyProfile.${kind}.deleteSuccess`));
					onDeleted();
				}
				catch (e) {
					console.error(e);
					window.$message?.error(t("companyProfile.genericError"));
				}
				finally {
					setDeleting(false);
				}
			},
		});
	}

	return (
		<Modal
			open={open}
			onCancel={() => {
				if (!saving && !deleting)
					onClose();
			}}
			title={t(`companyProfile.${kind}.renameTitle`)}
			footer={null}
			destroyOnHidden
		>
			<Form layout="vertical">
				<FormProvider {...methods}>
					{/* نمایش شرکت انتخاب شده */}
					<div className="mb-3 opacity-85">
						<div className="mb-1.5">{t(`companyProfile.${kind}.selected`)}</div>
						<div
							className={isDisabled
								? "rounded-[10px] border border-[rgba(255,255,255,0.08)] px-3 py-2.5 opacity-70"
								: "rounded-[10px] border border-[rgba(255,255,255,0.08)] px-3 py-2.5"}
						>
							{companyName ?? "-"}
						</div>
					</div>

					{requiresCompanyType && !isDatacenter && (
						<RHFSelect<RenameCompanyFormValues, "company_type", string | null>
							name="company_type"
							label={t("companyProfile.companyType")}
							options={companyTypeOptions}
							selectProps={{ placeholder: t("companyProfile.companyTypePlaceholder"), disabled: isDisabled || saving || deleting }}
						/>
					)}

					<RHFProText
						name="name"
						label={t(`companyProfile.${kind}.nameLabel`)}
						inputProps={{ placeholder: t(`companyProfile.${kind}.nameLabel`), disabled: isDisabled || saving || deleting }}
					/>

					{needsAgent && (
						<RHFProText
							name="agent_name"
							label={t("companyProfile.agentName")}
							inputProps={{ placeholder: t("companyProfile.agentName"), disabled: isDisabled || saving || deleting }}
						/>
					)}

					<div className="flex justify-between mt-4">
						<div className="flex gap-3">
							<Button
								type="primary"
								loading={saving}
								disabled={isDisabled || deleting || !isChanged}
								onClick={methods.handleSubmit(v => submit(v))}
							>
								{t("companyProfile.applyChanges")}
							</Button>

							<Button
								danger
								loading={deleting}
								disabled={isDisabled || saving}
								onClick={confirmDelete}
							>
								{t(`companyProfile.${kind}.delete`)}
							</Button>
						</div>

						<Button onClick={onClose} disabled={saving || deleting}>
							{t("common.cancel")}
						</Button>
					</div>
				</FormProvider>
			</Form>
		</Modal>
	);
}
