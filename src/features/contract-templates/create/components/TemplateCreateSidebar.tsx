import type { Editor } from "@tiptap/react";
import type { HeaderData } from "./editor/ui/HeaderEditor";
import {
	DeleteOutlined,
	FileWordOutlined,
	FunctionOutlined,
	LayoutOutlined,
	PlusOutlined,
	ReloadOutlined,
	SearchOutlined,
	UnorderedListOutlined,
	UploadOutlined,
} from "@ant-design/icons";
import { Alert, Button, Card, Input, Tabs, theme, Typography } from "antd"; // 🔴 اضافه شدن Alert
import React, { useMemo, useState } from "react";

import HeaderEditor from "./editor/ui/HeaderEditor";
import { useVariableRegistry } from "./editor/variables/VariableRegistryContext";

const toFaDigits = (value: any) => String(value ?? "").replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[Number(d)] || d);
const SLOT_KEY_PATTERN = /^(.+?)_(\d{1,2})_.+$/;

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

const { Text } = Typography;

function VariableButton({ variable, onInsert }: { variable: any, onInsert: (key: string) => void }) {
	const { token } = theme.useToken();
	return (
		<Button
			size="small"
			shape="round"
			title={variable.example ? `مثال: ${variable.example}` : `{$${variable.key}}`}
			onClick={() => onInsert(variable.key)}
			style={{
				fontSize: "11px",
				borderColor: token.colorPrimaryBorder,
				color: token.colorPrimary,
				backgroundColor: token.colorPrimaryBg,
				padding: "0 10px",
			}}
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
		<Card
			className="rounded-lg border p-2.5 mb-2 shadow-none"
			bodyStyle={{ padding: 0 }}
			style={{ backgroundColor: token.colorBgElevated, borderColor: token.colorBorderSecondary }}
		>
			<div className="space-y-2.5">
				{shown.map(idx => (
					<div key={idx} className="flex flex-wrap items-center gap-1.5">
						<span
							className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
							style={{ backgroundColor: token.colorFillAlter, color: token.colorTextSecondary }}
						>
							{toFaDigits(idx)}
						</span>
						{block.variablesByIndex.get(idx).map((variable: any) => (
							<VariableButton key={variable.key} variable={variable} onInsert={onInsert} />
						))}
					</div>
				))}
			</div>

			{(hasMore || visibleCount > 1) && (
				<div className="mt-2.5 flex items-center gap-2">
					{hasMore && (
						<Button
							type="dashed"
							size="small"
							onClick={onRevealNext}
							icon={<PlusOutlined />}
							style={{ fontSize: "10px", color: token.colorPrimary, borderColor: token.colorPrimaryBorder }}
							className="flex-1 text-right"
						>
							افزودن مورد بعدی (
							{toFaDigits(visibleCount + 1)}
							{" "}
							از
							{toFaDigits(block.maxIndex)}
							)
						</Button>
					)}
					{visibleCount > 1 && (
						<Button
							type="text"
							size="small"
							onClick={onCollapse}
							title="بازگشت به حالت جمع‌شده"
							icon={<ReloadOutlined />}
							style={{ fontSize: "10px", color: token.colorTextDescription }}
						/>
					)}
				</div>
			)}
		</Card>
	);
}

interface TemplateCreateSidebarProps {
	editor: Editor | null
	headerData: HeaderData
	setHeaderData: (data: HeaderData) => void
}

