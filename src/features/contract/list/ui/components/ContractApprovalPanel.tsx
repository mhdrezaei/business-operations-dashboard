import type {
	ContractApprovalField,
	ContractApprovalHistorySubjectDto,
	ContractApprovalPayload,
	ContractServicePath,
} from "../../../api/contracts.api";
import type { ContractApprovalDecision } from "../../model/contract-approval-payload";
import { toPersianDigits } from "#src/utils/formated";

import { DownOutlined, UpOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Card, Collapse, Input, Modal, Spin, Tooltip } from "antd";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { updateContractApproval } from "../../../api/contracts.api";
import { contractApprovalQuery } from "../../../shared/queries/contract.queries";
import { buildContractApprovalPayload } from "../../model/contract-approval-payload";
import { ContractApprovalPolicy } from "../../model/contract-approval-policy";
import { useContractApprovalHistoryStyles } from "./contract-approval-history.styles";
import { ContractApprovalHistory } from "./ContractApprovalHistory";
import { ContractApprovalStatusTag } from "./ContractApprovalStatusTag";

interface ContractApprovalPanelProps {
	contractId: number
	service: ContractServicePath
	/** Raw contract detail, used for `is_official` and `real_signed_at` (lock) state. */
	detail: Record<string, unknown> | null
	companyType?: string | null
	/** Shows the approve/reject actions; otherwise only statuses and history (old: hidden while editing). */
	canDecide?: boolean
}

interface PendingDecision extends ContractApprovalDecision {
	title: string
}

const FIELD_LABEL_KEYS: Record<ContractApprovalField, string> = {
	is_business_approved: "contract.list.column.isBusinessApproved",
	is_signed: "contract.list.column.isSigned",
};

const APPROVAL_FIELDS = Object.keys(FIELD_LABEL_KEYS) as ContractApprovalField[];

function collectRealSignedIds(addenda: unknown, ids = new Set<number>()) {
	if (!Array.isArray(addenda))
		return ids;
	for (const item of addenda) {
		const row = (item ?? {}) as Record<string, unknown>;
		if (row.real_signed_at)
			ids.add(Number(row.id));
		collectRealSignedIds(row.children, ids);
	}
	return ids;
}

