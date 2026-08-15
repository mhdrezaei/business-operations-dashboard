// src/features/contract-templates/create/components/sidebar/SidebarVariablesTab.tsx
import type { Editor } from "@tiptap/react";
import { useServicesListQuery } from "#src/features/contract-templates/queries/template-create.queries.js";
import { DownCircleOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, Collapse, Input, Spin, theme, Typography } from "antd";
import React, { useMemo, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { TemplateCreateApi } from "../../../api/api";
import { dynamicVariableCache } from "../editor/variables/registry";
import { useVariableRegistry } from "../editor/variables/VariableRegistryContext";

const toFaDigits = (value: any) => String(value ?? "").replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[Number(d)] || d);
const SLOT_KEY_PATTERN = /^(.+?)_(\d{1,2})_.+$/;
const { Text } = Typography;

function buildDisplayBlocks(variables: any[]) {
	const blocks: any[] = [];
	const familyBlockIndex = new Map();
	let currentSingles: any = null;

	for (const variable of variables) {
		const match = SLOT_KEY_PATTERN.exec(variable.key);
		if (!match) {
			if (!currentSingles) {
				currentSingles = { type: "singles", variables: [] };
				blocks.push(currentSingles);
			}
			currentSingles.variables.push(variable);
			continue;
		}
		currentSingles = null;
		const [, prefix, indexStr] = match;
		const index = Number(indexStr);
		if (!familyBlockIndex.has(prefix)) {
			familyBlockIndex.set(prefix, blocks.length);
			blocks.push({ type: "family", prefix, maxIndex: 0, variablesByIndex: new Map() });
		}
		const block = blocks[familyBlockIndex.get(prefix)];
		if (!block.variablesByIndex.has(index))
			block.variablesByIndex.set(index, []);
		block.variablesByIndex.get(index).push(variable);
		block.maxIndex = Math.max(block.maxIndex, index);
	}
	return blocks;
}

function VariableButton({ variable, onInsert }: { variable: any, onInsert: (key: string) => void }) {
	const { token } = theme.useToken();
	return (
		<Button
			size="small"
			shape="round"
			title={variable.example ? `مثال: ${variable.example}` : `{$${variable.key}}`}
			onClick={() => onInsert(variable.key)}
			style={{ fontSize: "11px", borderColor: token.colorPrimaryBorder, color: token.colorPrimary, backgroundColor: token.colorPrimaryBg, padding: "0 10px" }}
			className="hover:opacity-80 transition-opacity"
		>
			{variable.label}
		</Button>
	);
}

function FamilySlotBlock({ block, visibleCount, onRevealNext, onCollapse, onInsert }: any) {
	const { token } = theme.useToken();
	const indices = [...block.variablesByIndex.keys()].sort((a, b) => a - b);
	const shown = indices.filter(idx => idx <= visibleCount);
	const hasMore = block.maxIndex > visibleCount;

	return (
		<Card className="rounded-lg border p-2.5 mb-2 shadow-none" bodyStyle={{ padding: 0 }} style={{ backgroundColor: token.colorBgElevated, borderColor: token.colorBorderSecondary }}>
			<div className="space-y-2.5">
				{shown.map(idx => (
					<div key={idx} className="flex flex-wrap items-center gap-1.5">
						<span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold" style={{ backgroundColor: token.colorFillAlter, color: token.colorTextSecondary }}>{toFaDigits(idx)}</span>
						{block.variablesByIndex.get(idx).map((variable: any) => (
							<VariableButton key={variable.key} variable={variable} onInsert={onInsert} />
						))}
					</div>
				))}
			</div>
			{(hasMore || visibleCount > 1) && (
				<div className="mt-2.5 flex items-center gap-2">
					{hasMore && (
						<Button type="dashed" size="small" onClick={onRevealNext} icon={<PlusOutlined />} style={{ fontSize: "10px", color: token.colorPrimary, borderColor: token.colorPrimaryBorder }} className="flex-1 text-right">
							افزودن مورد بعدی (
							{toFaDigits(visibleCount + 1)}
							{" "}
							از
							{toFaDigits(block.maxIndex)}
							)
						</Button>
					)}
					{visibleCount > 1 && <Button type="text" size="small" onClick={onCollapse} title="بازگشت به حالت جمع‌شده" icon={<ReloadOutlined />} style={{ fontSize: "10px", color: token.colorTextDescription }} />}
				</div>
			)}
		</Card>
	);
}

