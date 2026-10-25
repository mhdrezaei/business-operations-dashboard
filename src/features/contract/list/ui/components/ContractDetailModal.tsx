import type { ContractFormValues } from "#src/features/contract/shared/model/contract.form.types";
import type { ContractFormSelectionContext } from "#src/features/contract/shared/ui/form/ContractForm";
import type { UploadFile } from "antd";
import type { ContractServicePath } from "../../../api/contracts.api";
import { contractDetailToFormValues } from "#src/features/contract/api/contract-detail.mappers";
import { listContractDocuments } from "#src/features/contract/api/contract-documents.api";
import { ContractReadOnlyDetails } from "#src/features/contract/preview/ui/ContractReadOnlyDetails";
import { formValuesToApiPayload } from "#src/features/contract/shared/model/contract.payload";
import { resolveContractCompanyId } from "#src/features/contract/shared/queries/resolve-contract-company";
import { ContractForm } from "#src/features/contract/shared/ui/form/ContractForm";
import { pickCompanyTypeToken } from "#src/features/contract/shared/utils";
import { useAccess } from "#src/hooks";
import { Alert, Button, Empty, Popconfirm, Spin } from "antd";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchContractDetail, fetchDeleteContract, fetchUpdateContract, resolveSalesAgencyExpenseTitleNames } from "../../../api/contracts.api";
import { isCollocationCostContext, resolveContractServicePath } from "../../../shared/model/contract-service-path";
import { ScopedCompanyContractsPanel } from "../../../shared/ui/ScopedCompanyContractsPanel";
import { ContractApprovalPanel } from "./ContractApprovalPanel";
import { ContractDocumentsPanel } from "./ContractDocumentsPanel";

function contractDocumentToUploadFile(doc: { id: number, original_filename: string, size: number, mime_type: string }): UploadFile {
	return {
		uid: String(doc.id),
		documentId: doc.id,
		name: doc.original_filename,
		size: doc.size,
		type: doc.mime_type,
		status: "done",
	} as UploadFile;
}

interface Props {
	contractId: number
	service: ContractServicePath
	readOnlyHeader?: React.ReactNode
	onUpdated?: () => void
	onDeleted?: () => void
	onContractSelect?: (contractId: number, serviceId: number, companyType: string | null, service: ContractServicePath) => void
	readOnly?: boolean
}

function isValidContractDetailResponse(dto: unknown, contractId: number) {
	if (!dto || typeof dto !== "object")
		return false;

	const record = dto as Record<string, unknown>;
	return Number(record.id) === contractId;
}

function getSmsFallbackService(service: ContractServicePath) {
	if (service === "sms/client")
		return "sms/vendor" as const;
	if (service === "sms/vendor")
		return "sms/client" as const;
	return null;
}

interface ContractListScope {
	serviceId: number | null
	service: ContractServicePath | null
	companyId: number | null
	companyType: string | null
	costContext: boolean
}

