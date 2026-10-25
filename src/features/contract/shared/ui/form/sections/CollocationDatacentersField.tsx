import type { ContractFormValues } from "../../../model/contract.form.types";
import { AlignedFormField } from "#src/shared/ui/aligned-form-field";
import { RHFProNumber, RHFSelect } from "#src/shared/ui/rhf-pro";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, Tooltip } from "antd";
import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useMemo } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { trafficDatacentersQuery } from "../../../queries/contract.queries";
import { BEHESHTI_DATACENTER_TAG, COLLOCATION_RACK_TYPES } from "../../../services/traffic/traffic.collocation";

const compactFormItemStyle = { className: "mb-0" };

interface CollocationStepPaneProps {
	active: boolean
	children: React.ReactNode
}

interface CollocationRackDiscountTierTableProps {
	name: string
	active: boolean
}

export function CollocationStepPane({ active, children }: CollocationStepPaneProps) {
	return (
		<motion.div
			initial={false}
			animate={active
				? {
					opacity: 1,
					y: 0,
					height: "auto",
					visibility: "visible",
				}
				: {
					opacity: 0,
					y: 10,
					height: 0,
					transitionEnd: { visibility: "hidden" },
				}}
			transition={{ duration: 0.22, ease: "easeOut" }}
			style={{
				overflow: "hidden",
				pointerEvents: active ? "auto" : "none",
			}}
			aria-hidden={!active}
		>
			{children}
		</motion.div>
	);
}

function CollocationRackDiscountTierTable({ name, active }: CollocationRackDiscountTierTableProps) {
	const { t } = useTranslation();
	const { control, setValue } = useFormContext<ContractFormValues>();
	const { fields, append, remove } = useFieldArray({ control, name: name as any });
	const rows = useWatch({ control, name: name as any }) as Array<{ from: number | null, to: number | null, discountPercent: number | null }> | undefined;

	useEffect(() => {
		if (!active || (rows && rows.length > 0))
			return;

		append({ from: null, to: null, discountPercent: null } as any);
	}, [active, rows, append]);

	useEffect(() => {
		if (!rows || rows.length < 2)
			return;

		for (let index = 1; index < rows.length; index++) {
			const previousTo = rows[index - 1]?.to ?? null;
			const currentFrom = rows[index]?.from ?? null;
			if (currentFrom !== previousTo) {
				setValue(`${name}.${index}.from` as any, previousTo as any, {
					shouldDirty: true,
					shouldValidate: true,
				});
			}
		}
	}, [rows, name, setValue]);

	function handleAddRow() {
		const previousTo = rows && rows.length > 0 ? rows[rows.length - 1]?.to ?? null : null;
		append({ from: previousTo, to: null, discountPercent: null } as any);
	}

	return (
		<div className="mt-5">
			<div className="mb-3 text-right text-base font-semibold">{t("contract.collocation.rackDiscountTiers")}</div>
			<Card variant="outlined" className="rounded-xl [&_.ant-pro-card-body]:p-3">
				<div className="overflow-hidden">
					<div className="grid grid-cols-[1fr_1fr_1fr_64px]">
						<div className="p-3 text-center font-semibold">{t("contract.collocation.firstRange")}</div>
						<div className="p-3 text-center font-semibold">{t("contract.collocation.secondRange")}</div>
						<div className="p-3 text-center font-semibold">{t("contract.collocation.discountPercent")}</div>
						<div />
					</div>

					{fields.map((field, index) => (
						<div
							key={field.id}
							className="grid grid-cols-[1fr_1fr_1fr_64px] border-t border-t-[rgba(255,255,255,0.08)]"
						>
							<div className="p-3">
								<RHFProNumber<ContractFormValues, any>
									name={`${name}.${index}.from` as any}
									label=""
									enableGrouping
									inputProps={{
										placeholder: t("contract.collocation.from"),
										inputMode: "numeric",
										disabled: index > 0,
									} as any}
									formItemProps={{ className: "mb-0" }}
								/>
							</div>

							<div className="p-3">
								<RHFProNumber<ContractFormValues, any>
									name={`${name}.${index}.to` as any}
									label=""
									enableGrouping
									inputProps={{ placeholder: t("contract.collocation.to"), inputMode: "numeric" } as any}
									formItemProps={{ className: "mb-0" }}
								/>
							</div>

							<div className="p-3">
								<RHFProNumber<ContractFormValues, any>
									name={`${name}.${index}.discountPercent` as any}
									label=""
									inputProps={{ placeholder: t("contract.collocation.percent"), inputMode: "decimal" } as any}
									formItemProps={{ className: "mb-0" }}
								/>
							</div>

							<div className="flex items-center justify-center p-3">
								<Tooltip title={t("contract.collocation.removeRow")}>
									<Button
										type="text"
										danger
										icon={<DeleteOutlined />}
										onClick={() => remove(index)}
									/>
								</Tooltip>
							</div>
						</div>
					))}

					<div className="p-3">
						<Tooltip title={t("contract.collocation.nextRangeAuto")}>
							<Button icon={<PlusOutlined />} onClick={handleAddRow}>
								{t("contract.collocation.addRow")}
							</Button>
						</Tooltip>
					</div>
				</div>
			</Card>
		</div>
	);
}

