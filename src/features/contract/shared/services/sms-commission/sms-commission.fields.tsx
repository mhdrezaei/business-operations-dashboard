import type { ContractFormValues } from "#src/features/contract/shared/model/contract.form.types.js";
import { RHFProNumber } from "#src/shared/ui/rhf-pro";
import { ProCard } from "@ant-design/pro-components";

const sf = (path: string) => `serviceFields.${path}` as const;

export function SmsCommissionFields() {
	return (
		<ProCard bordered headerBordered style={{ borderRadius: 6 }} bodyStyle={{ padding: 16 }}>
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
					gap: 12,
				}}
			>
				<RHFProNumber<ContractFormValues, any>
					name={sf("initialCommission") as any}
					label="کارمزد دریافت اولیه"
					inputProps={{ placeholder: "مثلا 110" }}
				/>

				<RHFProNumber<ContractFormValues, any>
					name={sf("finalCommission") as any}
					label="کارمزد دریافت نهایی"
					inputProps={{ placeholder: "مثلا 150" }}
				/>

				<RHFProNumber<ContractFormValues, any>
					name={sf("expertPercent") as any}
					label="درصد کارشناسی"
					inputProps={{ placeholder: "مثلا 20" }}
					enableGrouping={false}
				/>

				<RHFProNumber<ContractFormValues, any>
					name={sf("telecomPercent") as any}
					label="درصد مخابرات"
					inputProps={{ placeholder: "مثلا 80" }}
					enableGrouping={false}
				/>

				<RHFProNumber<ContractFormValues, any>
					name={sf("firstPartySharePercent") as any}
					label="درصد سهم طرف اول"
					inputProps={{ placeholder: "مثلا 20" }}
					enableGrouping={false}
				/>

				<RHFProNumber<ContractFormValues, any>
					name={sf("regionSharePercent") as any}
					label="درصد سهم منطقه"
					inputProps={{ placeholder: "مثلا 30" }}
					enableGrouping={false}
				/>

				<div style={{ gridColumn: "1 / -1" }}>
					<RHFProNumber<ContractFormValues, any>
						name={sf("salesAgentSharePercent") as any}
						label="درصد سهم نماینده فروش"
						inputProps={{ placeholder: "مثلا 50" }}
						enableGrouping={false}
					/>
				</div>
			</div>
		</ProCard>
	);
}
