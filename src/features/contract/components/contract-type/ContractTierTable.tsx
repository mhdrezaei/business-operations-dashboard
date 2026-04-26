import { RHFProNumber } from "#src/shared/ui/rhf-pro";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { ProCard } from "@ant-design/pro-components";
import { Button, Tooltip } from "antd";
import React, { useEffect, useMemo, useState } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";

interface Props {
	name: string
}

interface TierToFieldProps {
	name: string
	showHint: boolean
}

function TierToField({ name, showHint }: TierToFieldProps): React.JSX.Element {
	const [open, setOpen] = useState(showHint);

	useEffect(() => {
		setOpen(showHint);
	}, [showHint]);

	function handleCloseHint() {
		setOpen(false);
	}

	return (
		<Tooltip
			open={open}
			trigger={[]}
			placement="bottomRight"
			destroyTooltipOnHide
			title={(
				<button
					type="button"
					onClick={handleCloseHint}
					className="cursor-pointer border-0 bg-transparent p-0 text-right font-inherit leading-[1.6] text-inherit"
				>
					در صورت خالی بودن محدودیتی وجود ندارد.
				</button>
			)}
		>
			<div>
				<RHFProNumber
					name={name as any}
					label=""
					enableGrouping
					enableWordsTooltip
					inputProps={{ placeholder: "تا", inputMode: "numeric" } as any}
					formItemProps={{ className: "mb-0" }}
				/>
			</div>
		</Tooltip>
	);
}

export function ContractTierTable({ name }: Props) {
	const { control, setValue } = useFormContext();
	const { fields, append, remove } = useFieldArray({ control, name });

	const rows = useWatch({ control, name }) as Array<{ from: any, to: any, fee: any }> | undefined;

	const header = useMemo(
		() => [
			{ key: "from", title: "بازه اول" },
			{ key: "to", title: "بازه دوم" },
			{ key: "fee", title: "مقدار فی" },
		],
		[],
	);

	useEffect(() => {
		if (!rows || rows.length < 2)
			return;

		for (let index = 1; index < rows.length; index++) {
			const previousTo = rows[index - 1]?.to ?? null;
			const currentFrom = rows[index]?.from ?? null;

			if (currentFrom !== previousTo) {
				setValue(`${name}.${index}.from` as any, previousTo, {
					shouldDirty: true,
					shouldValidate: true,
				});
			}
		}
	}, [rows, name, setValue]);

	function handleRemoveRow(index: number) {
		remove(index);
	}

	function handleAddRow() {
		if (!rows || rows.length === 0) {
			append({ from: null, to: null, fee: null } as any);
			return;
		}

		const previousTo = rows[rows.length - 1]?.to ?? null;
		append({ from: previousTo, to: null, fee: null } as any);
	}

	return (
		<ProCard bordered className="rounded-xl [&_.ant-pro-card-body]:p-3">
			<div className="font-semibold mb-3">تعریف بازه‌ها و نرخ</div>

			<div className="overflow-hidden">
				<div className="grid grid-cols-[1fr_1fr_1fr_64px]">
					{header.map(item => (
						<div key={item.key} className="p-3 text-center font-semibold">
							{item.title}
						</div>
					))}
					<div />
				</div>

				{fields.map((field, index) => (
					<div
						key={field.id}
						className="grid grid-cols-[1fr_1fr_1fr_64px] border-t border-t-[rgba(255,255,255,0.08)]"
					>
						<div className="p-3">
							<RHFProNumber
								name={`${name}.${index}.from` as any}
								label=""
								enableGrouping
								enableWordsTooltip
								inputProps={{
									placeholder: "از",
									inputMode: "numeric",
									disabled: index > 0,
								} as any}
								formItemProps={{ className: "mb-0" }}
							/>
						</div>

						<div className="p-3">
							<TierToField
								name={`${name}.${index}.to`}
								showHint={index === fields.length - 1}
							/>
						</div>

						<div className="p-3">
							<RHFProNumber
								name={`${name}.${index}.fee` as any}
								label=""
								enableGrouping
								enableWordsTooltip
								inputProps={{ placeholder: "فی", inputMode: "numeric" } as any}
								formItemProps={{ className: "mb-0" }}
							/>
						</div>

						<div className="flex items-center justify-center p-3">
							<Button
								type="text"
								danger
								icon={<DeleteOutlined />}
								onClick={() => handleRemoveRow(index)}
							/>
						</div>
					</div>
				))}

				<div className="p-3">
					<Button icon={<PlusOutlined />} onClick={handleAddRow}>
						افزودن ردیف
					</Button>
				</div>
			</div>
		</ProCard>
	);
}
