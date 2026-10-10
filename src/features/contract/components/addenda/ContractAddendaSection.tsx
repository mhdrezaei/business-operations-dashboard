import type { ArrayPath, FieldValues, Path, PathValue } from "react-hook-form";
import type { AddendaMonthsByYear } from "./addenda.gaps";
import { DashedCard } from "#src/shared/ui/dashed-card";
import { RHFProText, RHFProTextArea, RHFSelect } from "#src/shared/ui/rhf-pro";
import { SectionCard, SectionToneContext } from "#src/shared/ui/section-card";

import { message } from "#src/utils";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Button, Collapse } from "antd";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { MONTH_OPTIONS, YEAR_OPTIONS } from "../../constant/jalali-date-options";
import { contractGapsQuery } from "../../shared/queries/contract.queries";
import { ContractTypeSection } from "../contract-type/ContractTypeSection";
import {
	buildAddendaMonthsByYear,
	isAvailableAddendaMonth,
} from "./addenda.gaps";
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
	availableMonthsFallback?: AddendaMonthsByYear
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
	availableMonthsFallback,
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
	const watchedServiceId = useWatch({ control, name: "serviceId" as Path<TFV>, disabled: level > 0 }) as number | null | undefined;
	const watchedCompanyId = useWatch({ control, name: "companyId" as Path<TFV>, disabled: level > 0 }) as number | null | undefined;
	const watchedCompanyType = useWatch({ control, name: "companyType" as Path<TFV>, disabled: level > 0 }) as string | null | undefined;
	const contractGaps = useQuery(contractGapsQuery({
		serviceId: level === 0 ? watchedServiceId : null,
		companyId: level === 0 ? watchedCompanyId : null,
		companyType: level === 0 ? watchedCompanyType : null,
	}));
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
	const availableMonthsByYear = useMemo(
		() => level === 0
			? buildAddendaMonthsByYear(
				contractGaps.data?.missing_months_by_year,
				contractRangeReady
					? {
						startYear: Number(contractStartYear),
						startMonth: Number(contractStartMonth),
						endYear: Number(contractEndYear),
						endMonth: Number(contractEndMonth),
					}
					: null,
			)
			: (availableMonthsFallback ?? new Map()),
		[
			level,
			contractGaps.data?.missing_months_by_year,
			contractRangeReady,
			contractStartYear,
			contractStartMonth,
			contractEndYear,
			contractEndMonth,
			availableMonthsFallback,
		],
	);

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

	// Every addendum at every depth gets the same gaps options as the original contract.
	const allowedYears = useMemo(() => {
		const years = new Set(availableMonthsByYear.keys());
		return (YEAR_OPTIONS as any[]).filter(o => years.has(Number(o.value)));
	}, [availableMonthsByYear]);

	// ✅ Instant check for overlap and within range (we throw an error on the same startYear field)
	const validateAddendumRangeNow = (idx: number) => {
		if (!contractRangeReady)
			return false;

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
			return false;
		}

		// invalid
		if (sKey > eKey) {
			setError(p(base, "startYear"), { type: "custom", message: "بازه تاریخ الحاقیه نامعتبر است" } as any);
			return false;
		}

		if (
			!isAvailableAddendaMonth(availableMonthsByYear, Number(sy), Number(sm))
			|| !isAvailableAddendaMonth(availableMonthsByYear, Number(ey), Number(em))
		) {
			setError(p(base, "startYear"), { type: "custom", message: "تاریخ شروع و پایان الحاقیه باید در بازه‌های مجاز API gaps باشد" } as any);
			return false;
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
				return false;
			}
		}

		// If everything was OK
		clearErrors(p(base, "startYear"));
		return true;
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
			const fieldsAreValid = await trigger([p(base, "startYear") as any]);
			const rangeIsValid = validateAddendumRangeNow(lastIdx);
			if (!fieldsAreValid || !rangeIsValid) {
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
				? String(displayNumber)
				: String(idx + 1);

			const sy = addendum.startYear as number | null;
			const sm = addendum.startMonth as number | null;
			const ey = addendum.endYear as number | null;
			const em = addendum.endMonth as number | null;

			const headerHint = sy && sm && ey && em ? `(${sy}/${sm} تا ${ey}/${em})` : null;
			const startMonthOptions = sy
				? (MONTH_OPTIONS as any[]).filter(option => availableMonthsByYear.get(Number(sy))?.includes(Number(option.value)))
				: [];

			const endMonthOptions = ey
				? (MONTH_OPTIONS as any[]).filter(option => availableMonthsByYear.get(Number(ey))?.includes(Number(option.value)))
				: [];

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
							<div className="flex items-center gap-[10px] font-bold">
								<span className="contract-addenda-item-badge">{addendumTitle}</span>
								{headerHint ? <span className="opacity-75 font-medium">{headerHint}</span> : null}
							</div>

							<Button
								danger
								size="small"
								className="contract-dashed-action"
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
						<div className="contract-addenda-content">
							<div className="grid grid-cols-4 gap-3 mt-2">
								<RHFSelect
									name={p(base, "startYear")}
									label="سال شروع الحاقیه"
									options={allowedYears as any}
									selectProps={{ placeholder: "سال", allowClear: true }}
									onValueChange={async () => {
										await trigger([
											p(base, "startYear") as any,
											p(base, "startMonth") as any,
											p(base, "endYear") as any,
											p(base, "endMonth") as any,
										]);
										validateAddendumRangeNow(idx);
									}}
								/>

								<RHFSelect
									name={p(base, "startMonth")}
									label="ماه شروع"
									options={startMonthOptions as any}
									onValueChange={async () => {
										await trigger([
											p(base, "startYear") as any,
											p(base, "startMonth") as any,
											p(base, "endYear") as any,
											p(base, "endMonth") as any,
										]);
										validateAddendumRangeNow(idx);
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
										await trigger([
											p(base, "startYear") as any,
											p(base, "startMonth") as any,
											p(base, "endYear") as any,
											p(base, "endMonth") as any,
										]);
										validateAddendumRangeNow(idx);
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
										await trigger([
											p(base, "startYear") as any,
											p(base, "startMonth") as any,
											p(base, "endYear") as any,
											p(base, "endMonth") as any,
										]);
										validateAddendumRangeNow(idx);
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
									className="contract-dashed-action"
									icon={<PlusOutlined />}
									onClick={() => addChildAddendum(idx, displayNumber ?? undefined)}
									disabled={!canAddAddendum}
								>
									افزودن زیرالحاقیه
								</Button>
							</div>
						</div>
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
		availableMonthsByYear,
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
			<div className="flex flex-col gap-6">
				{treeItems.map((item, idx) => {
					const itemKey = String(idx);
					return (
						<div key={item.reactKey}>
							<DashedCard className="contract-addenda-item">
								<Collapse
									className="contract-addenda-collapse"
									activeKey={activeKey === itemKey ? [itemKey] : []}
									onChange={(key) => {
										const nextKey = Array.isArray(key) ? key[0] : key;
										setActiveKey(nextKey == null ? undefined : String(nextKey));
									}}
									items={[item.collapseItem] as any}
								/>
							</DashedCard>
							{item.hasChildren
								? (
									<div className="contract-addenda-tree-branch relative mt-6 pr-6">
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
												startYear: contractStartYear,
												startMonth: contractStartMonth,
												endYear: contractEndYear,
												endMonth: contractEndMonth,
											}}
											availableMonthsFallback={availableMonthsByYear}
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

	if (level > 0)
		return <SectionToneContext.Provider value="addenda">{tree}</SectionToneContext.Provider>;

	return (
		<SectionToneContext.Provider value="addenda">
			<SectionCard
				title={title}
				tone="addenda"
				className="contract-addenda-section mt-3"
				extra={(
					<Button className="contract-dashed-action" icon={<PlusOutlined />} onClick={addAddendum} disabled={!contractRangeReady || !canAddAddendum}>
						افزودن الحاقیه
					</Button>
				)}
			>
				{notices}
				{tree}
			</SectionCard>
		</SectionToneContext.Provider>
	);
}
