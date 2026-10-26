import type { TelecomFrameDirectoryEntryDto } from "#src/features/contract/api/telecom-frame.api";
import type { ContractFormValues } from "#src/features/contract/shared/model/contract.form.types";
import type { ReactNode } from "react";
import type { DirectoryOption } from "./telecom-frame.directory";
import { Form, Select, Tag } from "antd";
import { useController, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { entryLabel, toDirectoryOptions } from "./telecom-frame.directory";

interface DirectorySelectProps {
	label: string
	value: number | null
	options: DirectoryOption[]
	disabled?: boolean
	loading?: boolean
	onChange: (value: number) => void
}

export function DirectorySelect({ label, value, options, disabled, loading, onChange }: DirectorySelectProps) {
	return (
		<Form.Item label={label} className="mb-0">
			<Select
				showSearch
				optionFilterProp="label"
				value={value}
				options={options}
				disabled={disabled}
				loading={loading}
				onChange={onChange}
			/>
		</Form.Item>
	);
}

interface Props {
	name: "serviceFields.boPersonIds" | "serviceFields.poPersonIds"
	title: string
	/** همه اشخاص (برای نمایش نام شخص‌های انتخاب‌شده). */
	allPeople: TelecomFrameDirectoryEntryDto[] | undefined
	/** اشخاص قابل انتخاب در گروه فعلی. */
	people: TelecomFrameDirectoryEntryDto[] | undefined
	personDisabled: boolean
	personLoading?: boolean
	companyType: string | null | undefined
	/** انتخاب‌گرهای سلسله‌مراتب (معاونت، اداره کل، ...) که قبل از انتخاب شخص نمایش داده می‌شوند. */
	children: ReactNode
}

/** انتخاب چند شخص BO/PO؛ مقدار آرایه شناسه‌ها در فرم ذخیره می‌شود. */
export function TelecomFramePersonPicker({
	name,
	title,
	allPeople,
	people,
	personDisabled,
	personLoading,
	companyType,
	children,
}: Props) {
	const { t } = useTranslation();
	const { control } = useFormContext<ContractFormValues>();
	const { field } = useController({ control, name: name as any });
	const selectedIds: number[] = Array.isArray(field.value) ? field.value : [];
	const labelById = new Map((allPeople ?? []).map(person => [person.id, entryLabel(person)]));

	return (
		<div className="flex flex-col gap-3">
			<div className="text-sm font-medium">{title}</div>
			<div className="grid grid-cols-1 gap-3 md:grid-cols-[repeat(auto-fit,minmax(14rem,1fr))]">
				{children}
				<DirectorySelect
					label={t("contract.telecomFrame.person")}
					value={null}
					options={toDirectoryOptions(people, companyType, selectedIds)}
					disabled={personDisabled}
					loading={personLoading}
					onChange={id => field.onChange([...selectedIds, id])}
				/>
			</div>
			{selectedIds.length === 0
				? <div className="opacity-75">{t("contract.telecomFrame.noPersons")}</div>
				: (
					<div className="flex flex-wrap gap-2">
						{selectedIds.map(id => (
							<Tag key={id} closable onClose={() => field.onChange(selectedIds.filter(value => value !== id))}>
								{labelById.get(id) ?? `#${id}`}
							</Tag>
						))}
					</div>
				)}
		</div>
	);
}
