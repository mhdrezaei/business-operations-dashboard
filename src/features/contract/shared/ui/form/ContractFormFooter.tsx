import type { ReactNode } from "react";
import type { ContractFormValues } from "../../model/contract.form.types";
import type { ContractSubmitIntent } from "./ContractForm";
import { useAccess } from "#src/hooks";
import { FormActionBar } from "#src/shared/ui/form-action-bar";
import { Button, Tooltip } from "antd";
import { useMemo } from "react";
import { useFormContext, useFormState, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { getContractAccessCompanyType } from "../../model/company-type-options";
import { resolveContractServicePath } from "../../model/contract-service-path";
import { hasArrayLengthChange, normalizeContractValue } from "../../model/contract.schema";
import { ActionSection } from "./sections/ActionSection";

function hasMeaningfulDirtyField(
	dirtyFields: unknown,
	currentValue: unknown,
	initialValue: unknown,
): boolean {
	if (dirtyFields === true) {
		const normalizedCurrent = JSON.stringify(normalizeContractValue(currentValue));
		const normalizedInitial = JSON.stringify(normalizeContractValue(initialValue));
		return normalizedCurrent !== normalizedInitial;
	}

	if (!dirtyFields || typeof dirtyFields !== "object")
		return false;

	return Object.entries(dirtyFields as Record<string, unknown>).some(([key, dirtyValue]) => {
		const currentChild = currentValue != null && typeof currentValue === "object"
			? (currentValue as Record<string, unknown>)[key]
			: undefined;
		const initialChild = initialValue != null && typeof initialValue === "object"
			? (initialValue as Record<string, unknown>)[key]
			: undefined;

		return hasMeaningfulDirtyField(dirtyValue, currentChild, initialChild);
	});
}

interface Props {
	initialValues: ContractFormValues
	showExtendedActions: boolean
	secondaryActions?: ReactNode
	submitting?: boolean
	/** Blocks the submit button regardless of dirtiness (e.g. a locked contract). */
	submitLocked: boolean
	submitDisabledReason?: string
	submitText?: string
	onSubmit: (intent: ContractSubmitIntent) => void
	onReset: () => void
}

/**
 * Submit bar. It owns the whole-form watch (dirty check, permissions) so that typing in any field only
 * re-renders this bar, not the entire contract form.
 */
export function ContractFormFooter({ initialValues, showExtendedActions, secondaryActions, submitting, submitLocked, submitDisabledReason, submitText, onSubmit, onReset }: Props) {
	const { t } = useTranslation();
	const { control } = useFormContext<ContractFormValues>();
	const { hasDomainPermissionByServiceId } = useAccess();
	const watchedValues = useWatch({ control, defaultValue: initialValues as any }) as ContractFormValues;
	const { dirtyFields } = useFormState({ control });
	const isDirty = useMemo(() => {
		return hasMeaningfulDirtyField(dirtyFields, watchedValues, initialValues)
		  || hasArrayLengthChange(watchedValues, initialValues);
	}, [dirtyFields, initialValues, watchedValues]);
	const canUpdateSelectedService = watchedValues.serviceId != null && hasDomainPermissionByServiceId("contracts", "update", watchedValues.serviceId, getContractAccessCompanyType(resolveContractServicePath({ serviceCode: watchedValues.serviceCode, companyType: watchedValues.companyType, counterpartyType: watchedValues.counterpartyType }), watchedValues.companyType));
	const submitDisabled = !isDirty || submitting || submitLocked;
	const label = submitText ?? t("contract.create.submit");

	return (
		<div className="mt-4 w-full">
			{showExtendedActions
				? (
					<ActionSection
						submitting={submitting}
						disabled={submitDisabled}
						submitText={label}
						onSubmit={() => onSubmit("submit")}
						onSubmitAndCreateAnother={() => onSubmit("submit_and_create_another")}
						onSubmitAndEdit={() => onSubmit("submit_and_edit")}
						canSubmitAndEdit={canUpdateSelectedService}
						onReset={onReset}
					/>
				)
				: (
					<FormActionBar
						secondaryActions={secondaryActions}
						primaryActions={(
							<Tooltip title={submitLocked ? submitDisabledReason : undefined}>
								<Button type="primary" onClick={() => onSubmit("submit")} loading={!!submitting} disabled={submitDisabled}>
									{label}
								</Button>
							</Tooltip>
						)}
					/>
				)}
		</div>
	);
}
