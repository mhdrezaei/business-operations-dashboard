import { Scrollbar } from "#src/components";
import { fetchSignFlowDetail, fetchSignFlowHistory } from "#src/features/contract/api/contracts.api";
import { dayjs } from "#src/shared/lib/dayjs-jalali";
import { ArrowRightOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, EyeOutlined, FilePdfOutlined, StopOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";

import { Button, Card, Col, Descriptions, Divider, Empty, Row, Space, Spin, Steps, Tag, Typography } from "antd";
import React, { useEffect, useState } from "react";
import { SIGN_FLOW_STATE_MAP } from "../constants";

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
	const [activeId, setActiveId] = useState<number | null>(id);

	useEffect(() => {
		setActiveId(id);
	}, [id]);

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
			description: status === "process" ? "در حال بررسی" : (status === "finish" ? "انجام شد" : "در انتظار نوبت"),
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
						</Descriptions>
						<div className="mt-4 flex justify-end gap-2">
							<Button
								type="primary"
								icon={<FilePdfOutlined />}
								onClick={() => window.open(`/api/v1/contracts/sign-flows/${detail.id}/official-pdf/`, "_blank")}
							>
								مشاهده PDF رسمی
							</Button>
							{detail.state === "in_progress" && (
								<Button danger type="default" icon={<StopOutlined />}>
									لغو گردش امضا
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
												{step.state === "active" ? "در حال بررسی" : step.state === "pending" ? "در انتظار نوبت" : step.state}
											</div>
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
																onClick={() => setActiveId(h.id)}
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
																<Text type="secondary">تاریخ لغو: </Text>
																{formatDate(h.revoked_at)}
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
		</div>
	);
}
