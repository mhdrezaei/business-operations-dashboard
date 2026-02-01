import { RHFProNumber } from "#src/shared/ui/rhf-pro"; // مسیر خودت
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { ProCard } from "@ant-design/pro-components";
import { Button } from "antd";
import React, { useMemo } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";

interface Props {
	name: string // مثل "serviceFields.contractPricing.rows"
}

export function ContractTierTable({ name }: Props) {
	const { control } = useFormContext();
	const { fields, append, remove } = useFieldArray({ control, name });

	const header = useMemo(() => ([
		{ key: "from", title: "بازه اول", sub: "از" },
		{ key: "to", title: "بازه دوم", sub: "تا" },
		{ key: "fee", title: "مقدار فی", sub: "فی" },
	]), []);

	return (
		<ProCard bordered style={{ borderRadius: 12 }} bodyStyle={{ padding: 12 }}>
			<div style={{ fontWeight: 600, marginBottom: 12 }}>تعریف بازه‌ها و نرخ</div>

			<div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
				{/* header */}
				<div style={{ display: "grid", gridTemplateColumns: "64px 1fr 1fr 1fr" }}>
					<div />
					{header.map(h => (
						<div key={h.key} style={{ padding: 12, textAlign: "center", fontWeight: 600 }}>
							{h.title}
						</div>
					))}
				</div>

				{/* rows */}
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
								inputProps={{ placeholder: "از", inputMode: "numeric" } as any}
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
								formItemProps={{ style: { marginBottom: 0 } }}
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
						onClick={() => append({ from: null, to: null, fee: null } as any)}
					>
						افزودن ردیف
					</Button>
				</div>
			</div>
		</ProCard>
	);
}
