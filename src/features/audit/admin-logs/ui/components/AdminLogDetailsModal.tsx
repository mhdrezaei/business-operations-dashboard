import type { AuditLogDto } from "../../model/admin-logs.types";

import { Descriptions, Modal, Tabs, Tag, Typography } from "antd";

import {
	formatAuditLogActor,
	formatAuditLogCreatedAt,
	formatAuditLogJson,
	getAuditLogMethodColor,
	getAuditLogStatusColor,
} from "../../model/admin-logs.utils";

interface Props {
	open: boolean
	log: AuditLogDto | null
	onClose: () => void
}

function JsonBlock({ value }: { value: string }) {
	return (
		<pre className="m-0 max-h-[420px] overflow-auto rounded bg-slate-950 p-4 text-left text-xs leading-6 text-slate-100" dir="ltr">
			{value}
		</pre>
	);
}

export function AdminLogDetailsModal({ open, log, onClose }: Props) {
	const bodyJson = formatAuditLogJson(log?.extra?.body);
	const queryParamsJson = formatAuditLogJson(log?.extra?.query_params);
	const changesJson = formatAuditLogJson(log?.changes);
	const extraJson = formatAuditLogJson(log?.extra ?? undefined);

	return (
		<Modal
			open={open}
			title="جزئیات لاگ"
			width={980}
			footer={null}
			onCancel={onClose}
			destroyOnClose
		>
			{log
				? (
					<div className="space-y-4">
						<Descriptions bordered size="small" column={{ xs: 1, md: 2 }}>
							<Descriptions.Item label="شناسه">{log.id}</Descriptions.Item>
							<Descriptions.Item label="زمان">{formatAuditLogCreatedAt(log.created_at)}</Descriptions.Item>
							<Descriptions.Item label="کاربر">{formatAuditLogActor(log)}</Descriptions.Item>
							<Descriptions.Item label="شناسه کاربر">{log.actor ?? "-"}</Descriptions.Item>
							<Descriptions.Item label="عملیات">
								<Tag>{log.action || "-"}</Tag>
							</Descriptions.Item>
							<Descriptions.Item label="متد">
								<Tag color={getAuditLogMethodColor(log.method)}>{log.method || "-"}</Tag>
							</Descriptions.Item>
							<Descriptions.Item label="وضعیت">
								<Tag color={getAuditLogStatusColor(log.status_code)}>{log.status_code ?? "-"}</Tag>
							</Descriptions.Item>
							<Descriptions.Item label="IP">{log.ip_address || "-"}</Descriptions.Item>
							<Descriptions.Item label="برنامه">{log.app_label || "-"}</Descriptions.Item>
							<Descriptions.Item label="مدل">{log.model_name || "-"}</Descriptions.Item>
							<Descriptions.Item label="شناسه آبجکت">{log.object_id ?? "-"}</Descriptions.Item>
							<Descriptions.Item label="مسیر" span={2}>
								<Typography.Text code copyable dir="ltr">
									{log.path || "-"}
								</Typography.Text>
							</Descriptions.Item>
							<Descriptions.Item label="User Agent" span={2}>
								<Typography.Text className="break-words" dir="ltr">
									{log.user_agent || "-"}
								</Typography.Text>
							</Descriptions.Item>
						</Descriptions>

						<Tabs
							items={[
								{
									key: "body",
									label: "Body",
									children: <JsonBlock value={bodyJson} />,
								},
								{
									key: "query",
									label: "Query Params",
									children: <JsonBlock value={queryParamsJson} />,
								},
								{
									key: "changes",
									label: "Changes",
									children: <JsonBlock value={changesJson} />,
								},
								{
									key: "extra",
									label: "Extra",
									children: <JsonBlock value={extraJson} />,
								},
							]}
						/>
					</div>
				)
				: null}
		</Modal>
	);
}
