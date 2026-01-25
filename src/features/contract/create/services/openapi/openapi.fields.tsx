import type { ContractFormValues } from "../../model/contract.form.types";
import { RHFProText, RHFSelect } from "#src/shared/ui/rhf-pro";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { ProCard, ProFormGroup } from "@ant-design/pro-components";
import { Button, Collapse } from "antd";

import React, { useMemo, useState } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { defaultOpenApiPlan } from "./openapi.types";

// helper برای مسیرهای serviceFields.* (تمیز و متمرکز)
const sf = (path: string) => `serviceFields.${path}` as any;

const CONTRACT_MODEL_OPTIONS = [{ label: "Package (بسته‌ای)", value: "package" }];
const PACKAGE_MODE_OPTIONS = [
	{ label: "OR", value: "OR" },
	{ label: "AND", value: "AND" },
];

export function OpenApiFields() {
	const { control } = useFormContext<ContractFormValues>();

	const { fields, append, remove } = useFieldArray({
		control,
		name: sf("plans"),
	});

	// ✅ با افزودن پلن جدید، همون پلن باز بشه و بقیه بسته
	const [activeKey, setActiveKey] = useState<string>("0");

	const addPlan = () => {
		const nextIndex = fields.length;
		append(structuredClone(defaultOpenApiPlan) as any);
		setActiveKey(String(nextIndex));
	};

	const removePlan = (idx: number) => {
		remove(idx);
		const next = idx === 0 ? "0" : String(idx - 1);
		setActiveKey(next);
	};

	const collapseItems = useMemo(() => {
		return fields.map((f, idx) => ({
			key: String(idx),
			label: `پلن بسته ${idx + 1}`,
			children: (
				<ProCard
					bordered
					ghost
					style={{ borderRadius: 12 }}
					bodyStyle={{ padding: 12 }}
				>
					{/* بخش پیامک */}
					<ProCard
						title="بخش پیامک"
						bordered
						headerBordered
						style={{ marginBottom: 12, borderRadius: 12 }}
						bodyStyle={{ padding: 12 }}
					>
						<ProFormGroup grid>
							<ProFormGroup colProps={{ span: 12 }}>
								<RHFProText
									name={sf(`plans.${idx}.smsMax`)}
									label="حداکثر پیامک"
									inputProps={{ placeholder: "مثلاً 200000000", inputMode: "numeric" }}
								/>
							</ProFormGroup>

							<ProFormGroup colProps={{ span: 12 }}>
								<RHFProText
									name={sf(`plans.${idx}.smsMin`)}
									label="حداقل پیامک"
									inputProps={{ placeholder: "مثلاً 0", inputMode: "numeric" }}
								/>
							</ProFormGroup>

							<ProFormGroup colProps={{ span: 12 }}>
								<RHFProText
									name={sf(`plans.${idx}.smsFixedPrice`)}
									label="نرخ فروش پیامک - مبلغ ثابت (تومان)"
									inputProps={{ placeholder: "مثلاً 120", inputMode: "numeric" }}
								/>
							</ProFormGroup>
						</ProFormGroup>
					</ProCard>

					{/* بخش استعلام قبض */}
					<ProCard
						title="بخش استعلام قبض"
						bordered
						headerBordered
						style={{ marginBottom: 12, borderRadius: 12 }}
						bodyStyle={{ padding: 12 }}
					>
						<ProFormGroup grid>
							<ProFormGroup colProps={{ span: 12 }}>
								<RHFProText
									name={sf(`plans.${idx}.billPartnerShare`)}
									label="سهم شریک (%)"
									inputProps={{ placeholder: "مثلاً 40", inputMode: "numeric" }}
								/>
							</ProFormGroup>

							<ProFormGroup colProps={{ span: 12 }}>
								<RHFProText
									name={sf(`plans.${idx}.billKarashabShare`)}
									label="سهم کاراشاب (%)"
									inputProps={{ placeholder: "مثلاً 60", inputMode: "numeric" }}
								/>
							</ProFormGroup>

							<ProFormGroup colProps={{ span: 12 }}>
								<RHFProText
									name={sf(`plans.${idx}.billMax`)}
									label="حداکثر استعلام قبض"
									inputProps={{ placeholder: "مثلاً 2000000", inputMode: "numeric" }}
								/>
							</ProFormGroup>

							<ProFormGroup colProps={{ span: 12 }}>
								<RHFProText
									name={sf(`plans.${idx}.billMin`)}
									label="حداقل استعلام قبض"
									inputProps={{ placeholder: "مثلاً 0", inputMode: "numeric" }}
								/>
							</ProFormGroup>

							<ProFormGroup colProps={{ span: 12 }}>
								<RHFProText
									name={sf(`plans.${idx}.billFixedPrice`)}
									label="نرخ استعلام قبض - مبلغ ثابت (تومان)"
									inputProps={{ placeholder: "مثلاً 120", inputMode: "numeric" }}
								/>
							</ProFormGroup>
						</ProFormGroup>
					</ProCard>

					{/* کارمزد شریک ترافیک */}
					<ProCard
						title="کارمزد شریک ترافیک"
						bordered
						headerBordered
						style={{ borderRadius: 12 }}
						bodyStyle={{ padding: 12 }}
					>
						<RHFProText
							name={sf(`plans.${idx}.trafficCommissionPercent`)}
							label="درصد کارمزد (0 تا 100)"
							inputProps={{ placeholder: "مثلاً 4", inputMode: "numeric" }}
						/>
					</ProCard>

					<div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
						<Button
							danger
							icon={<DeleteOutlined />}
							onClick={() => removePlan(idx)}
							disabled={fields.length <= 1}
						>
							حذف پلن
						</Button>
					</div>
				</ProCard>
			),
		}));
	}, [fields, remove]);

	return (
		<ProCard
			bordered
			headerBordered
			style={{ marginTop: 16, borderRadius: 16 }}
			title="مدل قرارداد OpenAPI"
			bodyStyle={{ padding: 16 }}
		>
			<ProFormGroup grid>
				<ProFormGroup colProps={{ span: 12 }}>
					<RHFSelect
						name={sf("contractModel")}
						label="مدل قرارداد OpenAPI"
						options={CONTRACT_MODEL_OPTIONS}
						selectProps={{ placeholder: "انتخاب کنید" }}
					/>
				</ProFormGroup>

				<ProFormGroup colProps={{ span: 12 }}>
					<RHFSelect
						name={sf("packageMode")}
						label="حالت بسته"
						options={PACKAGE_MODE_OPTIONS}
						selectProps={{ placeholder: "انتخاب کنید" }}
					/>
				</ProFormGroup>
			</ProFormGroup>

			<ProCard
				bordered
				headerBordered
				style={{ marginTop: 12, borderRadius: 16 }}
				title="پلن‌ها"
				extra={(
					<Button icon={<PlusOutlined />} onClick={addPlan}>
						افزودن پلن جدید
					</Button>
				)}
				bodyStyle={{ padding: 12 }}
			>
				<Collapse
					accordion
					activeKey={activeKey}
					onChange={k =>
						setActiveKey(Array.isArray(k) ? String(k[0] ?? "0") : String(k ?? "0"))}
					items={collapseItems as any}
				/>
			</ProCard>
		</ProCard>
	);
}
