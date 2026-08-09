import type { ArrayPath, FieldValues, Path, PathValue } from "react-hook-form";
import { RHFProText, RHFProTextArea, RHFSelect } from "#src/shared/ui/rhf-pro";
import { message } from "#src/utils";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Card, Collapse } from "antd";
import React, { useEffect, useMemo, useRef, useState } from "react";

import { useFormContext, useWatch } from "react-hook-form";
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

function readDisplayNumber(value: unknown) {
	if (value == null || typeof value !== "object")
		return null;
	const row = value as Record<string, unknown>;
	const displayNumber = row.displayAddendumNumber ?? row.display_addendum_number;
	return displayNumber == null || !String(displayNumber).trim() ? null : String(displayNumber);
}

function getNextDisplayNumber(items: unknown[], prefix?: string) {
	const usedNumbers = new Set<number>();
	for (const item of items) {
		const displayNumber = readDisplayNumber(item);
		if (!displayNumber)
			continue;

		const suffix = prefix
			? displayNumber.startsWith(`${prefix}.`) ? displayNumber.slice(prefix.length + 1) : null
			: displayNumber;
		if (suffix && /^\d+$/.test(suffix))
			usedNumbers.add(Number(suffix));
	}

	let nextNumber = 1;
	while (usedNumbers.has(nextNumber))
		nextNumber++;
	return prefix ? `${prefix}.${nextNumber}` : String(nextNumber);
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
	contractTypeTitle?: string
	contractTypeFieldKey?: string
	renderAddendumFields?: (basePath: string, index: number) => React.ReactNode
	canAddAddendum?: boolean
	addendumAddBlockedMessage?: React.ReactNode

	contractStartYearPath: Path<TFV>
	contractStartMonthPath: Path<TFV>
	contractEndYearPath: Path<TFV>
	contractEndMonthPath: Path<TFV>
	level?: number
	displayPrefix?: string
	addendaFallback?: unknown[]
	contractRangeFallback?: {
		startYear?: number | null
		startMonth?: number | null
		endYear?: number | null
		endMonth?: number | null
	}
}

