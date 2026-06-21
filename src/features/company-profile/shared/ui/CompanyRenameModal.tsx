import type { Resolver } from "react-hook-form";

import { RHFProText } from "#src/shared/ui/rhf-pro";
import { request } from "#src/utils/request/";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Form, Modal } from "antd";
import React, { useMemo, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";

import { z } from "zod";

interface Props {
	open: boolean
	disabled?: boolean
	serviceId: number
	companyType: string | null
	requiresCompanyType: boolean
	companyId: number | null
	companyName: string | null
	onClose: () => void
	onRenamed: (newName: string) => void
	onDeleted: () => void
}

interface RenameCompanyFormValues {
	name: string
}

const renameCompanySchema = z.object({
	name: z.string().trim().min(2, "نام شرکت الزامی است"),
}) as unknown as z.ZodType<RenameCompanyFormValues>;

export default function CompanyRenameModal({
	open,
	disabled,
	serviceId,
	companyType,
	requiresCompanyType,
	companyId,
	companyName,
	onClose,
	onRenamed,
	onDeleted,
}: Props) {
	const qc = useQueryClient();
	const [saving, setSaving] = useState(false);
	const [deleting, setDeleting] = useState(false);

	const defaultValues = useMemo<RenameCompanyFormValues>(() => ({
		name: companyName ?? "",
	}), [companyName]);

	const methods = useForm<RenameCompanyFormValues>({
		defaultValues,
		resolver: zodResolver(renameCompanySchema as any) as unknown as Resolver<RenameCompanyFormValues>,
		mode: "onBlur",
	});

	React.useEffect(() => {
		if (open) {
			methods.reset({ name: companyName ?? "" });
		}
	}, [open, companyId, companyName]);

	const isDisabled = !!disabled || !companyId;

	async function submit(values: RenameCompanyFormValues) {
		if (!companyId)
			return;
		if (requiresCompanyType && !companyType) {
			window.$message?.warning("نوع شرکت را انتخاب کنید");
			return;
		}

		setSaving(true);
		try {
			const payload = {
				name: values.name.trim(),
				service: serviceId,
				company_type: requiresCompanyType ? companyType : undefined,
			};

			await request.put(`common/companies/${companyId}/`, { json: payload }).json<any>();

			await qc.invalidateQueries({ queryKey: ["common", "companies", { serviceId }] });

			window.$message?.success("نام شرکت با موفقیت ویرایش شد");
			onRenamed(payload.name);
		}
		catch (e) {
			console.error(e);
			window.$message?.error("در حال حاضر مشکلی وجود دارد");
		}
		finally {
			setSaving(false);
		}
	}

	async function confirmDelete() {
		if (!companyId)
			return;

		Modal.confirm({
			title: "حذف شرکت",
			content: "آیا از حذف این شرکت مطمئن هستید؟",
			okText: "حذف",
			cancelText: "انصراف",
			okButtonProps: { danger: true },
			onOk: async () => {
				setDeleting(true);
				try {
					await request.delete(`common/companies/${companyId}/`).json<void>();

					await qc.invalidateQueries({ queryKey: ["common", "companies", { serviceId }] });

					await qc.invalidateQueries({ queryKey: ["contracts", "companyProfiles", { companyId }] });

					window.$message?.success("شرکت حذف شد");
					onDeleted();
				}
				catch (e) {
					console.error(e);
					window.$message?.error("در حال حاضر مشکلی وجود دارد");
				}
				finally {
					setDeleting(false);
				}
			},
		});
	}

	return (
		<Modal
			open={open}
			onCancel={() => {
				if (!saving && !deleting)
					onClose();
			}}
			title="ویرایش نام شرکت"
			footer={null}
			destroyOnHidden
		>
			<Form layout="vertical">
				<FormProvider {...methods}>
					{/* نمایش شرکت انتخاب شده */}
					<div className="mb-3 opacity-85">
						<div className="mb-1.5">شرکت انتخاب‌شده</div>
						<div
							className={isDisabled
								? "rounded-[10px] border border-[rgba(255,255,255,0.08)] px-3 py-2.5 opacity-70"
								: "rounded-[10px] border border-[rgba(255,255,255,0.08)] px-3 py-2.5"}
						>
							{companyName ?? "-"}
						</div>
					</div>

					<RHFProText
						name="name"
						label="نام شرکت"
						inputProps={{ placeholder: "نام شرکت", disabled: isDisabled || saving || deleting }}
					/>

					<div className="flex justify-between mt-4">
						<div className="flex gap-3">
							<Button
								type="primary"
								loading={saving}
								disabled={isDisabled || deleting}
								onClick={methods.handleSubmit(v => submit(v))}
							>
								اعمال تغییرات
							</Button>

							<Button
								danger
								loading={deleting}
								disabled={isDisabled || saving}
								onClick={confirmDelete}
							>
								حذف شرکت
							</Button>
						</div>

						<Button onClick={onClose} disabled={saving || deleting}>
							انصراف
						</Button>
					</div>
				</FormProvider>
			</Form>
		</Modal>
	);
}
