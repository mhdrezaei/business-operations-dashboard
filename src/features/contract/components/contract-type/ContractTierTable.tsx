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
					style={{
						border: 0,
						background: "transparent",
						color: "inherit",
						padding: 0,
						font: "inherit",
						cursor: "pointer",
						textAlign: "right",
						lineHeight: 1.6,
					}}
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
					formItemProps={{ style: { marginBottom: 0 } }}
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
		<ProCard bordered style={{ borderRadius: 12 }} bodyStyle={{ padding: 12 }}>
			<div style={{ fontWeight: 600, marginBottom: 12 }}>تعریف بازه‌ها و نرخ</div>

			<div style={{ overflow: "hidden" }}>
				<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 64px" }}>
					{header.map(item => (
						<div key={item.key} style={{ padding: 12, textAlign: "center", fontWeight: 600 }}>
							{item.title}
						</div>
					))}
					<div />
				</div>

				{fields.map((field, index) => (
					<div
						key={field.id}
						style={{
							display: "grid",
							gridTemplateColumns: "1fr 1fr 1fr 64px",
							borderTop: "1px solid rgba(255,255,255,0.08)",
						}}
					>
						<div style={{ padding: 12 }}>
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
								formItemProps={{ style: { marginBottom: 0 } }}
							/>
						</div>

						<div style={{ padding: 12 }}>
							<TierToField
								name={`${name}.${index}.to`}
								showHint={index === fields.length - 1}
							/>
						</div>

						<div style={{ padding: 12 }}>
							<RHFProNumber
								name={`${name}.${index}.fee` as any}
								label=""
								enableGrouping
								enableWordsTooltip
								inputProps={{ placeholder: "فی", inputMode: "numeric" } as any}
								formItemProps={{ style: { marginBottom: 0 } }}
							/>
						</div>

						<div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}>
							<Button
								type="text"
								danger
								icon={<DeleteOutlined />}
								onClick={() => handleRemoveRow(index)}
							/>
						</div>
					</div>
				))}

				<div style={{ padding: 12 }}>
					<Button icon={<PlusOutlined />} onClick={handleAddRow}>
						افزودن ردیف
					</Button>
				</div>
			</div>
		</ProCard>
	);
}