export default function SidebarVariablesTab({ editor }: { editor: Editor | null }) {
	const { token } = theme.useToken();
	const [query, setQuery] = useState("");
	const [familyVisibleCounts, setFamilyVisibleCounts] = useState<Record<string, number>>({});

	const registry = useVariableRegistry() as any;
	const fallbackStaticGroups = registry?.staticGroups || [];

	const { control } = useFormContext();
	const serviceId = useWatch({ control, name: "service_id" });
	const variant = useWatch({ control, name: "variant" });
	const documentKind = useWatch({ control, name: "document_kind" });
	const companyType = useWatch({ control, name: "company_type" });

	const { data: servicesData } = useServicesListQuery();
	const payloadData = (servicesData as any)?.data ?? servicesData;
	const rawServices = Array.isArray(payloadData?.results) ? payloadData.results : [];
	const selectedService = rawServices.find((s: any) => s.id === serviceId);
	const serviceStringValue = selectedService?.code || selectedService?.slug || selectedService?.key || serviceId;

	const { data: catalogData, isFetching: isFetchingCatalog } = useQuery({
		queryKey: ["variable-catalog", serviceStringValue, variant, documentKind, companyType],
		queryFn: () => {
			return TemplateCreateApi.getVariableCatalog({
				service: serviceStringValue,
				variant,
				document_kind: documentKind,
				company_type: companyType,
			});
		},
		enabled: !!serviceStringValue && !!documentKind,
		staleTime: 5 * 60 * 1000,
	});

	const dynamicGroups = useMemo(() => {
		if (!catalogData?.variables)
			return null;

		dynamicVariableCache.clear();

		return catalogData.variables
			.filter((root: any) => root.key !== "service")
			.map((root: any) => {
				const vars = Array.isArray(root.children) && root.children.length > 0 ? root.children : [root];

				return {
					group: root.key,
					label: root.label,
					variables: vars.map((v: any) => {
						let finalKey = v.key;

						if (root.key === "contract" || root.key === "addendum") {
							if (!finalKey.startsWith(root.key)) {
								finalKey = `${root.key}_${finalKey}`;
							}
						}

						const formattedVariable = {
							key: finalKey,
							label: v.label,
							example: v.example,
						};

						dynamicVariableCache.set(finalKey, formattedVariable);

						return formattedVariable;
					}),
				};
			});
	}, [catalogData]);

	const effectiveGroups = dynamicGroups || fallbackStaticGroups;

	const handleInsert = (key: string) => editor?.chain().focus().insertTemplateVariable(key).run();
	const resolveVisibleCount = (prefix: string) => familyVisibleCounts[prefix] ?? 1;
	const revealNextSlot = (prefix: string, maxIndex: number) => setFamilyVisibleCounts(p => ({ ...p, [prefix]: Math.min((p[prefix] || 1) + 1, maxIndex) }));
	const collapseFamily = (prefix: string) => setFamilyVisibleCounts(p => ({ ...p, [prefix]: 1 }));

	const staticGroupsWithBlocks = useMemo(() => {
		const q = query.trim().toLowerCase();

		const filteredGroups = !q
			? effectiveGroups
			: effectiveGroups
				.map((g: any) => ({
					...g,
					variables: g.variables.filter((v: any) => v.label.includes(q) || v.key.toLowerCase().includes(q)),
				}))
				.filter((g: any) => g.variables.length > 0);

		return filteredGroups.map((group: any) => ({
			...group,
			blocks: q ? [{ type: "singles", variables: group.variables }] : buildDisplayBlocks(group.variables),
		}));
	}, [effectiveGroups, query]);

	return (
		<div className="h-full flex flex-col p-4 relative">
			<div className="flex justify-between items-center mb-3 shrink-0">
				<Text strong style={{ color: token.colorText }}>&#123; &#125; متغیرها</Text>
			</div>

			<Text type="secondary" className="text-[11px] block mb-3 leading-relaxed shrink-0">
				روی هر متغیر کلیک کنید تا در محل مکان‌نما درج شود.
			</Text>

			<Input
				prefix={<SearchOutlined style={{ color: token.colorTextDescription }} />}
				placeholder="جستجوی متغیر..."
				value={query}
				onChange={e => setQuery(e.target.value)}
				className="mb-4 flex-shrink-0"
			/>

			<Spin spinning={isFetchingCatalog} tip="در حال به‌روزرسانی..." wrapperClassName="flex-1 min-h-0 overflow-hidden flex flex-col">
				<div className={`flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1 pb-10 transition-opacity duration-300 ${isFetchingCatalog ? "opacity-50" : "opacity-100"}`}>
					{
						staticGroupsWithBlocks.length > 0
						// eslint-disable-next-line style/multiline-ternary
							? (
								<Collapse
									ghost
									size="small"
									expandIcon={DownCircleOutlined}
									expandIconPosition="end"
									defaultActiveKey={staticGroupsWithBlocks.map((g: any) => g.group)}
									items={staticGroupsWithBlocks.map((group: any) => ({
										key: group.group,
										label: <span className="text-[11px] font-bold" style={{ color: token.colorTextDescription }}>{group.label}</span>,
										children: (
											<div className="space-y-1.5 pt-1">
												{group.blocks.map((block: any, blockIdx: number) => block.type === "singles"
													? (
														<div key={`singles-${blockIdx}`} className="flex flex-wrap gap-1.5">
															{block.variables.map((variable: any) => <VariableButton key={variable.key} variable={variable} onInsert={handleInsert} />)}
														</div>
													)
													: (
														<FamilySlotBlock key={block.prefix} block={block} visibleCount={resolveVisibleCount(block.prefix)} onRevealNext={() => revealNextSlot(block.prefix, block.maxIndex)} onCollapse={() => collapseFamily(block.prefix)} onInsert={handleInsert} />
													))}
											</div>
										),
									}))}
								/>
							) : (
								<div className="text-center mt-6 text-xs text-gray-400">
									سرویس و نوع سند را انتخاب کنید.
								</div>
							)
					}
				</div>
			</Spin>
		</div>
	);
}
