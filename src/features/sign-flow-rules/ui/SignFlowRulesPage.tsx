import type { AdminRoleDto } from "#src/features/audit/admin-roles/model/admin-roles.types";
import type { AdminUserDto } from "#src/features/audit/admin-users/model/admin-users.types";
import type { SignFlowRule } from "../model/sign-flow-rules.types";
import { BasicContent } from "#src/components";
import { fetchAdminRolesList } from "#src/features/audit/admin-roles/api/admin-roles.api";
import { fetchAdminUsersList } from "#src/features/audit/admin-users/api/admin-users.api";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, Empty, Popconfirm, Space, Spin, Tag, Typography } from "antd";
import { useState } from "react";
import { deleteSignFlowRule, fetchSignFlowRules } from "../api/sign-flow-rules.api";
import { SignFlowRuleModal } from "./components/SignFlowRuleModal";

function recipientLabel(recipient: SignFlowRule["steps"][number]["recipients"][number]) {
	return recipient.target_type === "ROLE" ? recipient.role_name || `نقش #${recipient.role_id}` : recipient.username || `کاربر #${recipient.user_id}`;
}

export default function SignFlowRulesPage() {
	const [open, setOpen] = useState(false);
	const [selected, setSelected] = useState<SignFlowRule | null>(null);
	const rulesQuery = useQuery({
		queryKey: ["contracts", "sign-flow-rules"],
		queryFn: () => fetchSignFlowRules({ page: 1, page_size: 100 }),
		staleTime: 30 * 1000,
	});
	const usersQuery = useQuery({
		queryKey: ["audit", "users", "sign-flow-options"],
		queryFn: () => fetchAdminUsersList({ page: 1, page_size: 500 }),
		enabled: open,
		staleTime: 5 * 60 * 1000,
	});
	const rolesQuery = useQuery({
		queryKey: ["audit", "roles", "sign-flow-options"],
		queryFn: () => fetchAdminRolesList({ page: 1, page_size: 500 }),
		enabled: open,
		staleTime: 5 * 60 * 1000,
	});
	const rules = rulesQuery.data?.results ?? [];

	return (
		<BasicContent className="h-full !overflow-y-auto">
			<div className="mx-auto flex max-w-6xl flex-col gap-5 py-2" dir="rtl">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<Typography.Title level={3} className="!mb-0">قوانین گردش امضای قرارداد</Typography.Title>
					<Button
						type="primary"
						icon={<PlusOutlined />}
						onClick={() => {
							setSelected(null);
							setOpen(true);
						}}
					>
						افزودن قانون
					</Button>
				</div>
				{rulesQuery.isLoading
					? <div className="py-16 text-center"><Spin /></div>
					: rules.length === 0
						? <Empty description="قانونی ثبت نشده است." />
						: rules.map(rule => (
							<Card key={rule.id} size="small" className="shadow-sm">
								<div className="flex flex-wrap items-start justify-between gap-4">
									<div>
										<Space wrap>
											<Typography.Title level={5} className="!mb-0">{rule.name}</Typography.Title>
											<Tag color={rule.is_enabled ? "success" : "default"}>{rule.is_enabled ? "فعال" : "غیرفعال"}</Tag>
										</Space>
										{rule.description && <Typography.Paragraph type="secondary" className="!mb-2 !mt-2">{rule.description}</Typography.Paragraph>}
										<div className="flex flex-wrap gap-2">
											{rule.steps.map(step => (
												<Tag key={step.order}>
													مرحله
													{step.order}
													:
													{step.name}
													{" "}
													—
													{step.recipients.map(recipientLabel).join("، ")}
												</Tag>
											))}
										</div>
									</div>
									<Space>
										<Button
											icon={<EditOutlined />}
											onClick={() => {
												setSelected(rule);
												setOpen(true);
											}}
										>
											ویرایش
										</Button>
										<Popconfirm
											title="از حذف این قانون مطمئن هستید؟"
											okText="حذف"
											cancelText="انصراف"
											onConfirm={async () => {
												await deleteSignFlowRule(rule.id);
												window.$message?.success("قانون حذف شد.");
												void rulesQuery.refetch();
											}}
										>
											<Button danger icon={<DeleteOutlined />}>حذف</Button>
										</Popconfirm>
									</Space>
								</div>
							</Card>
						))}
			</div>
			<SignFlowRuleModal
				open={open}
				initial={selected}
				users={(usersQuery.data?.results ?? []) as AdminUserDto[]}
				roles={(rolesQuery.data?.results ?? []) as AdminRoleDto[]}
				loadingOptions={usersQuery.isLoading || rolesQuery.isLoading}
				onClose={() => setOpen(false)}
				onSaved={() => {
					setOpen(false);
					void rulesQuery.refetch();
				}}
			/>
		</BasicContent>
	);
}