export function ContractAddendaSection<TFV extends FieldValues>({
	name,
	title = "الحاقیه‌های قرارداد (اختیاری)",
	contractTypeTitle = "",
	contractTypeFieldKey = "pricing",
	renderAddendumFields,
	canAddAddendum = true,
	addendumAddBlockedMessage,
	contractStartYearPath,
	contractStartMonthPath,
	contractEndYearPath,
	contractEndMonthPath,
	level = 0,
	displayPrefix,
	addendaFallback,
	contractRangeFallback,
}: Props<TFV>) {
	const { control, getValues, setValue, setError, clearErrors, trigger } = useFormContext<TFV>();
	const initialAddendaRef = useRef<unknown[]>((() => {
		const initialValue = getValues(name as unknown as Path<TFV>);
		return Array.isArray(initialValue) ? initialValue : (addendaFallback ?? []);
	})());
	const watchedAddendaValues = useWatch({
		control,
		name: name as unknown as Path<TFV>,
		defaultValue: initialAddendaRef.current as PathValue<TFV, typeof name>,
		disabled: level > 0,
	}) as PathValue<TFV, typeof name> | undefined;
	const addendaValues = level === 0 ? watchedAddendaValues : addendaFallback;
	const stableAddendaRef = useRef<unknown[]>(initialAddendaRef.current);
	const fields = useMemo(() => {
		const watchedRows = Array.isArray(addendaValues) ? addendaValues : stableAddendaRef.current;
		const rowCount = Math.max(watchedRows.length, stableAddendaRef.current.length);
		return Array.from({ length: rowCount }, (_, idx) => {
			const row = watchedRows[idx];
			const stableRow = stableAddendaRef.current[idx];
			if (row == null || typeof row !== "object")
				return stableRow ?? row;
			if (stableRow == null || typeof stableRow !== "object")
				return row;

			const definedWatchedValues = Object.fromEntries(
				Object.entries(row as Record<string, unknown>)
					.filter(([, value]) => value !== undefined),
			);
			return {
				...(stableRow as Record<string, unknown>),
				...definedWatchedValues,
			};
		});
	}, [addendaValues]);
	useEffect(() => {
		stableAddendaRef.current = fields;
	}, [fields]);
	// Date of original contract
	const watchedContractStartYear = useWatch({ control, name: contractStartYearPath, disabled: level > 0 }) as any;
	const watchedContractStartMonth = useWatch({ control, name: contractStartMonthPath, disabled: level > 0 }) as any;
	const watchedContractEndYear = useWatch({ control, name: contractEndYearPath, disabled: level > 0 }) as any;
	const watchedContractEndMonth = useWatch({ control, name: contractEndMonthPath, disabled: level > 0 }) as any;
	const contractStartYear = level === 0 ? watchedContractStartYear : contractRangeFallback?.startYear;
	const contractStartMonth = level === 0 ? watchedContractStartMonth : contractRangeFallback?.startMonth;
	const contractEndYear = level === 0 ? watchedContractEndYear : contractRangeFallback?.endYear;
	const contractEndMonth = level === 0 ? watchedContractEndMonth : contractRangeFallback?.endMonth;

	const contractStartKey = ymToKey(contractStartYear, contractStartMonth);
	const contractEndKey = ymToKey(contractEndYear, contractEndMonth);
	const contractRangeReady = contractStartKey != null && contractEndKey != null && contractStartKey <= contractEndKey;

	const [activeKey, setActiveKey] = useState<string | undefined>(undefined);
	const getAddendumValue = (idx: number, key: string): any => {
		const registeredValue = getValues(p(`${name}.${idx}`, key));
		if (registeredValue !== undefined)
			return registeredValue;

		const watchedAddendum = Array.isArray(addendaValues) ? addendaValues[idx] : undefined;
		if (watchedAddendum != null && typeof watchedAddendum === "object") {
			const watchedValue = (watchedAddendum as Record<string, unknown>)[key];
			if (watchedValue !== undefined)
				return watchedValue;
		}

		return (fields[idx] as Record<string, unknown> | undefined)?.[key];
	};

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

		const sy = getAddendumValue(idx, "startYear") as number | null;
		const sm = getAddendumValue(idx, "startMonth") as number | null;
		const ey = getAddendumValue(idx, "endYear") as number | null;
		const em = getAddendumValue(idx, "endMonth") as number | null;

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

			const osy = getAddendumValue(i, "startYear") as number | null;
			const osm = getAddendumValue(i, "startMonth") as number | null;
			const oey = getAddendumValue(i, "endYear") as number | null;
			const oem = getAddendumValue(i, "endMonth") as number | null;

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
		if (!canAddAddendum) {
			if (addendumAddBlockedMessage)
				message.warning(addendumAddBlockedMessage);
			return;
		}

		// ✅ If the last one is incomplete, do not allow adding
		if (fields.length > 0) {
			const lastIdx = fields.length - 1;
			const base = `${name}.${lastIdx}`;

			const sy = getAddendumValue(lastIdx, "startYear");
			const sm = getAddendumValue(lastIdx, "startMonth");
			const ey = getAddendumValue(lastIdx, "endYear");
			const em = getAddendumValue(lastIdx, "endMonth");

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
		const nextAddendum = structuredClone(defaultAddendumValue);
		nextAddendum.displayAddendumNumber = getNextDisplayNumber(fields, displayPrefix);
		const nextFields = [...fields, nextAddendum];
		stableAddendaRef.current = nextFields;
		setValue(name as unknown as Path<TFV>, nextFields as any, {
			shouldDirty: true,
			shouldTouch: true,
		});
		setActiveKey(String(idx));
	};

	const removeAddendum = (idx: number) => {
		const nextFields = fields.filter((_, fieldIndex) => fieldIndex !== idx);
		stableAddendaRef.current = nextFields;
		setValue(name as unknown as Path<TFV>, nextFields as any, {
			shouldDirty: true,
			shouldTouch: true,
		});
		const next = idx === 0 ? "0" : String(idx - 1);
		setActiveKey(fields.length <= 1 ? undefined : next);
	};

	const addChildAddendum = (idx: number, parentDisplayNumber?: string) => {
		const startKey = ymToKey(
			getAddendumValue(idx, "startYear"),
			getAddendumValue(idx, "startMonth"),
		);
		const endKey = ymToKey(
			getAddendumValue(idx, "endYear"),
			getAddendumValue(idx, "endMonth"),
		);

		if (startKey == null || endKey == null || startKey > endKey) {
			message.warning("ابتدا تاریخ شروع و پایان این الحاقیه را کامل کنید.");
			return;
		}

		const children = getAddendumValue(idx, "children");
		const childItems = Array.isArray(children) ? children : [];
		const nextChild = structuredClone(defaultAddendumValue);
		nextChild.displayAddendumNumber = getNextDisplayNumber(childItems, parentDisplayNumber);
		setValue(
			p(`${name}.${idx}`, "children"),
			[...childItems, nextChild] as any,
			{ shouldDirty: true, shouldTouch: true },
		);
	};

	const treeItems = useMemo(() => {
		return fields.map((f, idx) => {
			const base = `${name}.${idx}`;
			const watchedAddendum = Array.isArray(addendaValues) ? addendaValues[idx] : undefined;
			const definedWatchedValues = watchedAddendum != null && typeof watchedAddendum === "object"
				? Object.fromEntries(
					Object.entries(watchedAddendum as Record<string, unknown>)
						.filter(([, value]) => value !== undefined),
				)
				: {};
			const addendum = {
				...(f as Record<string, unknown>),
				...definedWatchedValues,
			} as Record<string, any>;
			const serverDisplayNumber = readDisplayNumber(addendum);
			const generatedDisplayNumber = addendum.id == null
				? displayPrefix ? `${displayPrefix}.${idx + 1}` : String(idx + 1)
				: null;
			const displayNumber = serverDisplayNumber ?? generatedDisplayNumber;
			const addendumTitle = displayNumber != null && String(displayNumber).trim()
				? `الحاقیه ${displayNumber}`
				: "الحاقیه";

			const sy = addendum.startYear as number | null;
			const sm = addendum.startMonth as number | null;
			const ey = addendum.endYear as number | null;
			const em = addendum.endMonth as number | null;

			const headerHint
				= sy && sm && ey && em ? `(${sy}/${sm} تا ${ey}/${em})` : "(تاریخ‌ها تکمیل نشده)";

			const startMonthOptions
				= contractRangeReady && sy ? monthsInYearOptions(sy, contractStartKey!, contractEndKey!) : MONTH_OPTIONS;

			const endMonthOptions
				= contractRangeReady && ey ? monthsInYearOptions(ey, contractStartKey!, contractEndKey!) : MONTH_OPTIONS;

			return {
				reactKey: String(
					addendum.id
					?? addendum.displayAddendumNumber
					?? addendum.display_addendum_number
					?? `${name}.${idx}`,
				),
				addendum,
				addendumTitle,
				displayNumber,
				hasChildren: Array.isArray(addendum.children) && addendum.children.length > 0,
				collapseItem: {
					key: String(idx),
					label: (
						<div className="flex justify-between items-center w-full gap-3">
							<div className="font-bold">
								{addendumTitle}
								{" "}
								<span className="opacity-75 font-medium">{headerHint}</span>
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
						<Card className="[&_.ant-pro-card-body]:p-0">
							<div className="grid grid-cols-4 gap-3 mt-2">
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

							<div className="mt-3">
								<RHFProText
									name={p(base, "contractNumber")}
									label="شماره قرارداد الحاقیه"
									inputProps={{ placeholder: "مثلاً ADD-1405-01" }}
								/>
							</div>

							<div className="mt-3">
								{renderAddendumFields
									? renderAddendumFields(base, idx)
									: <ContractTypeSection title={contractTypeTitle} name={p(base, contractTypeFieldKey)} />}
							</div>

							<div className="mt-3">
								<RHFProTextArea
									name={p(base, "description")}
									label="توضیح الحاقیه"
									textAreaProps={{ placeholder: "توضیح اختیاری برای این الحاقیه" }}
								/>
							</div>

							<div className="mt-3 flex justify-end">
								<Button
									icon={<PlusOutlined />}
									onClick={() => addChildAddendum(idx, displayNumber ?? undefined)}
									disabled={!canAddAddendum}
								>
									افزودن زیرالحاقیه
								</Button>
							</div>
						</Card>
					),
				},
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
		renderAddendumFields,
		canAddAddendum,
		addendumAddBlockedMessage,
		trigger,
		displayPrefix,
	]);

	const notices = (
		<>
			{!contractRangeReady
				? (
					<div className="opacity-75">برای افزودن الحاقیه، ابتدا تاریخ شروع و پایان قرارداد را انتخاب کنید.</div>
				)
				: null}
			{contractRangeReady && !canAddAddendum && addendumAddBlockedMessage
				? (
					<div className="opacity-75 mt-2">{addendumAddBlockedMessage}</div>
				)
				: null}
		</>
	);

	const tree = treeItems.length === 0
		? null
		: (
			<div className="flex flex-col gap-3">
				{treeItems.map((item, idx) => {
					const itemKey = String(idx);
					return (
						<div key={item.reactKey}>
							<Collapse
								activeKey={activeKey === itemKey ? [itemKey] : []}
								onChange={(key) => {
									const nextKey = Array.isArray(key) ? key[0] : key;
									setActiveKey(nextKey == null ? undefined : String(nextKey));
								}}
								items={[item.collapseItem] as any}
							/>
							{item.hasChildren
								? (
									<div className="relative mt-3 pr-6 before:absolute before:bottom-0 before:right-2 before:top-0 before:border-r before:border-dashed before:border-[var(--ant-color-border)]">
										<ContractAddendaSection<TFV>
											name={p(`${name}.${idx}`, "children")}
											displayPrefix={item.displayNumber ?? undefined}
											addendaFallback={item.addendum.children}
											contractTypeTitle={contractTypeTitle}
											contractTypeFieldKey={contractTypeFieldKey}
											renderAddendumFields={renderAddendumFields}
											canAddAddendum={canAddAddendum}
											addendumAddBlockedMessage={addendumAddBlockedMessage}
											contractStartYearPath={p(`${name}.${idx}`, "startYear")}
											contractStartMonthPath={p(`${name}.${idx}`, "startMonth")}
											contractEndYearPath={p(`${name}.${idx}`, "endYear")}
											contractEndMonthPath={p(`${name}.${idx}`, "endMonth")}
											contractRangeFallback={{
												startYear: item.addendum.startYear,
												startMonth: item.addendum.startMonth,
												endYear: item.addendum.endYear,
												endMonth: item.addendum.endMonth,
											}}
											level={level + 1}
										/>
									</div>
								)
								: null}
						</div>
					);
				})}
			</div>
		);

	if (level > 0) {
		return tree;
	}

	return (
		<Card
			bordered
			className="rounded-md mt-3"
			title={title}
			extra={(
				<Button icon={<PlusOutlined />} onClick={addAddendum} disabled={!contractRangeReady || !canAddAddendum}>
					افزودن الحاقیه
				</Button>
			)}
		>
			{notices}
			{tree}
		</Card>
	);
}