export default function TemplateCreateSidebar({ editor, headerData, setHeaderData }: TemplateCreateSidebarProps) {
	const { token } = theme.useToken();
	const [query, setQuery] = useState("");
	const [familyVisibleCounts, setFamilyVisibleCounts] = useState<Record<string, number>>({});

	const registry = useVariableRegistry() as any;
	const staticGroups = registry?.staticGroups || [];
	const financialTree = registry?.financialTree || [];
	const financialSupported = registry?.financialSupported ?? true;
	const financialUnsupportedReason = registry?.financialUnsupportedReason || null;

	const handleInsert = (key: string) => {
		if (editor) {
			editor.chain().focus().insertTemplateVariable(key).run();
		}
	};

	const resolveVisibleCount = (prefix: string) => familyVisibleCounts[prefix] ?? 1;
	const revealNextSlot = (prefix: string, maxIndex: number) => setFamilyVisibleCounts(p => ({ ...p, [prefix]: Math.min((p[prefix] || 1) + 1, maxIndex) }));
	const collapseFamily = (prefix: string) => setFamilyVisibleCounts(p => ({ ...p, [prefix]: 1 }));

	const staticGroupsWithBlocks = useMemo(() => {
		const q = query.trim().toLowerCase();
		const filteredGroups = !q
			? staticGroups
			: staticGroups.map((g: any) => ({
				...g,
				variables: g.variables.filter((v: any) => v.label.includes(q) || v.key.toLowerCase().includes(q)),
			})).filter((g: any) => g.variables.length > 0);

		return filteredGroups.map((group: any) => ({
			...group,
			blocks: q ? [{ type: "singles", variables: group.variables }] : buildDisplayBlocks(group.variables),
		}));
	}, [staticGroups, query]);

	const variablesTabContent = (
		<div className="h-full flex flex-col p-4">
			<div className="flex justify-between items-center mb-3 shrink-0">
				<Text strong style={{ color: token.colorText }}>&#123; &#125; متغیرها</Text>
				<Button size="small" type="default" style={{ fontSize: "10px", borderColor: token.colorPrimary, color: token.colorPrimary, backgroundColor: token.colorPrimaryBg }}>
					<UnorderedListOutlined />
					{" "}
					افزودن همه (تست)
				</Button>
			</div>

			<Text type="secondary" className="text-[11px] block mb-3 leading-relaxed shrink-0">
				روی هر متغیر کلیک کنید تا در محل مکان‌نما درج شود. موقع پرینت، مقدار واقعی جایگزین می‌شود.
			</Text>

			<Input
				prefix={<SearchOutlined style={{ color: token.colorTextDescription }} />}
				placeholder="جستجوی متغیر..."
				value={query}
				onChange={e => setQuery(e.target.value)}
				className="mb-4 flex-shrink-0"
			/>

			{/* 🔴 اضافه شدن min-h-0 برای فعال شدن اسکرول داخلی */}
			<div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1 pb-10 space-y-4">
				{staticGroupsWithBlocks.map((group: any) => (
					<div key={group.group}>
						<div className="mb-2 text-[11px] font-bold" style={{ color: token.colorTextDescription }}>
							{group.label}
						</div>
						<div className="space-y-1.5">
							{group.blocks.map((block: any, blockIdx: number) =>
								block.type === "singles"
									? (
										<div key={`singles-${blockIdx}`} className="flex flex-wrap gap-1.5">
											{block.variables.map((variable: any) => (
												<VariableButton key={variable.key} variable={variable} onInsert={handleInsert} />
											))}
										</div>
									)
									: (
										<FamilySlotBlock
											key={block.prefix}
											block={block}
											visibleCount={resolveVisibleCount(block.prefix)}
											onRevealNext={() => revealNextSlot(block.prefix, block.maxIndex)}
											onCollapse={() => collapseFamily(block.prefix)}
											onInsert={handleInsert}
										/>
									),
							)}
						</div>
					</div>
				))}

				{(!query.trim() || financialTree.length > 0 || !financialSupported) && (
					<div>
						<div className="mb-2 text-[11px] font-bold" style={{ color: token.colorTextDescription }}>
							اطلاعات مالی و تسویه
						</div>
						{!financialSupported && (
						/* 🔴 استفاده از Alert استاندارد آنت دیزاین برای پشتیبانی خودکار از دارک مود */
							<Alert
								type="warning"
								showIcon
								message={financialUnsupportedReason || "این سرویس فعلاً متغیر مالی پشتیبانی‌شد‌ه‌ای ندارد."}
								style={{ fontSize: "11px", padding: "8px 12px" }}
							/>
						)}
					</div>
				)}
			</div>
		</div>
	);

	const documentSettingsTabContent = (
		<div className="h-full flex flex-col p-4 space-y-4 overflow-y-auto custom-scrollbar">
			<HeaderEditor header={headerData} onChange={setHeaderData} />

			<div className="rounded-xl border p-4" style={{ backgroundColor: token.colorBgContainer, borderColor: token.colorBorderSecondary }}>
				<div className="flex justify-between items-center mb-4">
					<Text strong className="text-sm">
						<span className="text-lg font-serif mr-1" style={{ color: token.colorPrimary }}>T</span>
						{" "}
						فونت‌ها
					</Text>
					<Button size="small" type="dashed" icon={<UploadOutlined />}>آپلود فونت</Button>
				</div>
				<div className="flex flex-col gap-2">
					{/* 🔴 استفاده از colorBgElevated برای تناسب با دارک/لایت مود */}
					<div className="flex justify-between items-center p-2 rounded border text-xs" style={{ backgroundColor: token.colorBgElevated, borderColor: token.colorBorderSecondary, color: token.colorText }}>
						Vazirmatn (پیش‌فرض)
					</div>
					<div className="flex justify-between items-center p-2 rounded border text-xs" style={{ backgroundColor: token.colorBgElevated, borderColor: token.colorBorderSecondary, color: token.colorText }}>
						B-NAZANIN
						{" "}
						<Button type="text" danger size="small" icon={<DeleteOutlined />} />
					</div>
				</div>
			</div>

			<Button type="primary" ghost block icon={<FileWordOutlined />} className="h-10 mt-2">
				ایمپورت از (docx.) Word
			</Button>
		</div>
	);

	return (
		<div
			className="h-full flex flex-col rounded-xl border shadow-sm"
			style={{ backgroundColor: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
		>
			<Tabs
				defaultActiveKey="1"
				centered
				indicator={{ size: origin => origin - 20, align: "center" }}
				className="h-full flex flex-col custom-tabs"
				items={[
					{ key: "1", label: (
						<span className="text-xs px-2">
							<FunctionOutlined />
							{" "}
							متغیرها
						</span>
					), children: variablesTabContent },
					{ key: "2", label: (
						<span className="text-xs px-2">
							<LayoutOutlined />
							{" "}
							تنظیمات سند
						</span>
					), children: documentSettingsTabContent },
				]}
			/>
		</div>
	);
}
