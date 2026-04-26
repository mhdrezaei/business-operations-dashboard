import type { AdminRoleFormValues } from "../../model/admin-roles.schema";
import type {
	AdminRoleDto,
	AdminRolePoliciesBulkUpsertPayload,
	AdminRolePolicyDto,
	AdminRoleUpsertPayload,
} from "../../model/admin-roles.types";

import { useQuery } from "@tanstack/react-query";
import { Modal } from "antd";
import React, { useMemo, useState } from "react";

import { adminRolePoliciesQuery } from "../../queries/admin-roles.queries";
import { AdminRoleForm } from "./AdminRoleForm";

interface Props {
	open: boolean
	mode: "create" | "edit"
	initial?: AdminRoleDto | null
	onClose: () => void
	onSubmit: (values: {
		role: AdminRoleUpsertPayload
		policies: AdminRolePoliciesBulkUpsertPayload
	}) => Promise<void> | void
}

function buildDefaultValues(initial?: AdminRoleDto | null): AdminRoleFormValues {
	if (!initial) {
		return {
			name: "",
			description: "",
		};
	}

	return {
		name: initial.name ?? "",
		description: initial.description ?? "",
	};
}

export function AdminRoleUpsertModal({ open, mode, initial, onClose, onSubmit }: Props) {
	const [saving, setSaving] = useState(false);
	const policiesQuery = useQuery(
		adminRolePoliciesQuery(initial?.id, open && mode === "edit" && !!initial),
	);

	const title = mode === "create" ? "ایجاد نقش" : "ویرایش نقش";
	const submitText = mode === "create" ? "ثبت نقش" : "اعمال تغییرات";
	const defaultValues = useMemo(() => buildDefaultValues(initial), [initial]);
	const initialPolicies = useMemo<AdminRolePolicyDto[]>(
		() => policiesQuery.data?.results ?? [],
		[policiesQuery.data],
	);

	async function handleSubmit(values: {
		role: AdminRoleUpsertPayload
		policies: AdminRolePoliciesBulkUpsertPayload
	}) {
		setSaving(true);
		try {
			await onSubmit(values);
			onClose();
		}
		finally {
			setSaving(false);
		}
	}

	return (
		<Modal
			open={open}
			onCancel={onClose}
			title={title}
			footer={null}
			width={1180}
			destroyOnClose
		>
			<AdminRoleForm
				defaultValues={defaultValues}
				initialRole={initial}
				initialPolicies={initialPolicies}
				initialPoliciesLoading={mode === "edit" ? policiesQuery.isLoading : false}
				submitText={submitText}
				submitting={saving}
				onClose={onClose}
				onSubmit={handleSubmit}
			/>
		</Modal>
	);
}
