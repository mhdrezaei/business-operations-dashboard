import type { AdminRoleDto, AdminUserDto } from "../../model/admin-users.types";

import { BasicButton } from "#src/components";
import { Modal, Select } from "antd";

import React, { useEffect, useMemo, useState } from "react";

interface Props {
	open: boolean
	user: AdminUserDto | null
	roles: AdminRoleDto[]
	loading?: boolean
	onClose: () => void
	onSubmit: (roleIds: number[]) => Promise<void> | void
}

function parseRoleIdsFromUserRoles(rolesField: any): number[] {
	// چون API گفته roles: "string" => اینجا محافظه‌کاریم.
	// اگر بعداً API آرایه داد، این تابع را اصلاح کن.
	if (Array.isArray(rolesField)) {
		return rolesField
			.map(x => (typeof x === "number" ? x : Number(x?.id)))
			.filter(x => Number.isFinite(x));
	}
	return [];
}

export function AdminUserRolesModal({ open, user, roles, loading, onClose, onSubmit }: Props) {
	const [saving, setSaving] = useState(false);

	const initialSelected = useMemo(
		() => (user ? parseRoleIdsFromUserRoles(user.roles) : []),
		[user?.id],
	);

	const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>(initialSelected);

	useEffect(() => {
		if (!open)
			return;
		setSelectedRoleIds(initialSelected);
	}, [open, initialSelected.join(",")]);

	const options = useMemo(
		() => roles.map(r => ({ label: r.name, value: r.id })),
		[roles],
	);

	return (
		<Modal
			open={open}
			onCancel={onClose}
			title="تغییر نقش‌های کاربر"
			footer={null}
			width={560}
			destroyOnClose
		>
			{loading || !user
				? null
				: (
					<div className="space-y-3">
						<div className="text-sm opacity-80">
							کاربر:
							{" "}
							<b>{user.username}</b>
						</div>

						<Select
							mode="multiple"
							allowClear
							style={{ width: "100%" }}
							placeholder="نقش‌ها را انتخاب کنید"
							options={options}
							value={selectedRoleIds}
							onChange={v => setSelectedRoleIds((v ?? []) as number[])}
						/>

						<div className="flex justify-end gap-2">
							<BasicButton onClick={onClose}>انصراف</BasicButton>
							<BasicButton
								type="primary"
								loading={saving}
								onClick={async () => {
									setSaving(true);
									try {
										await onSubmit(selectedRoleIds);
										onClose();
									}
									finally {
										setSaving(false);
									}
								}}
							>
								ذخیره
							</BasicButton>
						</div>
					</div>
				)}
		</Modal>
	);
}
