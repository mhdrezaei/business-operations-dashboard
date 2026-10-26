import type { ArrayPath, FieldValues, Path, PathValue } from "react-hook-form";
import { DashedCard } from "#src/shared/ui/dashed-card";
import { RHFProText, RHFProTextArea, RHFSelect } from "#src/shared/ui/rhf-pro";
import { SectionCard, SectionToneContext } from "#src/shared/ui/section-card";

import { message, toPersianDigits } from "#src/utils";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Collapse } from "antd";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { MONTH_OPTIONS, YEAR_OPTIONS } from "../../constant/jalali-date-options";
import { CONTRACT_NUMBER_MAX_LENGTH } from "../../shared/model/contract-number";
import { ContractDataCopyButton } from "../../shared/ui/form/ContractDataCopyButton";
import { ContractTypeSection } from "../contract-type/ContractTypeSection";
import {
	buildAllowedStartMonths,
	buildDefaultAddendumPeriod,
	getAddendumEndMonths,
	periodKey,
	toAddendumRange,
	validateAddendaPeriods,
} from "./addenda.periods";
import { defaultAddendumValue } from "./addenda.types";

const p = (base: string, path: string) => `${base}.${path}` as any;

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
	/** حداکثر عمق درخت الحاقیه‌ها (۱ = بدون زیرالحاقیه)؛ پیش‌فرض نامحدود. */
	maxDepth?: number

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
	title,
	contractTypeTitle = "",
	contractTypeFieldKey = "pricing",
	renderAddendumFields,
	canAddAddendum = true,
	addendumAddBlockedMessage,
	maxDepth,
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
	const { t } = useTranslation();
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

	const contractStartKey = periodKey(contractStartYear, contractStartMonth);
	const contractEndKey = periodKey(contractEndYear, contractEndMonth);
	const contractRange = useMemo(
		() => toAddendumRange({ startYear: contractStartYear, startMonth: contractStartMonth, endYear: contractEndYear, endMonth: contractEndMonth }),
		[contractStartYear, contractStartMonth, contractEndYear, contractEndMonth],
	);
	const contractRangeReady = contractStartKey != null && contractEndKey != null && contractStartKey <= contractEndKey;
	// شروع هر الحاقیه نسبت به والدش سنجیده می‌شود (ریشه: بازه قرارداد اصلی)
	const availableMonthsByYear = useMemo(
		() => buildAllowedStartMonths(contractRangeReady ? contractRange : null),
		[contractRangeReady, contractRange],
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

		// Don't show anything until it's complete.
		if (periodKey(sy, sm) == null || periodKey(ey, em) == null) {
			clearErrors(p(base, "startYear"));
			return false;
		}

		const rows = fields.map((_, index) => ({
			startYear: getAddendumValue(index, "startYear"),
			startMonth: getAddendumValue(index, "startMonth"),
			endYear: getAddendumValue(index, "endYear"),
			endMonth: getAddendumValue(index, "endMonth"),
		}));
		const issue = validateAddendaPeriods(rows, contractRange, [])
			.find(item => item.path[0] === idx);
		if (issue) {
			setError(p(base, "startYear"), { type: "custom", message: t(`contract.addenda.period.${issue.code}`) } as any);
			return false;
		}

		clearErrors(p(base, "startYear"));
		return true;
	};

	const addAddendum = async () => {
		if (!contractRangeReady) {
			message.warning(t("contract.addenda.selectContractDates"));
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

			if (periodKey(sy, sm) == null || periodKey(ey, em) == null) {
				message.warning(t("contract.addenda.completePrevious"));
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
		Object.assign(nextAddendum, buildDefaultAddendumPeriod(
			contractRange!,
			fields[fields.length - 1] as Record<string, unknown> | undefined,
		));
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
		const startKey = periodKey(
			getAddendumValue(idx, "startYear"),
			getAddendumValue(idx, "startMonth"),
		);
		const endKey = periodKey(
			getAddendumValue(idx, "endYear"),
			getAddendumValue(idx, "endMonth"),
		);

		if (startKey == null || endKey == null || startKey > endKey) {
			message.warning(t("contract.addenda.completeThis"));
			return;
		}

		const children = getAddendumValue(idx, "children");
		const childItems = Array.isArray(children) ? children : [];
		const nextChild = structuredClone(defaultAddendumValue);
		nextChild.displayAddendumNumber = getNextDisplayNumber(childItems, parentDisplayNumber);
		Object.assign(nextChild, buildDefaultAddendumPeriod(
			toAddendumRange({
				startYear: getAddendumValue(idx, "startYear"),
				startMonth: getAddendumValue(idx, "startMonth"),
				endYear: getAddendumValue(idx, "endYear"),
				endMonth: getAddendumValue(idx, "endMonth"),
			})!,
			childItems[childItems.length - 1] as Record<string, unknown> | undefined,
		));
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

			const headerHint = sy && sm && ey && em ? t("contract.addenda.rangeHint", { startYear: sy, startMonth: sm, endYear: ey, endMonth: em }) : null;
			const startMonthOptions = sy
				? (MONTH_OPTIONS as any[]).filter(option => availableMonthsByYear.get(Number(sy))?.includes(Number(option.value)))
				: [];

			const endYearOptions = sy ? (YEAR_OPTIONS as any[]).filter(option => option.value >= Number(sy)) : [];
			const endMonthOptions = (MONTH_OPTIONS as any[]).filter(option => getAddendumEndMonths(ey, sy, sm).includes(option.value));

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
								{t("contract.addenda.removeAddendum")}
							</Button>
						</div>
					),
					children: (
						<div className="contract-addenda-content">
							<div className="grid grid-cols-4 gap-3 mt-2">
								<RHFSelect
									name={p(base, "startYear")}
									label={t("contract.addenda.startYear")}
									options={allowedYears as any}
									selectProps={{ placeholder: t("contract.placeholder.year"), allowClear: true }}
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
									label={t("contract.addenda.startMonth")}
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
										placeholder: t("contract.placeholder.month"),
										allowClear: true,
									}}
								/>

								<RHFSelect
									name={p(base, "endYear")}
									label={t("contract.addenda.endYear")}
									options={endYearOptions as any}
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
										placeholder: t("contract.placeholder.year"),
										allowClear: true,
									}}
								/>

								<RHFSelect
									name={p(base, "endMonth")}
									label={t("contract.addenda.endMonth")}
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
										placeholder: t("contract.placeholder.month"),
										allowClear: true,
									}}
								/>
							</div>

							<div className="mt-3">
								<RHFProText
									name={p(base, "contractNumber")}
									label={t("contract.addenda.contractNumber")}
									transformValue={toPersianDigits}
									inputProps={{ placeholder: t("contract.addenda.contractNumberPlaceholder"), maxLength: CONTRACT_NUMBER_MAX_LENGTH }}
								/>
							</div>

							<div className="mt-3">
								<ContractDataCopyButton targetPath={base} />
							</div>

							<div className="mt-3">
								{renderAddendumFields
									? renderAddendumFields(base, idx)
									: <ContractTypeSection title={contractTypeTitle} name={p(base, contractTypeFieldKey)} />}
							</div>

							<div className="mt-3">
								<RHFProTextArea
									name={p(base, "description")}
									label={t("contract.addenda.description")}
									textAreaProps={{ placeholder: t("contract.addenda.descriptionPlaceholder") }}
								/>
							</div>

							{maxDepth == null || level + 1 < maxDepth
								? (
									<div className="mt-3 flex justify-end">
										<Button
											className="contract-dashed-action"
											icon={<PlusOutlined />}
											onClick={() => addChildAddendum(idx, displayNumber ?? undefined)}
											disabled={!canAddAddendum}
										>
											{t("contract.addenda.addSubAddendum")}
										</Button>
									</div>
								)
								: null}
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
		maxDepth,
		level,
		trigger,
		displayPrefix,
	]);

	const notices = (
		<>
			{!contractRangeReady
				? (
					<div className="opacity-75">{t("contract.addenda.selectDatesHint")}</div>
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
											maxDepth={maxDepth}
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

	if (level > 0)
		return <SectionToneContext.Provider value="addenda">{tree}</SectionToneContext.Provider>;

	return (
		<SectionToneContext.Provider value="addenda">
			<SectionCard
				title={title ?? t("contract.addenda.title")}
				tone="addenda"
				className="contract-addenda-section mt-3"
				extra={(
					<Button className="contract-dashed-action" icon={<PlusOutlined />} onClick={addAddendum} disabled={!contractRangeReady || !canAddAddendum}>
						{t("contract.addenda.add")}
					</Button>
				)}
			>
				{notices}
				{tree}
			</SectionCard>
		</SectionToneContext.Provider>
	);
}
