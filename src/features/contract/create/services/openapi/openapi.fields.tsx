import type { ContractFormValues } from "../../model/contract.form.types";
import { BasicContent } from "#src/components/index.js";
import { RHFProText, RHFSelect } from "#src/shared/ui/rhf-pro";
import { RHFProNumber } from "#src/shared/ui/rhf-pro/fields/RHFProNumber.js";

import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { ProCard, ProFormGroup } from "@ant-design/pro-components";
import { Button, Col, Collapse, Row } from "antd";
import React, { useMemo, useState } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { ContractTypeSection } from "../../../components/contract-type/ContractTypeSection";
import { defaultLegacyPricing, defaultOpenApiPlan } from "./openapi.types";

// helper برای مسیرهای serviceFields.* (تمیز و متمرکز)
const sf = (path: string) => `serviceFields.${path}` as any;

const CONTRACT_MODEL_OPTIONS = [{ label: "Package (بسته‌ای)", value: "package" }, { label: "Legacy (قدیمی)", value: "legacy" }];
const PACKAGE_MODE_OPTIONS = [
	{ label: "OR", value: "OR" },
	{ label: "AND", value: "AND" },
];

export function OpenApiFields() {
	const { control, setValue } = useFormContext<ContractFormValues>();

	const { fields, append, remove } = useFieldArray({
		control,
		name: sf("plans"),
	});
	// ✅ با افزودن پلن جدید، همون پلن باز بشه و بقیه بسته
	const [activeKey, setActiveKey] = useState<string>("0");

	const contractModel = useWatch({ control, name: sf("contractModel") }) as "package" | "legacy" | null;

	// وقتی legacy انتخاب شد، اگر legacyPricing نبود بساز
	React.useEffect(() => {
		if (contractModel === "legacy") {
			setValue(sf("legacyPricing"), structuredClone(defaultLegacyPricing) as any, {
				shouldDirty: true,
				shouldValidate: true,
			});
			setValue(sf("packageMode"), null as any, { shouldDirty: true, shouldValidate: true });
		}
		else {
			// وقتی package شد، legacyPricing رو پاک کن (با shouldUnregister true هم تمیزه)
			setValue(sf("legacyPricing"), undefined as any, {
				shouldDirty: true,
				shouldValidate: true,
			});
		}
	}, [contractModel, setValue]);

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
			label: (
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						width: "100%",
						gap: 12,
					}}
				>
					<span>{`پلن بسته ${idx + 1}`}</span>

					<Button
						danger
						size="small"
						icon={<DeleteOutlined />}
						disabled={idx === 0}
						onClick={(e) => {
							e.stopPropagation();
							removePlan(idx);
						}}
					>
						حذف پلن
					</Button>
				</div>
			),
			children: (
				<ProCard
					ghost
					gutter={8}

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
								<RHFProNumber
									name={sf(`plans.${idx}.smsMax`)}
									label="حداکثر پیامک"
									enableGrouping
									enableWordsTooltip
									inputProps={{ placeholder: "مثلاً 200000000" }}
								/>
							</ProFormGroup>

							<ProFormGroup colProps={{ span: 12 }}>
								<RHFProNumber
									name={sf(`plans.${idx}.smsMin`)}
									label="حداقل پیامک"
									inputProps={{ placeholder: "مثلاً 0" }}
								/>
							</ProFormGroup>

							<ProFormGroup colProps={{ span: 12 }}>
								<RHFProNumber
									name={sf(`plans.${idx}.smsFixedPrice`)}
									label="نرخ فروش پیامک - مبلغ ثابت (تومان)"
									inputProps={{ placeholder: "مثلاً 120" }}
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
								<RHFProNumber
									name={sf(`plans.${idx}.billPartnerShare`)}
									label="سهم شریک (%)"
									inputProps={{ placeholder: "مثلاً 40" }}
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
								<RHFProNumber
									name={sf(`plans.${idx}.billMax`)}
									label="حداکثر استعلام قبض"
									enableGrouping
									enableWordsTooltip
									inputProps={{ placeholder: "مثلاً 2000000" }}
								/>
							</ProFormGroup>

							<ProFormGroup colProps={{ span: 12 }}>
								<RHFProNumber
									name={sf(`plans.${idx}.billMin`)}
									label="حداقل استعلام قبض"
									enableGrouping
									enableWordsTooltip
									inputProps={{ placeholder: "مثلاً 0" }}
								/>
							</ProFormGroup>

							<ProFormGroup colProps={{ span: 12 }}>
								<RHFProNumber
									name={sf(`plans.${idx}.billFixedPrice`)}
									label="نرخ استعلام قبض - مبلغ ثابت (تومان)"
									enableGrouping
									enableWordsTooltip
									inputProps={{ placeholder: "مثلاً 120" }}
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
						<RHFProNumber
							name={sf(`plans.${idx}.trafficCommissionPercent`)}
							label="درصد کارمزد (0 تا 100)"
							inputProps={{ placeholder: "مثلاً 4" }}
						/>
					</ProCard>

					{/* <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
						<Button
							danger
							icon={<DeleteOutlined />}
							onClick={() => removePlan(idx)}
							disabled={fields.length <= 1}
						>
							حذف پلن
						</Button>
					</div> */}
				</ProCard>
			),
		}));
	}, [fields, remove]);

	return (
		<ProCard
			bordered
			headerBordered
			title="مدل قرارداد OpenAPI"
			bodyStyle={{ padding: 16 }}
		>
			<Row gutter={24} justify="space-between">
				<Col span={12}>
					<RHFSelect
						name={sf("contractModel")}
						label="مدل قرارداد OpenAPI"
						options={CONTRACT_MODEL_OPTIONS}
						selectProps={{ placeholder: "انتخاب کنید" }}
					/>
				</Col>

				<Col span={12}>
					{contractModel === "package"
						? (
							<RHFSelect
								name={sf("packageMode")}
								label="حالت بسته"
								options={PACKAGE_MODE_OPTIONS}
								selectProps={{ placeholder: "انتخاب کنید" }}
							/>
						)
						: null}
				</Col>
			</Row>
			<Row>
				{/* ✅ فقط وقتی legacy */}
				{contractModel === "legacy"
					? (
						<BasicContent className="w-full overflow-hidden ">

							<Row gutter={12} justify="space-between" className="gap-3">
								<Col span={24}>
									<ContractTypeSection
										title="بهای ثبت وصولی"
										name={sf("legacyPricing.paymentRegistration")}
									/>
								</Col>
								<Col span={24}>
									<ContractTypeSection
										title="بهای استعلام قبض"
										name={sf("legacyPricing.billInquiry")}
									/>
								</Col>
							</Row>
						</BasicContent>
					)
					: null}
				{contractModel === "package"
					? (
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
					)
					: null}
			</Row>
		</ProCard>
	);
}
