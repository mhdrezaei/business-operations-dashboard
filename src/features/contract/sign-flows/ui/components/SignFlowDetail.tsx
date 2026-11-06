import { Scrollbar } from "#src/components";
import { cancelSignFlow, decideSignFlow, fetchSignFlowDetail, fetchSignFlowHistory, fetchSignFlowOfficialPdf, revokeSignFlow } from "#src/features/contract/api/contracts.api";
import { useAccess } from "#src/hooks";
import { dayjs } from "#src/shared/lib/dayjs-jalali";
import { useUserStore } from "#src/store";
import { isServerErrorHandled } from "#src/utils/request/error-response";
import { ArrowRightOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, EyeOutlined, FilePdfOutlined, RollbackOutlined, StopOutlined } from "@ant-design/icons";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Col, Descriptions, Divider, Empty, Input, message, Modal, Row, Space, Spin, Steps, Tag, Typography } from "antd";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { SIGN_FLOW_STATE_MAP, SIGN_FLOW_STEP_STATE_KEYS } from "../constants";

const { Title, Text } = Typography;

function formatDate(dateString?: string | null) {
	if (!dateString)
		return "-";
	return dayjs(dateString).format("YYYY/MM/DD HH:mm");
}

export interface SignFlowDetailProps {
	id: number | null
	onBack?: () => void
}