export function ContractEditForm({ contractId, service, readOnlyHeader, onUpdated, onDeleted, onContractSelect, readOnly = false }: Props) {
	const { t } = useTranslation();
	const { hasDomainPermissionByServiceId } = useAccess();
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [initialValues, setInitialValues] = useState<ContractFormValues | null>(null);
	const [contractDetail, setContractDetail] = useState<Record<string, unknown> | null>(null);
	const [resolvedService, setResolvedService] = useState<ContractServicePath | null>(null);
	const [loadedContractId, setLoadedContractId] = useState<number | null>(null);
	const [loadError, setLoadError] = useState(false);
	const [contractListScope, setContractListScope] = useState<ContractListScope | null>(null);
	const contractListScopeRef = useRef<ContractListScope | null>(null);
	const [awaitingContractSelection, setAwaitingContractSelection] = useState(false);
	// بعد از ذخیره در همان صفحه می‌مانیم و فرم با داده تازه BE دوباره پر می‌شود (مثل old)
	const [reloadKey, setReloadKey] = useState(0);
	const [formVersion, setFormVersion] = useState(0);

	const handleSelectionContextChange = useCallback((context: ContractFormSelectionContext) => {
		const current = contractListScopeRef.current;
		const nextService = resolveContractServicePath(context);
		const companyScopeChanged = current != null && (
			current.serviceId !== context.serviceId
			|| current.service !== nextService
			|| current.companyType !== context.companyType
		);
		const selectionChanged = companyScopeChanged || (current != null && current.companyId !== context.companyId);
		const nextScope = {
			serviceId: context.serviceId,
			service: nextService,
			companyId: companyScopeChanged ? null : context.companyId,
			companyType: context.companyType,
			costContext: isCollocationCostContext(context),
		};

		contractListScopeRef.current = nextScope;
		setContractListScope(nextScope);
		if (selectionChanged)
			setAwaitingContractSelection(true);
	}, []);

	useEffect(() => {
		let cancelled = false;
		const smsFallbackService = getSmsFallbackService(service);
		const candidateServices: ContractServicePath[] = smsFallbackService ? [service, smsFallbackService] : [service];

		(async () => {
			setLoading(true);
			setLoadError(false);
			try {
				for (const candidateService of candidateServices) {
					try {
						const dto = await fetchContractDetail(candidateService, contractId);
						if (!isValidContractDetailResponse(dto, contractId))
							continue;

						const formValues = contractDetailToFormValues(dto, candidateService);
						if (candidateService === "sales-agency/rep-management" && Array.isArray(formValues.serviceFields.costTitles)) {
							try {
								formValues.serviceFields.costTitles = await resolveSalesAgencyExpenseTitleNames(formValues.serviceFields.costTitles);
							}
							catch {
								// Keep the contract form usable if expense-title lookup is unavailable.
							}
						}
						try {
							const documentsResponse = await listContractDocuments(contractId);
							formValues.documents = documentsResponse.results.map(contractDocumentToUploadFile);
						}
						catch {
							// اگر بازیابی فهرست مدارک شکست بخورد، بقیه‌ی فرم همچنان قابل استفاده باشد
						}

						if (!cancelled) {
							setResolvedService(candidateService);
							setInitialValues(formValues);
							setContractDetail(dto as Record<string, unknown>);
							setLoadedContractId(contractId);
							setFormVersion(version => version + 1);
							const loadedScope = {
								serviceId: formValues.serviceId ?? null,
								service: candidateService,
								companyId: formValues.companyId ?? null,
								companyType: formValues.companyType ?? null,
								costContext: isCollocationCostContext(formValues),
							};
							contractListScopeRef.current = loadedScope;
							setContractListScope(loadedScope);
							setAwaitingContractSelection(false);
						}
						return;
					}
					catch {
						// try the next fallback service candidate
					}
				}
				if (!cancelled)
					setLoadError(true);
			}
			finally {
				if (!cancelled)
					setLoading(false);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [contractId, service, reloadKey]);

	const canDelete = hasDomainPermissionByServiceId("contracts", "delete", initialValues?.serviceId, pickCompanyTypeToken(initialValues?.companyType));

	async function handleDelete() {
		if (resolvedService == null || loadedContractId == null)
			return;
		setDeleting(true);
		try {
			await fetchDeleteContract(resolvedService, loadedContractId);
			window.$message?.success(t("contract.edit.deleted"));
			onUpdated?.();
			onDeleted?.();
		}
		finally {
			setDeleting(false);
		}
	}

	return (
		loading && !initialValues
			? (
				<div className="flex min-h-[240px] items-center justify-center">
					<Spin />
				</div>
			)
			: !initialValues || !resolvedService || loadedContractId == null
				? <Empty description={t("contract.edit.notFound")} />
				: (
					<div dir="rtl" className="flex flex-col items-start gap-6 lg:flex-row">
						<div className="order-2 min-w-0 w-full flex-1 lg:order-1">
							{readOnlyHeader
								? <div className="mb-6">{readOnlyHeader}</div>
								: null}
							{loadError
								? (
									<div className="p-4">
										<Alert type="error" showIcon message={t("contract.edit.loadFailed")} />
									</div>
								)
								: (
									<Spin spinning={loading} tip={t("contract.edit.loading")} wrapperClassName="w-full">
										{readOnly
											? contractDetail ? <ContractReadOnlyDetails values={initialValues} detail={contractDetail} service={resolvedService} /> : null
											: (
												<ContractForm
													key={`${resolvedService}-${loadedContractId}-${formVersion}`}
													mode="edit"
													contractId={loadedContractId}
													initialValues={initialValues}
													showDocuments={false}
													readOnly={readOnly}
													onSelectionContextChange={handleSelectionContextChange}
													awaitingContractSelection={awaitingContractSelection}
													submitText={t("contract.edit.save")}
													submitting={saving || loading}
													secondaryActions={canDelete
														? (
															<Popconfirm
																title={t("contract.edit.deleteConfirm")}
																okText={t("common.confirm")}
																cancelText={t("common.cancel")}
																onConfirm={handleDelete}
															>
																<Button danger loading={deleting}>{t("contract.edit.delete")}</Button>
															</Popconfirm>
														)
														: undefined}
													onSubmit={async (values) => {
														setSaving(true);
														try {
															const updated = await fetchUpdateContract(resolvedService, loadedContractId, formValuesToApiPayload(values, await resolveContractCompanyId(values), { mode: "edit", hadRealStart: initialValues.serviceFields.realStartYear != null }));
															// پیام‌های اطلاع‌رسانی BE (notices) همراه پیام موفقیت نمایش داده می‌شود
															const notices: unknown[] = Array.isArray(updated?.notices) ? updated.notices.filter(Boolean) : [];
															window.$message?.success([t("contract.edit.updated"), ...notices].join("\n"));
															setReloadKey(key => key + 1);
															onUpdated?.();
														}
														finally {
															setSaving(false);
														}
													}}
												/>
											)}
									</Spin>
								)}
						</div>

						{initialValues.companyId != null || resolvedService === "sms/vendor" || contractListScope?.costContext
							? (
								<aside className="order-1 flex w-full flex-col gap-3 px-2 lg:order-2 lg:w-[25rem] lg:shrink-0 lg:pr-0">
									<ScopedCompanyContractsPanel
										costContext={contractListScope?.costContext}
										companyId={contractListScope?.companyId}
										companyType={contractListScope?.companyType}
										currentContractId={awaitingContractSelection ? 0 : loadedContractId}
										service={contractListScope?.service}
										serviceId={contractListScope?.serviceId}
										onSelect={(selectedContract) => {
											const selectedServiceId = Number(selectedContract.service_id ?? selectedContract.service ?? contractListScope?.serviceId);
											if (Number.isInteger(selectedServiceId) && selectedServiceId > 0) {
												onContractSelect?.(
													selectedContract.id,
													selectedServiceId,
													contractListScope?.companyType ?? null,
													contractListScope?.service ?? resolvedService,
												);
											}
										}}
									/>
									{awaitingContractSelection
										? null
										: (
											<>
												<ContractDocumentsPanel
													key={loadedContractId}
													contractId={loadedContractId}
													initialDocuments={initialValues.documents as UploadFile[]}
													loading={loading}
													readOnly={readOnly}
												/>
												<ContractApprovalPanel
													contractId={loadedContractId}
													service={resolvedService}
													detail={contractDetail}
													companyType={pickCompanyTypeToken(initialValues.companyType)}
													canDecide={readOnly}
												/>
											</>
										)}
								</aside>
							)
							: null}
					</div>
				)
	);
}
