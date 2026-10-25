import type { CSSProperties } from "react";
import type { CompanyCopySectionKey } from "../model/company-data-copy.types";
import { fetchCompaniesByService } from "#src/api/common/common.api";
import { CopyOutlined, ExclamationCircleFilled } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Checkbox, Empty, Modal, Select, Skeleton, Tag, theme } from "antd";
import React, { useMemo, useState } from "react";
import { servicesQuery } from "../../../queries/company-profile.queries";
import { companyTypeMatches, serviceRequiresCompanyType } from "../../../shared/utils";
import { useCompanyTypeOptions } from "../../../shared/utils/use-company-type-options";
import {
	companyCopySectionHasData,
	copyCompanyData,
	getCompanyDataSnapshot,
} from "../api/company-data-copy.api";
import {
	COMPANY_COPY_SECTION_LABELS,
} from "../model/company-data-copy.types";
import "./company-data-copy-modal.css";

interface ServiceOption {
	label: string
	value: number
}

interface CompanyDataCopyModalProps {
	open: boolean
	destinationCompanyId: number
	destinationCompanyName: string | null
	destinationServiceId: number
	serviceOptions: ServiceOption[]
	sections: CompanyCopySectionKey[]
	onClose: () => void
	onCopied: () => void
}

export default function CompanyDataCopyModal({
	open,
	destinationCompanyId,
	destinationCompanyName,
	destinationServiceId,
	serviceOptions,
	sections,
	onClose,
	onCopied,
}: CompanyDataCopyModalProps) {
	const { token } = theme.useToken();
	const { modal } = App.useApp();
	const queryClient = useQueryClient();
	const [sourceServiceId, setSourceServiceId] = useState<number | null>(null);
	const [sourceCompanyType, setSourceCompanyType] = useState<string | null>(null);
	const [sourceCompanyId, setSourceCompanyId] = useState<number | null>(null);
	const [selectedSections, setSelectedSections] = useState<CompanyCopySectionKey[]>([]);
	const [copying, setCopying] = useState(false);

	function resetState() {
		setSourceServiceId(destinationServiceId);
		setSourceCompanyType(null);
		setSourceCompanyId(null);
		setSelectedSections([]);
		setCopying(false);
	}

	const servicesResult = useQuery(servicesQuery());
	const sourceServiceCode = servicesResult.data?.results.find(service => service.id === sourceServiceId)?.code;
	const sourceRequiresCompanyType = serviceRequiresCompanyType(sourceServiceCode);
	const sourceCompanyTypeOptions = useCompanyTypeOptions(String(sourceServiceCode ?? "").toLowerCase(), sourceServiceId, "view", sourceRequiresCompanyType);

	const sourceCompaniesQuery = useQuery({
		queryKey: ["common", "companies", { serviceId: sourceServiceId, pageSize: 1000, purpose: "copy" }],
		enabled: open && !!sourceServiceId,
		queryFn: () => fetchCompaniesByService(sourceServiceId!, { pageSize: 1000 }),
		staleTime: 2 * 60 * 1000,
	});

	const destinationSnapshotQuery = useQuery({
		queryKey: ["company-profile", "copy-snapshot", { companyId: destinationCompanyId, serviceId: destinationServiceId, sections }],
		enabled: open && !!destinationCompanyId && !!destinationServiceId,
		queryFn: () => getCompanyDataSnapshot({ companyId: destinationCompanyId, serviceId: destinationServiceId }, sections),
		staleTime: 0,
	});

	const sourceSnapshotQuery = useQuery({
		queryKey: ["company-profile", "copy-snapshot", { companyId: sourceCompanyId, serviceId: sourceServiceId, sections }],
		enabled: open && !!sourceCompanyId && !!sourceServiceId,
		queryFn: () => getCompanyDataSnapshot({ companyId: sourceCompanyId!, serviceId: sourceServiceId! }, sections),
		staleTime: 0,
	});

	const sourceCompanyOptions = useMemo(
		() => (sourceCompaniesQuery.data?.results ?? [])
			.filter(company => sourceServiceId !== destinationServiceId || company.id !== destinationCompanyId)
			.filter(company => !sourceRequiresCompanyType || companyTypeMatches(company.company_type, sourceCompanyType))
			.map(company => ({ label: company.name, value: company.id })),
		[sourceCompaniesQuery.data, sourceServiceId, destinationServiceId, destinationCompanyId, sourceRequiresCompanyType, sourceCompanyType],
	);

	const sourceCompanyName = useMemo(
		() => sourceCompanyOptions.find(company => company.value === sourceCompanyId)?.label ?? null,
		[sourceCompanyOptions, sourceCompanyId],
	);

	const selectableSections = useMemo(
		() => sections.filter(section => companyCopySectionHasData(sourceSnapshotQuery.data, section)),
		[sections, sourceSnapshotQuery.data],
	);
	const allSelected = selectableSections.length > 0 && selectableSections.every(section => selectedSections.includes(section));
	const partiallySelected = selectedSections.length > 0 && !allSelected;
	const selectedWithCurrentData = selectedSections.filter(
		section => companyCopySectionHasData(destinationSnapshotQuery.data, section),
	);

	function toggleSection(section: CompanyCopySectionKey) {
		setSelectedSections(current => current.includes(section)
			? current.filter(item => item !== section)
			: [...current, section]);
	}

	function toggleAll() {
		setSelectedSections(allSelected ? [] : selectableSections);
	}

	async function performCopy() {
		if (!sourceServiceId || !sourceCompanyId || selectedSections.length === 0)
			return;

		setCopying(true);
		try {
			const copiedSections = await copyCompanyData({
				source: { companyId: sourceCompanyId, serviceId: sourceServiceId },
				destination: { companyId: destinationCompanyId, serviceId: destinationServiceId },
				sections: selectedSections,
			});
			if (copiedSections.length === 0) {
				window.$notification?.warning({
					message: "اطلاعاتی برای کپی پیدا نشد",
					description: "اطلاعات شرکت مبدأ تغییر کرده است؛ فهرست بخش‌ها را به‌روزرسانی کنید.",
				});
				await sourceSnapshotQuery.refetch();
				return;
			}

			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ["company-profile", "copy-snapshot"] }),
				queryClient.invalidateQueries({ queryKey: ["contracts", "bankAccounts"] }),
				queryClient.invalidateQueries({ queryKey: ["contracts", "companyPeople"] }),
				queryClient.invalidateQueries({ queryKey: ["contracts", "shareholders"] }),
			]);

			window.$notification?.success({
				message: "اطلاعات کپی شد",
				description: `${copiedSections.length} بخش از «${sourceCompanyName ?? "شرکت مبدأ"}» به‌روزرسانی شد.`,
			});
			onCopied();
			onClose();
		}
		catch (error) {
			console.error(error);
			window.$notification?.error({
				message: "کپی اطلاعات کامل نشد",
				description: "بخشی از عملیات ناموفق بود. اطلاعات شرکت را بررسی و دوباره تلاش کنید.",
			});
			throw error;
		}
		finally {
			setCopying(false);
		}
	}

	function confirmCopy() {
		if (!sourceServiceId || !sourceCompanyId || selectedSections.length === 0)
			return;

		const hasReplacement = selectedWithCurrentData.length > 0;
		modal.confirm({
			title: hasReplacement ? "جایگزینی اطلاعات" : "کپی اطلاعات",
			icon: hasReplacement ? <ExclamationCircleFilled /> : <CopyOutlined />,
			content: hasReplacement
				? `اطلاعات فعلی ${selectedWithCurrentData.map(section => COMPANY_COPY_SECTION_LABELS[section]).join("، ")} جایگزین می‌شود. ادامه می‌دهید؟`
				: `اطلاعات بخش‌های انتخاب‌شده از «${sourceCompanyName ?? "شرکت مبدأ"}» کپی شود؟`,
			okText: hasReplacement ? "بله، جایگزین کن" : "کپی کن",
			cancelText: "انصراف",
			okButtonProps: hasReplacement ? { danger: true } : undefined,
			onOk: performCopy,
		});
	}

	const isSnapshotLoading = sourceSnapshotQuery.isLoading || destinationSnapshotQuery.isLoading;
	const hasSnapshotError = sourceSnapshotQuery.isError || destinationSnapshotQuery.isError;
	const style = {
		"--company-copy-surface": token.colorBgLayout,
		"--company-copy-border": token.colorBorderSecondary,
		"--company-copy-text": token.colorText,
		"--company-copy-text-secondary": token.colorTextSecondary,
		"--company-copy-primary": token.colorPrimary,
		"--company-copy-primary-bg": token.colorPrimaryBg,
		"--company-copy-radius": `${token.borderRadius}px`,
	} as CSSProperties;

	return (
		<Modal
			open={open}
			className="company-data-copy-modal"
			style={style}
			title="کپی اطلاعات از شرکت دیگر"
			width={680}
			destroyOnHidden
			maskClosable={!copying}
			closable={!copying}
			onCancel={() => !copying && onClose()}
			afterClose={resetState}
			footer={[
				<Button key="cancel" disabled={copying} onClick={onClose}>انصراف</Button>,
				<Button
					key="copy"
					type="primary"
					icon={<CopyOutlined />}
					loading={copying}
					disabled={!sourceCompanyId || selectedSections.length === 0 || hasSnapshotError}
					onClick={confirmCopy}
				>
					کپی اطلاعات
				</Button>,
			]}
		>
			<div className="company-data-copy" aria-busy={isSnapshotLoading || copying}>
				<p className="company-data-copy__destination">
					<span>مقصد:</span>
					<strong>{destinationCompanyName ?? "شرکت فعلی"}</strong>
				</p>

				<div className="company-data-copy__source-grid">
					<label className="company-data-copy__field">
						<span>سرویس مبدأ</span>
						<Select
							showSearch
							optionFilterProp="label"
							value={sourceServiceId}
							options={serviceOptions}
							placeholder="سرویس را انتخاب کنید"
							disabled={copying}
							onChange={(value) => {
								setSourceServiceId(value);
								setSourceCompanyType(null);
								setSourceCompanyId(null);
								setSelectedSections([]);
							}}
						/>
					</label>

					{sourceRequiresCompanyType && (
						<label className="company-data-copy__field">
							<span>نوع شرکت مبدأ</span>
							<Select
								allowClear
								value={sourceCompanyType}
								options={sourceCompanyTypeOptions}
								placeholder="نوع شرکت را انتخاب کنید"
								disabled={copying || sourceCompanyTypeOptions.length === 0}
								onChange={(value) => {
									setSourceCompanyType(value ?? null);
									setSourceCompanyId(null);
									setSelectedSections([]);
								}}
							/>
						</label>
					)}

					<label className="company-data-copy__field">
						<span>شرکت مبدأ</span>
						<Select
							showSearch
							allowClear
							optionFilterProp="label"
							value={sourceCompanyId}
							options={sourceCompanyOptions}
							loading={sourceCompaniesQuery.isLoading}
							placeholder={sourceServiceId ? "شرکت را انتخاب کنید" : "ابتدا سرویس را انتخاب کنید"}
							disabled={!sourceServiceId || sourceCompaniesQuery.isLoading || copying || (sourceRequiresCompanyType && !sourceCompanyType)}
							notFoundContent={sourceCompaniesQuery.isLoading ? null : "شرکت دیگری یافت نشد"}
							onChange={(value) => {
								setSourceCompanyId(value ?? null);
								setSelectedSections([]);
							}}
						/>
					</label>
				</div>

				{sourceCompanyId
					? (
						<section className="company-data-copy__sections" aria-labelledby="company-copy-sections-title">
							<div className="company-data-copy__sections-heading">
								<h3 id="company-copy-sections-title">بخش‌های قابل کپی</h3>
								<Checkbox
									checked={allSelected}
									indeterminate={partiallySelected}
									disabled={isSnapshotLoading || selectableSections.length === 0}
									onChange={toggleAll}
								>
									انتخاب همه
								</Checkbox>
							</div>

							{isSnapshotLoading && <Skeleton active paragraph={{ rows: Math.min(sections.length, 5) }} />}
							{hasSnapshotError && (
								<Alert
									type="error"
									showIcon
									message="دریافت اطلاعات شرکت‌ها ناموفق بود"
									action={<Button size="small" onClick={() => void Promise.all([sourceSnapshotQuery.refetch(), destinationSnapshotQuery.refetch()])}>تلاش دوباره</Button>}
								/>
							)}

							{!isSnapshotLoading && !hasSnapshotError && (
								<div className="company-data-copy__section-list">
									{sections.map((section) => {
										const hasSourceData = companyCopySectionHasData(sourceSnapshotQuery.data, section);
										const hasCurrentData = companyCopySectionHasData(destinationSnapshotQuery.data, section);
										const disabled = !hasSourceData;
										const selected = selectedSections.includes(section);

										return (
											<label
												key={section}
												className={`company-data-copy__section${selected ? " company-data-copy__section--selected" : ""}${disabled ? " company-data-copy__section--disabled" : ""}`}
											>
												<Checkbox
													checked={selected}
													disabled={disabled || copying}
													onChange={() => toggleSection(section)}
												/>
												<span className="company-data-copy__section-name">
													<strong>{COMPANY_COPY_SECTION_LABELS[section]}</strong>
												</span>
												<span className="company-data-copy__section-status">
													{hasCurrentData
														? <Tag color="warning">دارای اطلاعات فعلی</Tag>
														: null}
													{disabled
														? <span className="company-data-copy__unavailable">بدون اطلاعات مبدأ</span>
														: null}
												</span>
											</label>
										);
									})}
								</div>
							)}
						</section>
					)
					: (
						<Empty
							image={Empty.PRESENTED_IMAGE_SIMPLE}
							description="برای دیدن بخش‌های قابل کپی، شرکت مبدأ را انتخاب کنید."
						/>
					)}
			</div>
		</Modal>
	);
}