interface CollocationDatacentersFieldProps {
	/** مسیر آرایه دیتاسنترها (قرارداد اصلی: serviceFields.datacenters، الحاقیه: `${base}.datacenters`) */
	name: string
	/** مسیر مقدار موقت انتخاب‌گر دیتاسنتر */
	selectName: string
	partnerType: string | null | undefined
}

/** ویرایشگر دیتاسنترها (نرخ‌ها، آیتم‌های پورت/رک، آمپر، پلکان تخفیف CP) برای قرارداد کولوکیشن شرکای تجاری و الحاقیه‌های آن. */
export function CollocationDatacentersField({ name, selectName, partnerType }: CollocationDatacentersFieldProps) {
	const { control, setValue, setFocus } = useFormContext<ContractFormValues>();
	const { t } = useTranslation();
	const datacentersQuery = useQuery(trafficDatacentersQuery(true));
	const rackTypeOptions = useMemo(() => COLLOCATION_RACK_TYPES.map(type => ({ label: t(`contract.collocation.rackTypes.${type}`), value: type })), [t]);
	const datacenters = useWatch({ control, name: name as any }) as Array<Record<string, any>> | undefined;

	const trafficDatacenterOptions = useMemo(() => {
		const raw = datacentersQuery.data;
		const list = Array.isArray(raw) ? raw : raw?.results ?? [];

		return list
			.map((item: any) => {
				const value = item?.id ?? item?.value ?? item?.code ?? item?.name;
				if (value == null)
					return null;

				return {
					label: String(item?.name ?? item?.title ?? item?.code ?? value),
					value: String(value),
					systemTag: typeof item?.system_tag === "string" ? item.system_tag : null,
				};
			})
			.filter((item): item is { label: string, value: string, systemTag: string | null } => Boolean(item));
	}, [datacentersQuery.data]);
	const selectedDatacenterValues = useMemo(
		() => new Set((datacenters ?? []).map(item => String(item?.datacenter ?? "")).filter(Boolean)),
		[datacenters],
	);
	const availableTrafficDatacenterOptions = useMemo(
		() => trafficDatacenterOptions.filter(option => !selectedDatacenterValues.has(String(option.value))),
		[trafficDatacenterOptions, selectedDatacenterValues],
	);

	function addDatacenter(value: string | null) {
		if (!value)
			return;
		const current = Array.isArray(datacenters) ? datacenters : [];
		if (current.some(item => String(item?.datacenter) === String(value)))
			return;
		const selectedOption = trafficDatacenterOptions.find(option => String(option.value) === String(value));
		const nextIndex = current.length;

		setValue(name as any, [
			...current,
			{
				rowKey: crypto.randomUUID(),
				datacenter: value,
				datacenterSystemTag: selectedOption?.systemTag ?? null,
				portItems: [{ rowKey: crypto.randomUUID(), count: null, speed: null, unitPrice: null }],
				rackItems: [{ rowKey: crypto.randomUUID(), rackType: null, count: null, unitPrice: null }],
			},
		], {
			shouldDirty: true,
			shouldValidate: false,
		});
		setValue(selectName as any, null, { shouldDirty: true, shouldValidate: false });
		window.setTimeout(() => {
			setFocus(`${name}.${nextIndex}.bandwidthUnitRate` as any);
		}, 0);
	}

	function removeDatacenter(index: number) {
		const current = Array.isArray(datacenters) ? datacenters : [];
		setValue(name as any, current.filter((_, idx) => idx !== index), {
			shouldDirty: true,
			shouldValidate: true,
		});
	}

	function addDatacenterPortItem(datacenterIndex: number) {
		const current = Array.isArray(datacenters) ? [...datacenters] : [];
		const item = current[datacenterIndex] ?? {};
		const portItems = Array.isArray(item.portItems) ? item.portItems : [];
		current[datacenterIndex] = {
			...item,
			portItems: [...portItems, { rowKey: crypto.randomUUID(), count: null, speed: null, unitPrice: null }],
		};
		setValue(name as any, current, {
			shouldDirty: true,
			shouldValidate: false,
		});
	}

	function removeDatacenterPortItem(datacenterIndex: number, itemIndex: number) {
		const current = Array.isArray(datacenters) ? [...datacenters] : [];
		const item = current[datacenterIndex] ?? {};
		const portItems = Array.isArray(item.portItems) ? item.portItems : [];
		current[datacenterIndex] = {
			...item,
			portItems: portItems.filter((_, idx) => idx !== itemIndex),
		};
		setValue(name as any, current, {
			shouldDirty: true,
			shouldValidate: true,
		});
	}

	function addDatacenterRackItem(datacenterIndex: number) {
		const current = Array.isArray(datacenters) ? [...datacenters] : [];
		const item = current[datacenterIndex] ?? {};
		const rackItems = Array.isArray(item.rackItems) ? item.rackItems : [];
		current[datacenterIndex] = {
			...item,
			rackItems: [...rackItems, { rowKey: crypto.randomUUID(), rackType: null, count: null, unitPrice: null }],
		};
		setValue(name as any, current, {
			shouldDirty: true,
			shouldValidate: false,
		});
	}

	function removeDatacenterRackItem(datacenterIndex: number, itemIndex: number) {
		const current = Array.isArray(datacenters) ? [...datacenters] : [];
		const item = current[datacenterIndex] ?? {};
		const rackItems = Array.isArray(item.rackItems) ? item.rackItems : [];
		current[datacenterIndex] = {
			...item,
			rackItems: rackItems.filter((_, idx) => idx !== itemIndex),
		};
		setValue(name as any, current, {
			shouldDirty: true,
			shouldValidate: true,
		});
	}

	return (
		<div className="flex flex-col gap-5">
			<AnimatePresence initial={false}>
				{(datacenters ?? []).map((datacenterItem, datacenterIndex) => {
					const datacenterValue = String(datacenterItem?.datacenter ?? "");
					const selectedDatacenterOption = trafficDatacenterOptions.find(option => option.value === datacenterValue);
					const datacenterLabel = selectedDatacenterOption?.label ?? t("contract.collocation.selectedDatacenter");
					const shouldShowRackDiscountTiers = partnerType === "CP" && selectedDatacenterOption?.systemTag === BEHESHTI_DATACENTER_TAG;
					const portItems = Array.isArray(datacenterItem?.portItems) && datacenterItem.portItems.length > 0
						? datacenterItem.portItems
						: [{ rowKey: "initial-port", count: null, speed: null, unitPrice: null }];
					const rackItems = Array.isArray(datacenterItem?.rackItems) && datacenterItem.rackItems.length > 0
						? datacenterItem.rackItems
						: [{ rowKey: "initial-rack", rackType: null, count: null, unitPrice: null }];

					return (
						<motion.div
							key={String(datacenterItem?.rowKey ?? datacenterValue)}
							initial={{ opacity: 0, y: 12, scale: 0.99 }}
							animate={{ opacity: 1, y: 0, scale: 1 }}
							exit={{ opacity: 0, y: -8, scale: 0.99 }}
							transition={{ duration: 0.24, ease: "easeOut" }}
						>
							<Card bordered className="rounded-xl">
								<div className="mb-4 flex items-center justify-between gap-3">
									<div className="text-right">
										<div className="text-base font-semibold">
											{datacenterLabel}
										</div>
										<div className="text-sm text-[var(--ant-color-text-secondary)]">{t("contract.collocation.closeDetails")}</div>
									</div>
									<Button
										danger
										onClick={() => removeDatacenter(datacenterIndex)}
									>
										{t("common.delete")}
									</Button>
								</div>

								<div className="grid gap-4 md:grid-cols-2">
									<RHFProNumber<ContractFormValues, any>
										name={`${name}.${datacenterIndex}.bandwidthUnitRate` as any}
										label={t("contract.collocation.bandwidthRate")}
										formItemProps={compactFormItemStyle}
										enableGrouping
										enableWordsTooltip
									/>
									<RHFProNumber<ContractFormValues, any>
										name={`${name}.${datacenterIndex}.ipRate` as any}
										label={t("contract.collocation.ipRate")}
										formItemProps={compactFormItemStyle}
										enableGrouping
										enableWordsTooltip
									/>
								</div>

								<div className="mt-5">
									<div className="mb-3 text-right text-base font-semibold">{t("contract.collocation.portItems")}</div>
									<div className="flex flex-col gap-3">
										{portItems.map((item: any, idx: number) => (
											<Card key={String(item?.rowKey ?? `port-${item?.count ?? "empty"}-${item?.speed ?? "empty"}-${item?.unitPrice ?? "empty"}`)} bordered className="rounded-xl">
												<div className="mb-3 flex items-center justify-between gap-3">
													<div className="text-right">
														{t("contract.collocation.item")}
														{" "}
														{idx + 1}
													</div>
													<Button danger disabled={portItems.length <= 1} onClick={() => removeDatacenterPortItem(datacenterIndex, idx)}>
														{t("common.delete")}
													</Button>
												</div>
												<div className="grid gap-4 md:grid-cols-3">
													<RHFProNumber<ContractFormValues, any>
														name={`${name}.${datacenterIndex}.portItems.${idx}.unitPrice` as any}
														label={t("contract.collocation.unitPrice")}
														formItemProps={compactFormItemStyle}
														enableGrouping
														enableWordsTooltip
													/>
													<RHFProNumber<ContractFormValues, any>
														name={`${name}.${datacenterIndex}.portItems.${idx}.speed` as any}
														label={t("contract.collocation.speed")}
														formItemProps={compactFormItemStyle}
														enableGrouping
													/>
													<RHFProNumber<ContractFormValues, any>
														name={`${name}.${datacenterIndex}.portItems.${idx}.count` as any}
														label={t("contract.collocation.count")}
														formItemProps={compactFormItemStyle}
														enableGrouping
													/>
												</div>
											</Card>
										))}
									</div>
									<div className="mt-3 flex justify-end">
										<Button onClick={() => addDatacenterPortItem(datacenterIndex)}>{t("contract.collocation.addItem")}</Button>
									</div>
								</div>

								<div className="mt-5">
									<div className="mb-3 text-right text-base font-semibold">{t("contract.collocation.rackItems")}</div>
									<div className="flex flex-col gap-3">
										{rackItems.map((item: any, idx: number) => (
											<Card key={String(item?.rowKey ?? `rack-${item?.rackType ?? "empty"}-${item?.count ?? "empty"}-${item?.unitPrice ?? "empty"}`)} bordered className="rounded-xl">
												<div className="mb-3 flex items-center justify-between gap-3">
													<div className="text-right">
														{t("contract.collocation.item")}
														{" "}
														{idx + 1}
													</div>
													<Button danger disabled={rackItems.length <= 1} onClick={() => removeDatacenterRackItem(datacenterIndex, idx)}>
														{t("common.delete")}
													</Button>
												</div>
												<div className="grid gap-4 md:grid-cols-3">
													<RHFProNumber<ContractFormValues, any>
														name={`${name}.${datacenterIndex}.rackItems.${idx}.unitPrice` as any}
														label={t("contract.collocation.unitPrice")}
														formItemProps={compactFormItemStyle}
														enableGrouping
														enableWordsTooltip
													/>
													<RHFProNumber<ContractFormValues, any>
														name={`${name}.${datacenterIndex}.rackItems.${idx}.count` as any}
														label={t("contract.collocation.count")}
														formItemProps={compactFormItemStyle}
														enableGrouping
													/>
													<RHFSelect<ContractFormValues, any, string | null>
														name={`${name}.${datacenterIndex}.rackItems.${idx}.rackType` as any}
														label={t("contract.collocation.rackType")}
														formItemProps={compactFormItemStyle}
														options={rackTypeOptions}
														selectProps={{ allowClear: true, placeholder: t("contract.placeholder.select") }}
													/>
												</div>
											</Card>
										))}
									</div>
									<div className="mt-3 flex justify-end">
										<Button onClick={() => addDatacenterRackItem(datacenterIndex)}>{t("contract.collocation.addItem")}</Button>
									</div>
								</div>

								<div className="mt-5 grid gap-4 md:grid-cols-2">
									<RHFProNumber<ContractFormValues, any>
										name={`${name}.${datacenterIndex}.electricityAmpRate` as any}
										label={t("contract.collocation.ampRate")}
										formItemProps={compactFormItemStyle}
										enableGrouping
										enableWordsTooltip
									/>
									<RHFProNumber<ContractFormValues, any>
										name={`${name}.${datacenterIndex}.electricityExemptionThreshold` as any}
										label={t("contract.collocation.ampThreshold")}
										formItemProps={compactFormItemStyle}
										enableGrouping
									/>
								</div>

								<CollocationStepPane active={shouldShowRackDiscountTiers}>
									<CollocationRackDiscountTierTable
										name={`${name}.${datacenterIndex}.rackDiscountTiers`}
										active={shouldShowRackDiscountTiers}
									/>
								</CollocationStepPane>
							</Card>
						</motion.div>
					);
				})}
			</AnimatePresence>

			<AlignedFormField label={t("contract.collocation.selectDatacenterLabel")} labelId="contract-form-label-datacenter">
				<RHFSelect<ContractFormValues, any, string | null>
					name={selectName as any}
					formItemProps={compactFormItemStyle}
					loading={datacentersQuery.isLoading || datacentersQuery.isFetching}
					options={availableTrafficDatacenterOptions}
					onValueChange={value => addDatacenter(value)}
					selectProps={{
						"allowClear": true,
						"placeholder": datacentersQuery.isLoading || datacentersQuery.isFetching
							? t("contract.collocation.datacentersLoading")
							: availableTrafficDatacenterOptions.length > 0
								? t("contract.collocation.selectDatacenter")
								: t("contract.collocation.noDatacentersLeft"),
						"disabled": datacentersQuery.isLoading || datacentersQuery.isFetching || availableTrafficDatacenterOptions.length === 0,
						"aria-labelledby": "contract-form-label-datacenter",
					} as any}
				/>
			</AlignedFormField>
		</div>
	);
}
