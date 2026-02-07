import type { ArrayPath, FieldValues, Path, PathValue } from "react-hook-form";
import { RHFProTextArea, RHFSelect } from "#src/shared/ui/rhf-pro";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { ProCard } from "@ant-design/pro-components";
import { Button, Collapse, message } from "antd";
import React, { useMemo, useState } from "react";

import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { MONTH_OPTIONS, YEAR_OPTIONS } from "../../constant/jalali-date-options";
import { ContractTypeSection } from "../contract-type/ContractTypeSection";
import { defaultAddendumValue } from "./addenda.types";

const p = (base: string, path: string) => `${base}.${path}` as any;

function toNum(v: any): number | null {
	if (v === "" || v == null)
		return null;
	const n = typeof v === "number" ? v : Number(v);
	return Number.isFinite(n) ? n : null;
}

// YYYY/MM -> Comparable number
function ymToKey(y: number | string | null | undefined, m: number | string | null | undefined) {
	const yn = toNum(y);
	const mn = toNum(m);
	if (yn == null || mn == null)
		return null;
	return yn * 100 + mn;
}
function overlap(aStart: number, aEnd: number, bStart: number, bEnd: number) {
	return aStart <= bEnd && aEnd >= bStart;
}

function monthsInYearOptions(year: number | string, startKey: number, endKey: number) {
	const yn = toNum(year);
	if (yn == null)
		return MONTH_OPTIONS as any[];

	const startY = Math.floor(startKey / 100);
	const startM = startKey % 100;
	const endY = Math.floor(endKey / 100);
	const endM = endKey % 100;

	let minM = 1;
	let maxM = 12;

	if (yn === startY)
		minM = startM;
	if (yn === endY)
		maxM = endM;

	return (MONTH_OPTIONS as any[]).filter((o) => {
		const mv = toNum(o.value);
		return mv != null && mv >= minM && mv <= maxM;
	});
}

interface Props<TFV extends FieldValues> {
	name: ArrayPath<TFV>
	title?: string
	contractTypeTitle: string
	contractTypeFieldKey?: string

	contractStartYearPath: Path<TFV>
	contractStartMonthPath: Path<TFV>
	contractEndYearPath: Path<TFV>
	contractEndMonthPath: Path<TFV>
}

