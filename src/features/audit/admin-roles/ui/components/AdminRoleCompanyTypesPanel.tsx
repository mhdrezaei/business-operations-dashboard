import type { CompanyTypeOption } from "#src/api/user/types";

import { cn } from "#src/utils/cn";
import { Button, Checkbox, Typography } from "antd";
import React from "react";
import { useTranslation } from "react-i18next";

interface Props {
	options: CompanyTypeOption[]
	selected: string[]
	/** Whether any CRUD action is enabled: then at least one company type is mandatory (backend rule). */
	isRequired: boolean
	onChange: (nextKeys: string[]) => void
}

/** Company types a role may work with on a company-type scoped service (traffic, sms, psp, ...). */
export function AdminRoleCompanyTypesPanel({ options, selected, isRequired, onChange }: Props) {
	const { t } = useTranslation();

	function toggle(key: string) {
		onChange(selected.includes(key) ? selected.filter(item => item !== key) : [...selected, key]);
	}

	return (
		<section className="mt-4 rounded-2xl border border-[var(--ant-color-border-secondary)] p-4">
			<header className="mb-3 flex flex-wrap items-center justify-between gap-2">
				<div>
					<Typography.Text strong>{t("system.role.permissions.companyTypes")}</Typography.Text>
					<Typography.Text type="secondary" className="ms-2">
						{t("system.role.permissions.selectedCount", { count: selected.length, total: options.length })}
					</Typography.Text>
				</div>
				<div className="flex gap-2">
					<Button size="small" className={cn("!border-emerald-600 !text-emerald-600")} disabled={options.length === 0} onClick={() => onChange(options.map(option => option.key))}>
						{t("system.role.permissions.selectAll")}
					</Button>
					<Button size="small" danger disabled={options.length === 0} onClick={() => onChange([])}>
						{t("system.role.permissions.clearAll")}
					</Button>
				</div>
			</header>

			{options.length === 0
				? <Typography.Text type="warning">{t("system.role.permissions.noGrantableTypes")}</Typography.Text>
				: (
					<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
						{options.map(option => (
							<label key={option.key} className="flex cursor-pointer items-center justify-between rounded-xl border border-[var(--ant-color-border-secondary)] px-3 py-2">
								<span className="text-xs font-medium">{option.value}</span>
								<Checkbox checked={selected.includes(option.key)} onChange={() => toggle(option.key)} aria-label={option.value} />
							</label>
						))}
					</div>
				)}

			{isRequired && options.length > 0 && selected.length === 0
				? <Typography.Text type="danger" className="mt-3 block text-xs">{t("system.role.permissions.typesRequired")}</Typography.Text>
				: null}
		</section>
	);
}