export function ContractApprovalPanel({ contractId, service, detail, companyType, canDecide = false }: ContractApprovalPanelProps) {
	const { t } = useTranslation();
	const classes = useContractApprovalHistoryStyles();
	const queryClient = useQueryClient();
	const approvalQuery = contractApprovalQuery(service, contractId);
	const { data, isPending, isError } = useQuery(approvalQuery);
	const [decision, setDecision] = useState<PendingDecision | null>(null);
	const [comment, setComment] = useState("");
	// Accordion: only one subject (main contract or addendum) stays expanded at a time.
	const [openSubject, setOpenSubject] = useState<string | null>(null);

	const policy = useMemo(() => new ContractApprovalPolicy({
		service,
		companyType,
		isOfficial: typeof detail?.is_official === "boolean" ? detail.is_official : null,
	}), [service, companyType, detail]);
	// Rows of one logical addendum group share a display number; show each group once.
	const uniqueAddenda = useMemo(() => {
		const seen = new Set<string>();
		return (data?.addenda ?? []).filter((addendum) => {
			const key = String(addendum.display_addendum_number ?? addendum.id);
			if (seen.has(key))
				return false;
			seen.add(key);
			return true;
		});
	}, [data]);
	const realSignedAddendumIds = useMemo(() => collectRealSignedIds(detail?.addenda), [detail]);
	const isContractRealSigned = Boolean(detail?.real_signed_at);

	const mutation = useMutation({
		mutationFn: (payload: ContractApprovalPayload) => updateContractApproval(service, contractId, payload),
		onSuccess: (response) => {
			queryClient.setQueryData(approvalQuery.queryKey, response);
			// the preview page header reads the same status through its own queries
			for (const key of ["detail", "preview-status", "preview-approval-history"])
				queryClient.invalidateQueries({ queryKey: ["contracts", key, service, contractId] });
			window.$message?.success(t("contract.list.approval.saved"));
			closeDecision();
		},
	});

	function closeDecision() {
		setDecision(null);
		setComment("");
	}

	function renderSubject(subject: ContractApprovalHistorySubjectDto, title: string, addendumId: number | null) {
		const subjectKey = addendumId === null ? "main" : `addendum-${addendumId}`;
		const isRealSigned = addendumId === null ? isContractRealSigned : realSignedAddendumIds.has(addendumId);

		return (
			<Collapse
				key={subjectKey}
				className={classes.historyCollapse}
				size="small"
				expandIconPosition="end"
				expandIcon={({ isActive }) => isActive ? <DownOutlined /> : <UpOutlined />}
				activeKey={openSubject === subjectKey ? [subjectKey] : []}
				onChange={keys => setOpenSubject(keys.length > 0 ? subjectKey : null)}
				destroyInactivePanel
				items={[
					{
						key: subjectKey,
						label: (
							<div className={classes.collapseLabel}>
								<span className={classes.subjectLabel}>{title}</span>
								<div className="flex gap-1">
									{APPROVAL_FIELDS.map(field => <ContractApprovalStatusTag key={field} value={subject[field]} />)}
								</div>
							</div>
						),
						children: (
							<div className={classes.approvalSubject}>
								{APPROVAL_FIELDS.map(field => (
									<div key={field} className="flex flex-col gap-2">
										<div className="flex items-center justify-between gap-2">
											<span>{t(FIELD_LABEL_KEYS[field])}</span>
											<ContractApprovalStatusTag value={subject[field]} />
										</div>
										{canDecide
											? (
												<div className="flex gap-2">
													{[true, false].map((value) => {
														const state = policy.getActionState(subject, field, value, isRealSigned);
														return (
															<Tooltip key={String(value)} title={state.reason}>
																<Button
																	block
																	size="small"
																	danger={!value}
																	type={value ? "primary" : "default"}
																	disabled={state.disabled}
																	onClick={() => setDecision({ addendumId, field, value, title })}
																>
																	{value ? t("common.confirm") : t("contract.list.approval.reject")}
																</Button>
															</Tooltip>
														);
													})}
												</div>
											)
											: null}
									</div>
								))}
								<ContractApprovalHistory subject={subject} />
							</div>
						),
					},
				]}
			/>
		);
	}

	return (
		<Card className={classes.historyCard} size="small">
			<div className={classes.historyContent}>
				<div className={classes.historyTitle}>{t("contract.list.approval.title")}</div>
				<Spin spinning={isPending}>
					{isError
						? <Alert showIcon type="error" message={t("contract.list.approval.loadFailed")} />
						: data
							? (
								<div className={classes.historyList}>
									{policy.isUnofficialBlocked
										? <Alert showIcon type="info" message={t("contract.list.approval.unofficialBlocked")} />
										: null}
									{renderSubject(data, t("contract.list.approval.mainContract"), null)}
									{uniqueAddenda.map(addendum => renderSubject(
										addendum,
										t("contract.list.approval.addendumTitle", { number: toPersianDigits(String(addendum.display_addendum_number ?? addendum.id)) }),
										addendum.id,
									))}
								</div>
							)
							: <div className="min-h-24" />}
				</Spin>
			</div>
			<Modal
				open={decision !== null}
				title={decision ? `${decision.value ? t("common.confirm") : t("contract.list.approval.reject")} ${t(FIELD_LABEL_KEYS[decision.field])} - ${decision.title}` : undefined}
				okText={t("contract.list.approval.submit")}
				cancelText={t("common.cancel")}
				okButtonProps={{ danger: decision?.value === false }}
				confirmLoading={mutation.isPending}
				onOk={() => decision && mutation.mutate(buildContractApprovalPayload(decision, comment))}
				onCancel={closeDecision}
				destroyOnHidden
			>
				<Input.TextArea
					rows={3}
					maxLength={500}
					value={comment}
					placeholder={t("contract.list.approval.commentPlaceholder")}
					onChange={event => setComment(event.target.value)}
				/>
			</Modal>
		</Card>
	);
}
