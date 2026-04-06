import { RHFProNumber } from "#src/shared/ui/rhf-pro";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { ProCard } from "@ant-design/pro-components";
import { Button } from "antd";
import React, { useEffect, useMemo } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";

interface Props {
	name: string
}

export function ContractTierTable({ name }: Props) {
	const { control, setValue } = useFormContext();
	const { fields, append, remove } = useFieldArray({ control, name });

	const rows = useWatch({ control, name }) as Array<{ from: any, to: any, fee: any }> | undefined;

	const header = useMemo(
		() => [
			{ key: "from", title: "بازه اول", sub: "از" },
			{ key: "to", title: "بازه دوم", sub: "تا" },
			{ key: "fee", title: "مقدار فی", sub: "فی" },
		],
		[],
	);

	useEffect(() => {
		if (!rows || rows.length < 2)
			return;

		for (let i = 1; i < rows.length; i++) {
			const prevTo = rows[i - 1]?.to ?? null;
			const currFrom = rows[i]?.from ?? null;

			if (currFrom !== prevTo) {
				setValue(`${name}.${i}.from` as any, prevTo, {
					shouldDirty: true,
					shouldValidate: true,
				});
			}
		}
	}, [rows, name, setValue]);

	return (
		<ProCard bordered style={{ borderRadius: 12 }} bodyStyle={{ padding: 12 }}>
			<div style={{ fontWeight: 600, marginBottom: 12 }}>تعریف بازه‌ها و نرخ</div>

			<div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
				<div style={{ display: "grid", gridTemplateColumns: "64px 1fr 1fr 1fr" }}>
					<div />
					{header.map(h => (
						<div key={h.key} style={{ padding: 12, textAlign: "center", fontWeight: 600 }}>
							{h.title}
						</div>
					))}
				</div>

				{fields.map((f, idx) => (
					<div
						key={f.id}
						style={{
							display: "grid",
							gridTemplateColumns: "64px 1fr 1fr 1fr",
							borderTop: "1px solid rgba(255,255,255,0.08)",
						}}
					>
						<div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
							<Button
								type="text"
								danger
								icon={<DeleteOutlined />}
								onClick={() => remove(idx)}
							/>
						</div>

						<div style={{ padding: 12 }}>
							<RHFProNumber
								name={`${name}.${idx}.from` as any}
								label=""
								enableGrouping
								enableWordsTooltip
								inputProps={{
									placeholder: "از",
									inputMode: "numeric",
									disabled: idx > 0,
								} as any}
								formItemProps={{ style: { marginBottom: 0 } }}
							/>
						</div>

						<div style={{ padding: 12 }}>
							<RHFProNumber
								name={`${name}.${idx}.to` as any}
								label=""
								enableGrouping
								enableWordsTooltip
								inputProps={{ placeholder: "تا", inputMode: "numeric" } as any}
								formItemProps={{
									style: { marginBottom: 0 },
									extra: idx === fields.length - 1
										? "در صورت خالی بودن محدودیتی وجود ندارد."
										: undefined,
								}}
							/>
						</div>

						<div style={{ padding: 12 }}>
							<RHFProNumber
								name={`${name}.${idx}.fee` as any}
								label=""
								enableGrouping
								enableWordsTooltip
								inputProps={{ placeholder: "فی", inputMode: "numeric" } as any}
								formItemProps={{ style: { marginBottom: 0 } }}
							/>
						</div>
					</div>
				))}

				<div style={{ padding: 12 }}>
					<Button
						icon={<PlusOutlined />}
						onClick={() => {
							if (!rows || rows.length === 0) {
								append({ from: null, to: null, fee: null } as any);
								return;
							}

							const prevTo = rows[rows.length - 1]?.to ?? null;
							append({ from: prevTo, to: null, fee: null } as any);
						}}
					>
						افزودن ردیف
					</Button>
				</div>
			</div>
		</ProCard>
	);
}