export function ContractAddendaSection<TFV extends FieldValues>({
	name,
	title = "الحاقیه‌های قرارداد (اختیاری)",
	contractTypeTitle,
	contractTypeFieldKey = "pricing",
	contractStartYearPath,
	contractStartMonthPath,
	contractEndYearPath,
	contractEndMonthPath,
}: Props<TFV>) {
	const { control, getValues, setError, clearErrors, trigger } = useFormContext<TFV>();
	const addendaValues = useWatch({
		control,
		name: name as unknown as Path<TFV>,
	}) as PathValue<TFV, typeof name> | undefined;
	// Date of original contract
	const contractStartYear = useWatch({ control, name: contractStartYearPath }) as any;
	const contractStartMonth = useWatch({ control, name: contractStartMonthPath }) as any;
	const contractEndYear = useWatch({ control, name: contractEndYearPath }) as any;
	const contractEndMonth = useWatch({ control, name: contractEndMonthPath }) as any;

	const contractStartKey = ymToKey(contractStartYear, contractStartMonth);
	const contractEndKey = ymToKey(contractEndYear, contractEndMonth);
	const contractRangeReady = contractStartKey != null && contractEndKey != null && contractStartKey <= contractEndKey;

	const { fields, append, remove } = useFieldArray({ control, name });
	const [activeKey, setActiveKey] = useState<string | undefined>(undefined);

	// ✅ Allowed years based on contract period
	const allowedYears = useMemo(() => {
		if (!contractRangeReady)
			return YEAR_OPTIONS;
		const sy = Math.floor(contractStartKey! / 100);
		const ey = Math.floor(contractEndKey! / 100);
		return (YEAR_OPTIONS as any[]).filter(o => o.value >= sy && o.value <= ey);
	}, [contractRangeReady, contractStartKey, contractEndKey]);

	// ✅ Instant check for overlap and within range (we throw an error on the same startYear field)
	const validateAddendumRangeNow = (idx: number) => {
		if (!contractRangeReady)
			return;

		const base = `${name}.${idx}`;

		const sy = getValues(p(base, "startYear")) as number | null;
		const sm = getValues(p(base, "startMonth")) as number | null;
		const ey = getValues(p(base, "endYear")) as number | null;
		const em = getValues(p(base, "endMonth")) as number | null;

		const sKey = ymToKey(sy, sm);
		const eKey = ymToKey(ey, em);

		// Don't show anything until it's complete.
		if (sKey == null || eKey == null) {
			clearErrors(p(base, "startYear"));
			return;
		}

		// invalid
		if (sKey > eKey) {
			setError(p(base, "startYear"), { type: "custom", message: "بازه تاریخ الحاقیه نامعتبر است" } as any);
			return;
		}

		// Out of contract
		if (sKey < contractStartKey! || eKey > contractEndKey!) {
			setError(p(base, "startYear"), { type: "custom", message: "بازه تاریخ الحاقیه باید داخل بازه قرارداد باشد" } as any);
			return;
		}

		// overlap with others
		for (let i = 0; i < fields.length; i++) {
			if (i === idx)
				continue;

			const obase = `${name}.${i}`;
			const osy = getValues(p(obase, "startYear")) as number | null;
			const osm = getValues(p(obase, "startMonth")) as number | null;
			const oey = getValues(p(obase, "endYear")) as number | null;
			const oem = getValues(p(obase, "endMonth")) as number | null;

			const osKey = ymToKey(osy, osm);
			const oeKey = ymToKey(oey, oem);

			if (osKey == null || oeKey == null)
				continue;

			if (overlap(sKey, eKey, osKey, oeKey)) {
				setError(p(base, "startYear"), { type: "custom", message: "این بازه با یکی از الحاقیه‌های قبلی هم‌پوشانی دارد" } as any);
				return;
			}
		}

		// If everything was OK
		clearErrors(p(base, "startYear"));
	};

	const addAddendum = async () => {
		if (!contractRangeReady) {
			message.warning("ابتدا تاریخ شروع و پایان قرارداد را انتخاب کنید.");
			return;
		}

		// ✅ If the last one is incomplete, do not allow adding
		if (fields.length > 0) {
			const lastIdx = fields.length - 1;
			const base = `${name}.${lastIdx}`;

			const sy = getValues(p(base, "startYear"));
			const sm = getValues(p(base, "startMonth"));
			const ey = getValues(p(base, "endYear"));
			const em = getValues(p(base, "endMonth"));

			if (ymToKey(sy, sm) == null || ymToKey(ey, em) == null) {
				message.warning("ابتدا تاریخ‌های الحاقیه قبلی را کامل کنید.");
				setActiveKey(String(lastIdx));
				return;
			}

			// ✅ Let's validate here that there is no overlap
			validateAddendumRangeNow(lastIdx);
			const ok = await trigger([p(base, "startYear") as any]);
			if (!ok) {
				setActiveKey(String(lastIdx));
				return;
			}
		}

		const idx = fields.length;
		append(structuredClone(defaultAddendumValue) as any);
		setActiveKey(String(idx));
	};

	const removeAddendum = (idx: number) => {
		remove(idx);
		const next = idx === 0 ? "0" : String(idx - 1);
		setActiveKey(fields.length <= 1 ? undefined : next);
	};

	const collapseItems = useMemo(() => {
		return fields.map((f, idx) => {
			const base = `${name}.${idx}`;

			const sy = getValues(p(base, "startYear")) as number | null;
			const sm = getValues(p(base, "startMonth")) as number | null;
			const ey = getValues(p(base, "endYear")) as number | null;
			const em = getValues(p(base, "endMonth")) as number | null;

			const headerHint
				= sy && sm && ey && em ? `(${sy}/${sm} تا ${ey}/${em})` : "(تاریخ‌ها تکمیل نشده)";

			const startMonthOptions
				= contractRangeReady && sy ? monthsInYearOptions(sy, contractStartKey!, contractEndKey!) : MONTH_OPTIONS;

			const endMonthOptions
				= contractRangeReady && ey ? monthsInYearOptions(ey, contractStartKey!, contractEndKey!) : MONTH_OPTIONS;

			return {
				key: String(idx),
				label: (
					<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", gap: 12 }}>
						<div style={{ fontWeight: 700 }}>
							{`الحاقیه ${idx + 1}`}
							{" "}
							<span style={{ opacity: 0.75, fontWeight: 500 }}>{headerHint}</span>
						</div>

						<Button
							danger
							size="small"
							icon={<DeleteOutlined />}
							onClick={(e) => {
								e.stopPropagation();
								removeAddendum(idx);
							}}
						>
							حذف الحاقیه
						</Button>
					</div>
				),
				children: (
					<ProCard ghost bodyStyle={{ padding: 0 }}>
						<div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12, marginTop: 8 }}>
							<RHFSelect
								name={p(base, "startYear")}
								label="سال شروع الحاقیه"
								options={allowedYears as any}
								selectProps={{ placeholder: "سال", allowClear: true }}
								onValueChange={async () => {
									validateAddendumRangeNow(idx);
									await trigger([
										p(base, "startYear") as any,
										p(base, "startMonth") as any,
										p(base, "endYear") as any,
										p(base, "endMonth") as any,
									]);
								}}
							/>

							<RHFSelect
								name={p(base, "startMonth")}
								label="ماه شروع"
								options={startMonthOptions as any}
								onValueChange={async () => {
									validateAddendumRangeNow(idx);
									await trigger([
										p(base, "startYear") as any,
										p(base, "startMonth") as any,
										p(base, "endYear") as any,
										p(base, "endMonth") as any,
									]);
								}}
								selectProps={{
									placeholder: "ماه",
									allowClear: true,
								}}
							/>

							<RHFSelect
								name={p(base, "endYear")}
								label="سال پایان الحاقیه"
								options={allowedYears as any}
								onValueChange={async () => {
									validateAddendumRangeNow(idx);
									await trigger([
										p(base, "startYear") as any,
										p(base, "startMonth") as any,
										p(base, "endYear") as any,
										p(base, "endMonth") as any,
									]);
								}}
								selectProps={{
									placeholder: "سال",
									allowClear: true,
								}}
							/>

							<RHFSelect
								name={p(base, "endMonth")}
								label="ماه پایان"
								options={endMonthOptions as any}
								onValueChange={async () => {
									validateAddendumRangeNow(idx);
									await trigger([
										p(base, "startYear") as any,
										p(base, "startMonth") as any,
										p(base, "endYear") as any,
										p(base, "endMonth") as any,
									]);
								}}
								selectProps={{
									placeholder: "ماه",
									allowClear: true,
								}}
							/>
						</div>

						<div style={{ marginTop: 12 }}>
							<ContractTypeSection title={contractTypeTitle} name={p(base, contractTypeFieldKey)} />
						</div>

						<div style={{ marginTop: 12 }}>
							<RHFProTextArea
								name={p(base, "description")}
								label="توضیح الحاقیه"
								textAreaProps={{ placeholder: "توضیح اختیاری برای این الحاقیه" }}
							/>
						</div>
					</ProCard>
				),
			};
		});
	}, [
		fields,
		name,
		getValues,
		addendaValues,
		allowedYears,
		contractRangeReady,
		contractStartKey,
		contractEndKey,
		contractTypeTitle,
		contractTypeFieldKey,
		trigger,
	]);

	return (
		<ProCard
			bordered
			headerBordered
			style={{ borderRadius: 6, marginTop: 12 }}
			title={title}
			extra={(
				<Button icon={<PlusOutlined />} onClick={addAddendum} disabled={!contractRangeReady}>
					افزودن الحاقیه
				</Button>
			)}
			bodyStyle={{ padding: 16 }}
		>
			{!contractRangeReady
				? (
					<div style={{ opacity: 0.75 }}>برای افزودن الحاقیه، ابتدا تاریخ شروع و پایان قرارداد را انتخاب کنید.</div>
				)
				: null}

			{fields.length === 0
				? null
				: (
					<Collapse
						accordion
						activeKey={activeKey}
						onChange={k => setActiveKey(Array.isArray(k) ? String(k[0] ?? "") : (k ? String(k) : undefined))}
						items={collapseItems as any}
					/>
				)}
		</ProCard>
	);
}
