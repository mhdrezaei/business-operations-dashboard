import type { ContractServicePath } from "#src/features/contract/api/contracts.api";
import type { ContractFormValues } from "#src/features/contract/shared/model/contract.form.types";
import type { ContractFormActions, ContractFormSelectionContext, ContractSubmitIntent } from "#src/features/contract/shared/ui/form/ContractForm";
import type { ContractCreateRouteState } from "#src/features/contract/shared/utils/contract-routes";
import type { UploadFile } from "antd";
import type { UseFormReturn } from "react-hook-form";
import { createContractDocument } from "#src/features/contract/api/contract-documents.api";
import { resolveContractServicePath } from "#src/features/contract/shared/model/contract-service-path";
import { formValuesToApiPayload } from "#src/features/contract/shared/model/contract.payload";
import { companyContractsRootKey, contractGapsRootKey } from "#src/features/contract/shared/queries/contract.queries";
import { resolveContractCompanyId } from "#src/features/contract/shared/queries/resolve-contract-company";
import { defaultContractFormValues } from "#src/features/contract/shared/ui/form/ContractForm";
import { buildContractEditPath } from "#src/features/contract/shared/utils/contract-routes";
import { i18n } from "#src/locales";
import { notification } from "#src/utils";
import { useQueryClient } from "@tanstack/react-query";
import React, { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router";
import { fetchCreateContract } from "../../api/contracts.api";
import { ContractForm } from "../../shared/ui/form/ContractForm";
import { CreateContractSidePanel } from "./components/CreateContractSidePanel";

async function uploadStagedDocuments(contractId: number, documents: unknown) {
	const stagedFiles = (Array.isArray(documents) ? documents : [])
		.map((doc: UploadFile) => doc?.originFileObj)
		.filter((file): file is NonNullable<UploadFile["originFileObj"]> => file instanceof File);

	for (const file of stagedFiles) {
		try {
			await createContractDocument(contractId, file);
		}
		catch {
			window.$message?.error(i18n.t("contract.create.uploadFailed", { name: file.name }));
		}
	}
}

function routeStateToInitialValues(state: ContractCreateRouteState | null): Partial<ContractFormValues> | null {
	if (!state || (state.serviceId == null && state.companyId == null && state.companyType == null))
		return null;
	return {
		serviceId: state.serviceId ?? null,
		companyId: state.companyId ?? null,
		companyType: state.companyType ?? null,
		counterpartyType: state.counterpartyType ?? null,
	};
}

function applySubmitIntent(
	intent: ContractSubmitIntent,
	form: UseFormReturn<ContractFormValues>,
	createdContract: { id?: number | null, notices?: unknown },
	service: ContractServicePath,
	navigate: ReturnType<typeof useNavigate>,
	actions: ContractFormActions,
) {
	const successMessage = i18n.t("contract.create.success");
	const notices = Array.isArray(createdContract.notices) ? createdContract.notices.filter(Boolean).map(String) : [];
	if (notices.length > 0) {
		notification.success({
			message: successMessage,
			description: <span className="whitespace-pre-line">{notices.join("\n")}</span>,
			placement: "top",
		});
	}
	else {
		window.$message?.success(successMessage);
	}

	switch (intent) {
		case "submit":
			form.reset(defaultContractFormValues);
			break;

		case "submit_and_create_another": {
			// فقط شرکت، نماینده فروش، شماره قرارداد و فایل‌ها پاک می‌شوند (مثل old)
			const values = form.getValues();
			actions.resetForCreateAnother({
				...values,
				companyId: null,
				contractNumber: "",
				documents: [],
				serviceFields: { ...values.serviceFields, ..."agent" in values.serviceFields ? { agent: null } : {} },
			});
			break;
		}

		case "submit_and_edit": {
			const serviceId = form.getValues("serviceId");
			const companyType = form.getValues("companyType") ?? "";
			form.reset(defaultContractFormValues);
			if (createdContract.id != null && serviceId != null) {
				navigate(buildContractEditPath({ contractId: createdContract.id, service, serviceId, companyType }));
			}
			break;
		}
	}
}

function CreateContract() {
	const { t } = useTranslation();
	const [submitting, setSubmitting] = useState(false);
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const routeState = useLocation().state as ContractCreateRouteState | null;
	const initialValues = useMemo(() => routeStateToInitialValues(routeState), [routeState]);
	const [selectionContext, setSelectionContext] = useState<ContractFormSelectionContext | null>(null);
	const handleSelectionContextChange = useCallback((context: ContractFormSelectionContext) => setSelectionContext(context), []);

	return (
		<div className="flex flex-col items-start gap-6 lg:flex-row">
			<div className="order-2 min-w-0 w-full flex-1 lg:order-1">
				<ContractForm
					initialValues={initialValues}
					onSelectionContextChange={handleSelectionContextChange}
					submitText={t("contract.create.submit")}
					showExtendedActions
					submitting={submitting}
					onSubmit={async (values, intent, form, actions) => {
						setSubmitting(true);
						try {
							const service = resolveContractServicePath(values);
							if (!service)
								throw new Error(i18n.t("contract.create.invalidService"));
							const payload = formValuesToApiPayload(values, await resolveContractCompanyId(values));
							const created = await fetchCreateContract(service, payload);
							// بک‌اند برای contracts/documents/ شناسه BaseContract را می‌خواهد
							const documentsContractId = created?.base_contract ?? created?.id;
							if (documentsContractId != null)
								await uploadStagedDocuments(documentsContractId, values.documents);
							await Promise.all([
								queryClient.invalidateQueries({ queryKey: contractGapsRootKey }),
								queryClient.invalidateQueries({ queryKey: companyContractsRootKey }),
							]);
							applySubmitIntent(intent, form, created, service, navigate, actions);
						}
						finally {
							setSubmitting(false);
						}
					}}
				/>
			</div>
			<aside className="order-1 flex w-full flex-col gap-3 px-2 lg:order-2 lg:w-[25rem] lg:shrink-0 lg:pe-0">
				<CreateContractSidePanel context={selectionContext} />
			</aside>
		</div>
	);
}

export default CreateContract;