export function SignFlowDetail({ id, onBack }: SignFlowDetailProps) {
	const { t } = useTranslation();
	const user = useUserStore();
	const { isFullAdmin } = useAccess();
	const queryClient = useQueryClient();
	const [historyId, setHistoryId] = useState<number | null>(null);
	const [prevPropId, setPrevPropId] = useState(id);
	const [isPdfLoading, setIsPdfLoading] = useState(false);
	// cancel (in-progress flow) and revoke (approved flow) share one reason dialog
	const [reasonModalKind, setReasonModalKind] = useState<"cancel" | "revoke" | null>(null);
	const [reasonText, setReasonText] = useState("");
	const [isSubmittingReason, setIsSubmittingReason] = useState(false);
	const [decisionModal, setDecisionModal] = useState<{
		open: boolean
		action: "approve" | "reject"
	}>({
		open: false,
		action: "approve",
	});
	const [decisionComment, setDecisionComment] = useState("");
	const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);

	if (id !== prevPropId) {
		setPrevPropId(id);
		setHistoryId(null);
	}

	const activeId = historyId ?? id;

	const { data: detail, isLoading: isLoadingDetail } = useQuery({
		queryKey: ["signFlowDetail", activeId],
		queryFn: () => fetchSignFlowDetail(activeId as unknown as string),
		enabled: !!activeId,
	});

	const { data: history, isLoading: isLoadingHistory } = useQuery({
		queryKey: ["signFlowHistory", detail?.contract_id],
		queryFn: () => fetchSignFlowHistory(detail?.contract_id as number),
		enabled: !!detail?.contract_id,
	});

	const handleViewOfficialPdf = async () => {
		if (!detail?.id)
			return;

		const newTab = window.open("about:blank", "_blank");
		try {
			setIsPdfLoading(true);
			const response = await fetchSignFlowOfficialPdf(detail.id);
			const contentType = response.headers.get("content-type") || "";

			if (contentType.includes("application/json")) {
				const data = await response.json<any>();
				const targetUrl = data?.url || data?.pdf_url || data?.file;
				if (targetUrl) {
					if (newTab) {
						newTab.location.href = targetUrl;
					}
					else {
						window.open(targetUrl, "_blank");
					}
					return;
				}
			}

			const blob = await response.blob();
			const file = new Blob([blob], { type: "application/pdf" });
			const fileUrl = window.URL.createObjectURL(file);
			if (newTab) {
				newTab.location.href = fileUrl;
			}
			else {
				window.open(fileUrl, "_blank");
			}
		}
		catch (err) {
			console.error("Error fetching official PDF:", err);
			if (newTab) {
				newTab.close();
			}
			message.error("خطا در دریافت یا باز کردن PDF رسمی");
		}
		finally {
			setIsPdfLoading(false);
		}
	};

	const isCreator = Boolean(
		detail
		&& (
			(detail.created_by != null && Number(user.id) === Number(detail.created_by))
			|| (Boolean(detail.created_by_username) && user.username === detail.created_by_username)
		),
	);

	const canCancel = (isFullAdmin || isCreator) && detail?.state === "in_progress";
	// backend: only superuser/staff may revoke, and only an approved flow
	const canRevoke = isFullAdmin && detail?.state === "approved";

	const currentActiveStep = detail?.steps.find(s => s.order === detail?.current_step_order);
	const isStepApprover = Boolean(
		detail?.is_waiting_for_me
		|| currentActiveStep?.recipients?.some(r => Number(r.user_id) === Number(user.id) || r.username === user.username)
		|| currentActiveStep?.assignments?.some(a => Number(a.user_id) === Number(user.id) || a.username === user.username),
	);

	const canDecide = detail?.state === "in_progress" && isStepApprover;

	const handleDecisionSubmit = async () => {
		if (!detail?.id)
			return;

		const trimmedComment = decisionComment.trim();
		if (decisionModal.action === "reject" && !trimmedComment)
			return;

		try {
			setIsSubmittingDecision(true);
			await decideSignFlow(detail.id, {
				action: decisionModal.action,
				comment: trimmedComment || undefined,
			});
			message.success(
				decisionModal.action === "approve"
					? "مرحله با موفقیت تایید شد"
					: "گردش امضا با موفقیت رد شد",
			);
			setDecisionModal(prev => ({ ...prev, open: false }));
			setDecisionComment("");
			await queryClient.invalidateQueries({ queryKey: ["signFlowDetail", activeId] });
			if (detail.contract_id) {
				await queryClient.invalidateQueries({ queryKey: ["signFlowHistory", detail.contract_id] });
			}
		}
		catch (err: any) {
			console.error("Error submitting decision:", err);
			if (!isServerErrorHandled(err)) {
				message.error(
					decisionModal.action === "approve"
						? "خطا در تایید مرحله"
						: "خطا در رد مرحله",
				);
			}
		}
		finally {
			setIsSubmittingDecision(false);
		}
	};

	const closeReasonModal = () => {
		setReasonModalKind(null);
		setReasonText("");
	};

	const handleReasonSubmit = async () => {
		if (!detail?.id || !reasonModalKind)
			return;

		const trimmedReason = reasonText.trim();
		if (!trimmedReason) {
			message.warning(t(`contract.signFlow.${reasonModalKind}.required`));
			return;
		}

		try {
			setIsSubmittingReason(true);
			await (reasonModalKind === "cancel" ? cancelSignFlow : revokeSignFlow)(detail.id, trimmedReason);
			message.success(t(`contract.signFlow.${reasonModalKind}.success`));
			closeReasonModal();
			await queryClient.invalidateQueries({ queryKey: ["signFlowDetail", activeId] });
			if (detail.contract_id) {
				await queryClient.invalidateQueries({ queryKey: ["signFlowHistory", detail.contract_id] });
			}
		}
		catch (err: any) {
			console.error(`Error submitting sign flow ${reasonModalKind}:`, err);
			if (!isServerErrorHandled(err))
				message.error(t(`contract.signFlow.${reasonModalKind}.failed`));
		}
		finally {
			setIsSubmittingReason(false);
		}
	};

	if (isLoadingDetail) {
		return (
			<div className="flex justify-center items-center py-20">
				<Spin size="large" />
			</div>
		);
	}

	if (!detail) {
		return (
			<div className="py-20 text-center">
				<Empty description="اطلاعات گردش امضا یافت نشد" />
				{onBack && (
					<div className="mt-4">
						<Button onClick={onBack}>بازگشت</Button>
					</div>
				)}
			</div>
		);
	}

	const stateInfo = SIGN_FLOW_STATE_MAP[detail.state] || { label: detail.state, color: "default" };

	// Steps mapping
	const stepsItems = detail.steps.map((step) => {
		let status: "wait" | "process" | "finish" | "error" = "wait";
		if (step.state === "active")
			status = "process";
		if (step.state === "approved")
			status = "finish";
		if (step.state === "rejected")
			status = "error";

		// Map icon based on status
		let icon;
		if (status === "finish")
			icon = <CheckCircleOutlined />;
		if (status === "error")
			icon = <CloseCircleOutlined />;
		if (status === "process")
			icon = <ClockCircleOutlined />;

		return {
			title: step.name,
			description: t(SIGN_FLOW_STEP_STATE_KEYS[step.state] ?? SIGN_FLOW_STEP_STATE_KEYS.pending),
			status,
			icon,
		};
	});

	return (
		<div className="flex flex-col gap-4">
			{onBack && (
				<div className="flex items-center justify-between">
					<Button icon={<ArrowRightOutlined />} onClick={onBack}>
						بازگشت به لیست گردش‌های امضا
					</Button>
				</div>
			)}
			<Row gutter={[24, 24]} style={{ alignItems: "stretch" }}>
				{/* Right Main Content */}
				<Col xs={24} lg={16}>
					<Card
						title={(
							<Title level={4} style={{ margin: 0 }}>
								گردش امضا #
								{detail.id}
							</Title>
						)}
						extra={<Tag color={stateInfo.color}>{stateInfo.label}</Tag>}
						className="mb-6"
					>
						<Descriptions column={{ xs: 1, sm: 2, md: 2 }} layout="vertical" bordered>
							<Descriptions.Item label="شماره قرارداد">
								{detail.contract_number || "-"}
							</Descriptions.Item>
							<Descriptions.Item label="نام شرکت">
								{detail.company_name || "-"}
							</Descriptions.Item>
							<Descriptions.Item label="نام سرویس">
								{detail.service_name || "-"}
							</Descriptions.Item>
							<Descriptions.Item label="بازه قرارداد">
								{detail.contract_start_date ? `از ${detail.contract_start_date}` : ""}
								{" "}
								{detail.contract_end_date ? `تا ${detail.contract_end_date}` : ""}
							</Descriptions.Item>
							<Descriptions.Item label="شروع‌کننده">
								{detail.created_by_username || "-"}
							</Descriptions.Item>
							<Descriptions.Item label="تاریخ شروع گردش امضا">
								{formatDate(detail.started_at)}
							</Descriptions.Item>
							{detail.finished_at && (
								<Descriptions.Item label="تاریخ پایان گردش امضا">
									{formatDate(detail.finished_at)}
								</Descriptions.Item>
							)}
						</Descriptions>
						{detail.cancel_reason && (
							<div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4 text-sm font-medium text-slate-700 dark:text-slate-300">
								<span className="font-bold">دلیل لغو: </span>
								{detail.cancel_reason}
							</div>
						)}
						{detail.revoke_reason && (
							<div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4 text-sm font-medium text-slate-700 dark:text-slate-300">
								<span className="font-bold">
									{t("contract.signFlow.history.revokeReason")}
									:
									{" "}
								</span>
								{detail.revoke_reason}
								{detail.revoked_by_username && ` (${detail.revoked_by_username})`}
							</div>
						)}
						<div className="mt-4 flex justify-end gap-2">
							<Button
								type="primary"
								icon={<FilePdfOutlined />}
								loading={isPdfLoading}
								onClick={handleViewOfficialPdf}
							>
								مشاهده PDF رسمی
							</Button>
							{canDecide && (
								<>
									<Button
										type="primary"
										className="!bg-emerald-600 hover:!bg-emerald-500"
										icon={<CheckCircleOutlined />}
										onClick={() => {
											setDecisionComment("بررسی و تایید شد");
											setDecisionModal({ open: true, action: "approve" });
										}}
									>
										تایید
									</Button>
									<Button
										danger
										type="primary"
										icon={<CloseCircleOutlined />}
										onClick={() => {
											setDecisionComment("");
											setDecisionModal({ open: true, action: "reject" });
										}}
									>
										رد
									</Button>
								</>
							)}
							{canCancel && (
								<Button
									danger
									type="default"
									icon={<StopOutlined />}
									onClick={() => setReasonModalKind("cancel")}
								>
									{t("contract.signFlow.cancel.action")}
								</Button>
							)}
							{canRevoke && (
								<Button
									danger
									type="default"
									icon={<RollbackOutlined />}
									onClick={() => setReasonModalKind("revoke")}
								>
									{t("contract.signFlow.revoke.action")}
								</Button>
							)}
						</div>
					</Card>

					<Card title={<Title level={4} style={{ margin: 0 }}>مراحل تایید</Title>}>
						<div className="mb-8">
							<Steps
								current={detail.current_step_order - 1}
								items={stepsItems}
								labelPlacement="vertical"
							/>
						</div>

						<Divider />

						<Space direction="vertical" size="large" className="w-full">
							{detail.steps.map(step => (
								<Card key={step.order} size="small" className="bg-slate-50 dark:bg-slate-800">
									<div className="flex justify-between items-center">
										<div>
											<Text strong className="text-lg">
												مرحله
												{step.order}
												{" "}
												—
												{step.name}
											</Text>
											<div className="mt-2 text-gray-500">
												{t(SIGN_FLOW_STEP_STATE_KEYS[step.state] ?? SIGN_FLOW_STEP_STATE_KEYS.pending)}
											</div>
											{step.decision && (
												<div className="mt-2 text-sm">
													<div>
														{t(`contract.signFlow.decision.${step.decision.action}`)}
														{step.decision.decided_by_username && ` — ${t("contract.signFlow.decision.by", { user: step.decision.decided_by_username })}`}
														{step.decision.decided_at && ` — ${formatDate(step.decision.decided_at)}`}
													</div>
													{step.decision.comment && (
														<div className="text-gray-500">
															{t("contract.signFlow.decision.comment")}
															:
															{" "}
															{step.decision.comment}
														</div>
													)}
												</div>
											)}
										</div>
										<div className="text-right">
											{step.recipients.map(r => (
												<div key={r.user_id} className="flex items-center gap-2">
													<Text>{r.username}</Text>
												</div>
											))}
										</div>
									</div>
								</Card>
							))}
						</Space>
					</Card>
				</Col>

				{/* Left Sidebar History */}
				<Col xs={24} lg={8}>
					<Card title={<Title level={4} style={{ margin: 0 }}>تاریخچه گردش‌های قبلی</Title>} style={{ height: "100%", display: "flex", flexDirection: "column" }} bodyStyle={{ flex: 1, overflow: "hidden", padding: 0 }} styles={{ body: { flex: 1, overflow: "hidden", padding: 0 } }}>
						<Scrollbar className="h-full p-6" style={{ maxHeight: "calc(100vh - 200px)" }}>
							{(() => {
								if (isLoadingHistory) {
									return <div className="flex justify-center p-4"><Spin /></div>;
								}
								if (!history || history.length === 0) {
									return <Empty description="تاریخچه‌ای وجود ندارد" />;
								}
								return (
									<Space direction="vertical" size="middle" className="w-full">
										{history.map((h) => {
											const hState = SIGN_FLOW_STATE_MAP[h.state] || { label: h.state, color: "default" };
											return (
												<Card key={h.id} size="small" hoverable>
													<div className="flex justify-between items-start mb-2">
														<Space>
															<Button
																type="text"
																icon={<EyeOutlined />}
																onClick={() => setHistoryId(h.id)}
															/>
															<Text strong className="text-lg">
																گردش امضا #
																{h.id}
															</Text>
														</Space>
														<Tag color={hState.color}>{hState.label}</Tag>
													</div>
													<div className="text-gray-500 space-y-1">
														<div>
															<Text type="secondary">شروع: </Text>
															{formatDate(h.started_at)}
														</div>
														{h.finished_at && (
															<div>
																<Text type="secondary">پایان: </Text>
																{formatDate(h.finished_at)}
															</div>
														)}
														{h.revoked_at && (
															<div>
																<Text type="secondary">
																	{t("contract.signFlow.history.revokedAt")}
																	:
																	{" "}
																</Text>
																{formatDate(h.revoked_at)}
															</div>
														)}
														{h.revoked_by_username && (
															<div>
																<Text type="secondary">
																	{t("contract.signFlow.history.revokedBy")}
																	:
																	{" "}
																</Text>
																{h.revoked_by_username}
															</div>
														)}
														{h.revoke_reason && (
															<div className="mt-2 text-red-400">
																{t("contract.signFlow.history.revokeReason")}
																:
																{" "}
																{h.revoke_reason}
															</div>
														)}
														{h.cancel_or_reject_reason && <div className="mt-2 text-red-400">{h.cancel_or_reject_reason}</div>}
													</div>
												</Card>
											);
										})}
									</Space>
								);
							})()}
						</Scrollbar>
					</Card>
				</Col>
			</Row>

			<Modal
				open={reasonModalKind !== null}
				onCancel={() => {
					if (!isSubmittingReason)
						closeReasonModal();
				}}
				footer={null}
				centered
				width={480}
				destroyOnHidden
			>
				{reasonModalKind && (
					<div className="py-2" dir="rtl">
						<Title level={4} className="!mb-2 text-center">
							{t(`contract.signFlow.${reasonModalKind}.title`)}
						</Title>
						<div className="mb-4 text-center text-sm text-gray-500 dark:text-gray-400">
							{t(`contract.signFlow.${reasonModalKind}.label`)}
						</div>
						<Input.TextArea
							rows={5}
							value={reasonText}
							onChange={e => setReasonText(e.target.value)}
							placeholder={t(`contract.signFlow.${reasonModalKind}.placeholder`)}
							className="mb-6 rounded-lg"
							disabled={isSubmittingReason}
						/>
						<div className="flex items-center justify-center gap-3">
							<Button
								type="primary"
								size="large"
								className="min-w-28 rounded-lg"
								loading={isSubmittingReason}
								onClick={handleReasonSubmit}
							>
								{t(`contract.signFlow.${reasonModalKind}.confirm`)}
							</Button>
							<Button
								size="large"
								className="min-w-28 rounded-lg"
								disabled={isSubmittingReason}
								onClick={closeReasonModal}
							>
								{t("common.cancel")}
							</Button>
						</div>
					</div>
				)}
			</Modal>

			<Modal
				open={decisionModal.open}
				onCancel={() => {
					if (!isSubmittingDecision) {
						setDecisionModal(prev => ({ ...prev, open: false }));
						setDecisionComment("");
					}
				}}
				footer={null}
				centered
				width={480}
				destroyOnHidden
			>
				<div className="py-2" dir="rtl">
					<Title level={4} className="!mb-2 text-center">
						{decisionModal.action === "approve" ? "تایید مرحله گردش امضا" : "رد مرحله گردش امضا"}
					</Title>
					<div className="mb-4 text-center text-sm text-gray-500 dark:text-gray-400">
						{decisionModal.action === "approve" ? "توضیحات تایید (اختیاری)" : "دلیل رد (اجباری)"}
					</div>
					<Input.TextArea
						rows={5}
						value={decisionComment}
						onChange={e => setDecisionComment(e.target.value)}
						placeholder={decisionModal.action === "approve" ? "توضیحات تایید را وارد کنید..." : "دلیل رد را وارد کنید..."}
						className="mb-6 rounded-lg"
						disabled={isSubmittingDecision}
					/>
					<div className="flex items-center justify-center gap-3">
						<Button
							type="primary"
							size="large"
							className={decisionModal.action === "approve" ? "min-w-28 rounded-lg !bg-emerald-600 hover:!bg-emerald-500" : "min-w-28 rounded-lg"}
							danger={decisionModal.action === "reject"}
							loading={isSubmittingDecision}
							disabled={decisionModal.action === "reject" && !decisionComment.trim()}
							onClick={handleDecisionSubmit}
						>
							{decisionModal.action === "approve" ? "تایید کن" : "رد کن"}
						</Button>
						<Button
							size="large"
							className="min-w-28 rounded-lg"
							disabled={isSubmittingDecision}
							onClick={() => {
								setDecisionModal(prev => ({ ...prev, open: false }));
								setDecisionComment("");
							}}
						>
							انصراف
						</Button>
					</div>
				</div>
			</Modal>
		</div>
	);
}
