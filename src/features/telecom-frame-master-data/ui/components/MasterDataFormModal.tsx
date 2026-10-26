import type { TelecomFrameDirectoryEntryDto } from "#src/features/contract/api/telecom-frame.api";
import type { MasterDataFormValues } from "../../model/telecom-frame-master-data.schema";
import { RHFProCheckbox, RHFProText, RHFSelect } from "#src/shared/ui/rhf-pro";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Modal } from "antd";
import { useEffect, useMemo } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { masterDataFormSchema } from "../../model/telecom-frame-master-data.schema";

interface MasterDataFormModalProps {
	title: string
	isPerson: boolean
	record: TelecomFrameDirectoryEntryDto | null
	/** Company types the record may allow (the parent's types, or the user's permitted ones for the top level). */
	companyTypeOptions: Array<{ label: string, value: string }>
	saving: boolean
	onSubmit: (values: MasterDataFormValues) => void
	onClose: () => void
}

export function MasterDataFormModal({ title, isPerson, record, companyTypeOptions, saving, onSubmit, onClose }: MasterDataFormModalProps) {
	const { t } = useTranslation();
	const schema = useMemo(() => masterDataFormSchema(t), [t]);
	const form = useForm<MasterDataFormValues>({
		resolver: zodResolver(schema),
		defaultValues: { name: "", title: "", company_types: [], is_active: true },
	});

	useEffect(() => {
		form.reset({
			name: record?.name ?? record?.full_name ?? "",
			title: record?.title ?? "",
			company_types: record?.company_types ?? [],
			is_active: record?.is_active ?? true,
		});
	}, [record, form]);

	return (
		<Modal open title={title} footer={null} onCancel={onClose} destroyOnHidden>
			<FormProvider {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-2">
					<RHFProText name="name" label={isPerson ? t("telecomFrameMasterData.fullName") : t("telecomFrameMasterData.name")} />
					{isPerson && <RHFProText name="title" label={t("telecomFrameMasterData.personTitle")} />}
					<RHFSelect
						name="company_types"
						label={t("telecomFrameMasterData.companyTypes")}
						options={companyTypeOptions}
						selectProps={{ mode: "multiple", allowClear: true, placeholder: t("telecomFrameMasterData.noCompanyTypes") }}
					/>
					<RHFProCheckbox name="is_active" checkboxLabel={t("telecomFrameMasterData.active")} />
					<div className="flex justify-end gap-2">
						<Button onClick={onClose}>{t("common.cancel")}</Button>
						<Button type="primary" htmlType="submit" loading={saving}>{t("telecomFrameMasterData.save")}</Button>
					</div>
				</form>
			</FormProvider>
		</Modal>
	);
}
