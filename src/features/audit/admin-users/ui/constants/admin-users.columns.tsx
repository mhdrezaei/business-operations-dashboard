import type { ProColumns } from "@ant-design/pro-components";
import type { TFunction } from "i18next";
import type { AdminUserDto } from "../../model/admin-users.types";

import { Tag, Tooltip } from "antd";

const ORDERING_OPTIONS: Array<{ label: string, value: string }> = [
	{ label: "شناسه (صعودی)", value: "id" },
	{ label: "شناسه (نزولی)", value: "-id" },
	{ label: "نام کاربری (صعودی)", value: "username" },
	{ label: "نام کاربری (نزولی)", value: "-username" },
	{ label: "ایمیل (صعودی)", value: "email" },
	{ label: "ایمیل (نزولی)", value: "-email" },
	{ label: "تاریخ عضویت (صعودی)", value: "date_joined" },
	{ label: "تاریخ عضویت (نزولی)", value: "-date_joined" },
	{ label: "آخرین ورود (صعودی)", value: "last_login" },
	{ label: "آخرین ورود (نزولی)", value: "-last_login" },
];

function parseRoleLabels(rolesField: unknown, roleNameById: Map<number, string>): string[] {
	if (rolesField == null) {
		return [];
	}

	if (Array.isArray(rolesField)) {
		return rolesField
			.map((roleItem) => {
				if (typeof roleItem === "number") {
					return roleNameById.get(roleItem) ?? String(roleItem);
				}

				if (typeof roleItem === "string") {
					const trimmed = roleItem.trim();
					if (!trimmed) {
						return null;
					}
					const roleId = Number(trimmed);
					if (Number.isFinite(roleId)) {
						return roleNameById.get(roleId) ?? trimmed;
					}
					return trimmed;
				}

				if (roleItem && typeof roleItem === "object") {
					const roleObject = roleItem as { id?: unknown, name?: unknown };

					if (typeof roleObject.name === "string" && roleObject.name.trim()) {
						return roleObject.name.trim();
					}

					const roleId = Number(roleObject.id);
					if (Number.isFinite(roleId)) {
						return roleNameById.get(roleId) ?? String(roleId);
					}
				}

				return null;
			})
			.filter((item): item is string => Boolean(item));
	}

	if (typeof rolesField === "string") {
		const normalized = rolesField.trim();
		if (!normalized) {
			return [];
		}

		if (normalized.startsWith("[") || normalized.startsWith("{")) {
			try {
				const parsed = JSON.parse(normalized);
				const parsedLabels: string[] = parseRoleLabels(parsed, roleNameById);
				if (parsedLabels.length) {
					return parsedLabels;
				}
			}
			catch {
				// ignore invalid JSON and continue with plain-text parsing
			}
		}

		return normalized
			.split(",")
			.map(part => part.trim())
			.filter(Boolean)
			.map((part) => {
				const roleId = Number(part);
				if (Number.isFinite(roleId)) {
					return roleNameById.get(roleId) ?? part;
				}
				return part;
			});
	}

	return [];
}

export function getAdminUsersColumns({
	t,
	roleNameById,
}: {
	t: TFunction<"translation", undefined>
	roleNameById: Map<number, string>
}): ProColumns<AdminUserDto>[] {
	return [
		{
			dataIndex: "index",
			title: t("common.index"),
			valueType: "indexBorder",
			width: 80,
		},
		{
			title: "شناسه",
			dataIndex: "id",
			width: 90,
			search: false,
			ellipsis: false,
			hideInTable: true,
		},
		{
			title: "نام کاربری",
			dataIndex: "username",
			ellipsis: true,
			width: 160,
		},
		{
			title: "نام",
			dataIndex: "first_name",
			ellipsis: true,
			width: 140,
			search: false,
		},
		{
			title: "نام خانوادگی",
			dataIndex: "last_name",
			ellipsis: true,
			width: 160,
			search: false,
		},
		{
			title: "ایمیل",
			dataIndex: "email",
			ellipsis: true,
			width: 220,
			search: false,
			render: (_, r) => r.email || "-",
		},
		{
			title: "موبایل",
			dataIndex: "mobile",
			ellipsis: true,
			width: 150,
			search: false,
			render: (_, r) => r.mobile || "-",
		},
		{
			title: "نقش‌ها",
			dataIndex: "roles",
			ellipsis: true,
			width: 220,
			search: false,
			render: (_, r) => {
				const roleLabels = parseRoleLabels(r.roles, roleNameById);
				const text = roleLabels.length ? roleLabels.join("، ") : "-";
				return (
					<Tooltip title={text}>
						<span>{text}</span>
					</Tooltip>
				);
			},
		},
		{
			title: "سطح ادمین",
			dataIndex: "admin_role",
			ellipsis: true,
			width: 150,
			search: false,
			render: (_, r) => {
				const isServiceAdmin = r.is_service_admin === true || r.admin_role === "service_admin";
				const isDeputyServiceAdmin = r.is_deputy_service_admin === true || r.admin_role === "deputy_service_admin";

				if (isServiceAdmin) {
					return <Tag color="green">ادمین سرویس</Tag>;
				}

				if (isDeputyServiceAdmin) {
					return <Tag color="cyan">معاون سرویس</Tag>;
				}

				return <Tag>کاربر عادی</Tag>;
			},
		},
		{
			title: "وضعیت",
			dataIndex: "is_active",
			width: 120,
			search: false,
			render: (_, r) => (
				<Tag>{r.is_active ? "فعال" : "غیرفعال"}</Tag>
			),
		},

		// search fields
		{
			title: "جستجو",
			dataIndex: "search",
			hideInTable: true,
			valueType: "text",
			fieldProps: { allowClear: true, placeholder: "جستجو بر اساس نام کاربری، نام، ایمیل، موبایل..." },
		},
		{
			title: "مرتب‌سازی",
			dataIndex: "ordering",
			hideInTable: true,
			valueType: "select",
			valueEnum: ORDERING_OPTIONS.reduce((acc, it) => {
				acc[it.value] = it.label;
				return acc;
			}, {} as Record<string, string>),
			fieldProps: { allowClear: true, placeholder: "مرتب‌سازی..." },
		},
	];
}
