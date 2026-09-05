import { RHFProNumber } from "#src/shared/ui/rhf-pro";
import { DeleteOutlined, PlusOutlined, QuestionCircleOutlined } from "@ant-design/icons";
import { Button, Card, Tooltip } from "antd";
import React, { useEffect, useMemo, useState } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";

interface Props {
	name: string
	currencyAddon?: React.ReactNode
	variant?: "card" | "embedded"
	showRatePercentage?: boolean
	ratePercentageHelpText?: React.ReactNode
}

interface TierToFieldProps {
	name: string
	showHint: boolean
}

function TierToField({ name, showHint }: TierToFieldProps): React.JSX.Element {
	const [open, setOpen] = useState(showHint);

	useEffect(() => {
		setOpen(showHint);
	}, [showHint]);

	function handleCloseHint() {
		setOpen(false);
	}

	return (
		<Tooltip
			open={open}
			trigger={[]}
			placement="bottomRight"
			destroyTooltipOnHide
			title={(
				<button
					type="button"
					onClick={handleCloseHint}
					className="cursor-pointer border-0 bg-transparent p-0 text-right font-inherit leading-[1.6] text-inherit"
				>
					اگر این فیلد خالی بماند، بازه بدون محدودیت در نظر گرفته می‌شود.
				</button>
			)}
		>
			<div>
				<RHFProNumber
					name={name as any}
					label=""
					enableGrouping
					enableWordsTooltip
					inputProps={{ placeholder: "تا", inputMode: "numeric" } as any}
					formItemProps={{ className: "mb-0" }}
				/>
			</div>
		</Tooltip>
	);
}

export function ContractTierTable({ name, currencyAddon, variant = "card", showRatePercentage = false, ratePercentageHelpText }: Props) {
	const { control, setValue } = useFormContext();
	const { fields, append, remove } = useFieldArray({ control, name });

	const rows = useWatch({ control, name }) as Array<{ from: any, to: any, fee: any }> | undefined;

	const header = useMemo(
		() => [
			{ key: "from", title: showRatePercentage ? "بازه اول" : "شروع بازه" },
			{ key: "to", title: showRatePercentage ? "بازه دوم" : "پایان بازه" },
			{ key: "fee", title: showRatePercentage ? "مقدار فی (ریال)" : "مبلغ هر واحد" },
			...(showRatePercentage
				? [{
					key: "ratePercentage",
					title: (
						<span className="inline-flex items-center gap-1">
							درصد نرخ
							<Tooltip title={ratePercentageHelpText}>
								<button
									type="button"
									aria-label="توضیحات درصد نرخ"
									className="inline-flex cursor-help border-0 bg-transparent p-0 text-warning"
								>
									<QuestionCircleOutlined />
								</button>
							</Tooltip>
						</span>
					),
				}]
				: []),
		],
		[ratePercentageHelpText, showRatePercentage],
	);

	useEffect(() => {
		if (!rows || rows.length < 2)
			return;

		for (let index = 1; index < rows.length; index++) {
			const previousTo = rows[index - 1]?.to ?? null;
			const currentFrom = rows[index]?.from ?? null;

			if (currentFrom !== previousTo) {
				setValue(`${name}.${index}.from` as any, previousTo, {
					shouldDirty: true,
					shouldValidate: true,
				});
			}
		}
	}, [rows, name, setValue]);

	function handleRemoveRow(index: number) {
		remove(index);
	}

	function handleAddRow() {
		if (!rows || rows.length === 0) {
			append({ from: null, to: null, fee: null, ratePercentage: null } as any);
			return;
		}

		const previousTo = rows[rows.length - 1]?.to ?? null;
		append({ from: previousTo, to: null, fee: null, ratePercentage: null } as any);
	}

	const content = (
		<>
			{variant === "card" ? <div className="font-semibold mb-3">تعریف بازه‌ها و نرخ</div> : null}

			<div className={variant === "embedded" ? "overflow-x-auto" : "overflow-hidden"}>
				<div className={variant === "embedded" ? (showRatePercentage ? "min-w-[800px]" : "min-w-[640px]") : undefined}>
					<div className={`grid ${showRatePercentage ? "grid-cols-[1fr_1fr_1fr_1fr_64px]" : "grid-cols-[1fr_1fr_1fr_64px]"} gap-4`}>
						{header.map(item => (
							<div
								key={item.key}
								className="contract-tier-header-badge px-3 py-1 text-center font-semibold"
							>
								{item.title}
							</div>
						))}
						<div />
					</div>

					{fields.map((field, index) => (
						<div
							key={field.id}
							className={`mt-3 grid ${showRatePercentage ? "grid-cols-[1fr_1fr_1fr_1fr_64px]" : "grid-cols-[1fr_1fr_1fr_64px]"} gap-4`}
						>
							<div className={variant === "embedded" ? "" : "p-3"}>
								<RHFProNumber
									name={`${name}.${index}.from` as any}
									label=""
									enableGrouping
									enableWordsTooltip
									inputProps={{
										placeholder: "از",
										inputMode: "numeric",
										disabled: index > 0,
									} as any}
									formItemProps={{ className: "mb-0" }}
								/>
							</div>

							<div className={variant === "embedded" ? "" : "p-3"}>
								<TierToField
									name={`${name}.${index}.to`}
									showHint={index === fields.length - 1}
								/>
							</div>

							<div className={variant === "embedded" ? "" : "p-3"}>
								<RHFProNumber
									name={`${name}.${index}.fee` as any}
									label=""
									enableGrouping
									enableWordsTooltip
									inputProps={{
										placeholder: "برای مثال ۱۲۰",
										inputMode: "numeric",
										addonAfter: currencyAddon,
									} as any}
									formItemProps={{ className: "contract-type-currency-field mb-0" }}
								/>
							</div>

							{showRatePercentage
								? (
									<div className={variant === "embedded" ? "" : "p-3"}>
										<RHFProNumber
											name={`${name}.${index}.ratePercentage` as any}
											label=""
											enableGrouping={false}
											enableWordsTooltip={false}
											inputProps={{ placeholder: "درصد", inputMode: "numeric" } as any}
											formItemProps={{ className: "mb-0" }}
										/>
									</div>
								)
								: null}

							<div className={`flex items-center justify-center ${variant === "embedded" ? "" : "p-3"}`}>
								<Tooltip title="حذف بازه">
									<Button
										type="text"
										danger
										className="contract-tier-delete-button"
										icon={<DeleteOutlined />}
										onClick={() => handleRemoveRow(index)}
									/>
								</Tooltip>
							</div>
						</div>
					))}

					<div className={variant === "embedded" ? "mt-3" : "p-3"}>
						<Tooltip title="مقدار شروع بازه جدید به‌طور خودکار تنظیم می‌شود.">
							<Button className="contract-dashed-action" icon={<PlusOutlined />} onClick={handleAddRow}>
								{showRatePercentage ? "افزودن ردیف" : "افزودن بازه"}
							</Button>
						</Tooltip>
					</div>
				</div>
			</div>
		</>
	);

	if (variant === "embedded") {
		return content;
	}

	return (
		<Card variant="outlined" className="rounded-xl [&_.ant-pro-card-body]:p-3">
			{content}
		</Card>
	);
}
