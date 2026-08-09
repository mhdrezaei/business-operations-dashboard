import type { Editor } from "@tiptap/react";
import { useTemplateStore } from "#src/features/contract-templates/store/useTemplateStore.js";
import {
	AlignCenterOutlined,
	AlignLeftOutlined,
	AlignRightOutlined,
	BgColorsOutlined,
	BoldOutlined,
	BorderOutlined,
	ClearOutlined,
	DeleteOutlined,
	FormatPainterOutlined,
	ItalicOutlined,
	MenuFoldOutlined,
	MenuOutlined,
	MenuUnfoldOutlined,
	MinusOutlined,
	OrderedListOutlined,
	RedoOutlined,
	StrikethroughOutlined,
	TableOutlined,
	UnderlineOutlined,
	UndoOutlined,
	UnorderedListOutlined,
} from "@ant-design/icons";
import { useEditorState } from "@tiptap/react";
import { Button, ColorPicker, Divider, Select, Space, theme, Tooltip } from "antd";
import React, { useMemo } from "react";

const FONT_SIZES = [{ value: "8pt", label: "8pt" }, { value: "10pt", label: "10pt" }, { value: "11pt", label: "11pt" }, { value: "12pt", label: "12pt" }, { value: "14pt", label: "14pt" }, { value: "16pt", label: "16pt" }, { value: "18pt", label: "18pt" }, { value: "24pt", label: "24pt" }, { value: "36pt", label: "36pt" }];
const HEADING_OPTIONS = [{ value: "p", label: "متن عادی" }, { value: "1", label: "تیتر ۱" }, { value: "2", label: "تیتر ۲" }, { value: "3", label: "تیتر ۳" }];
const TABLE_ACTION_OPTIONS = [
	{ value: "addRowAfter", label: "افزودن ردیف بعد" },
	{ value: "addRowBefore", label: "افزودن ردیف قبل" },
	{ value: "deleteRow", label: "حذف ردیف" },
	{ value: "addColumnAfter", label: "افزودن ستون بعد" },
	{ value: "addColumnBefore", label: "افزودن ستون قبل" },
	{ value: "deleteColumn", label: "حذف ستون" },
	{ value: "mergeCells", label: "ادغام سلول‌ها" },
	{ value: "splitCell", label: "تقسیم سلول" },
	{ value: "toggleHeaderRow", label: "ردیف سرستون" },
];

function uniformBlockAttr(state: any, attr: string, fallback: any = null) {
	const { from, to } = state.selection;
	let value: any;
	state.doc.nodesBetween(from, to, (node: any) => {
		if (node.type.name !== "paragraph" && node.type.name !== "heading")
			return;
		const v = node.attrs[attr] ?? fallback;
		if (value === undefined)
			value = v;
		else if (v !== value)
			value = null;
	});
	return value ?? null;
}

function ToolbarBtn({ onClick, active = false, title, disabled = false, icon }: { onClick: () => void, active?: boolean, title: string, disabled?: boolean, icon: React.ReactNode }) {
	const { token } = theme.useToken();
	return (
		<Tooltip title={title} mouseEnterDelay={0.4} placement="bottom">
			<Button
				type={active ? "primary" : "text"}
				ghost={active}
				size="small"
				icon={icon}
				disabled={disabled}
				onMouseDown={(e) => {
					e.preventDefault();
					e.stopPropagation();
				}}
				onClick={onClick}
				className="flex items-center justify-center min-w-[28px]"
				style={active ? { backgroundColor: token.colorPrimaryBg, color: token.colorPrimary } : { border: "none", boxShadow: "none", color: token.colorText }}
			/>
		</Tooltip>
	);
}

export default function EditorToolbar({ editor }: { editor: Editor | null, customFonts?: any[] }) {
	const { token } = theme.useToken();
	const { customFonts } = useTemplateStore();

	const fontFamilyOptions = useMemo(() => [
		{ value: "default", label: "فونت پیش‌فرض" },
		{ value: "Vazirmatn", label: <span style={{ fontFamily: "Vazirmatn" }}>وزیرمتن</span> },
		{ value: "Tahoma", label: <span style={{ fontFamily: "Tahoma" }}>تاهوما</span> },
		{ value: "B Nazanin", label: <span style={{ fontFamily: "B Nazanin" }}>بی نازنین</span> },
		...customFonts.map((font) => {
			const familyName = font.family || font.name;
			return {
				value: familyName,
				label: <span style={{ fontFamily: familyName }}>{font.name}</span>,
			};
		}),
	], [customFonts]);

	const state = useEditorState({
		editor,
		selector: ({ editor: e }) => {
			if (!e)
				return null;
			const align = uniformBlockAttr(e.state, "textAlign", "right");
			const dir = uniformBlockAttr(e.state, "dir", "rtl");
			return {
				bold: e.isActive("bold"),
				italic: e.isActive("italic"),
				underline: e.isActive("underline"),
				strike: e.isActive("strike"),
				bulletList: e.isActive("bulletList"),
				orderedList: e.isActive("orderedList"),
				alignRight: align === "right",
				alignCenter: align === "center",
				alignLeft: align === "left",
				alignJustify: align === "justify",
				ltr: dir === "ltr",
				inTable: e.isActive("table"),
				tableBorderless: e.getAttributes("table").borderless === true,
				fontFamily: e.getAttributes("textStyle").fontFamily || "default",
				fontSize: e.getAttributes("textStyle").fontSize || "default",
				color: e.getAttributes("textStyle").color || token.colorText,
				bgColor: e.getAttributes("highlight").color || "transparent",
				heading1: e.isActive("heading", { level: 1 }),
				heading2: e.isActive("heading", { level: 2 }),
				heading3: e.isActive("heading", { level: 3 }),
				canUndo: e.can().undo(),
				canRedo: e.can().redo(),
			};
		},
	});

	if (!editor || !state)
		return null;
	const chain = () => editor.chain().focus();
	const headingValue = state.heading1 ? "1" : state.heading2 ? "2" : state.heading3 ? "3" : "p";

	const getPopupContainer = (trigger: HTMLElement) => trigger.parentNode as HTMLElement;
	const groupStyle = { backgroundColor: token.colorBgContainer, borderColor: token.colorBorder };

	return (
		<div className="flex flex-wrap justify-center items-center gap-2 p-2 px-3">
			<Space.Compact className="rounded-md border" style={groupStyle}>
				<ToolbarBtn icon={<UndoOutlined />} onClick={() => chain().undo().run()} disabled={!state.canUndo} title="واگرد (Ctrl+Z)" />
				<ToolbarBtn icon={<RedoOutlined />} onClick={() => chain().redo().run()} disabled={!state.canRedo} title="ازنو (Ctrl+Y)" />
				<ToolbarBtn icon={<ClearOutlined />} onClick={() => chain().unsetAllMarks().run()} title="پاک کردن تمام استایل‌ها" />
			</Space.Compact>
			<Divider type="vertical" className="m-0 h-6" style={{ borderColor: token.colorBorder }} />
			<Space.Compact>
				<Select size="small" value={headingValue} options={HEADING_OPTIONS} getPopupContainer={getPopupContainer} onChange={val => val === "p" ? chain().setParagraph().run() : chain().toggleHeading({ level: Number(val) as any }).run()} className="w-28 font-medium" />

				{/* 🔴 اعمال فونت انتخاب شده روی ویرایشگر با setFontFamily */}
				<Select
					size="small"
					value={state.fontFamily}
					options={fontFamilyOptions}
					getPopupContainer={getPopupContainer}
					onChange={val => val === "default" ? chain().unsetFontFamily().run() : chain().setFontFamily(val).run()}
					className="w-32"
				/>

				<Select size="small" value={state.fontSize} options={[{ value: "default", label: "اندازه" }, ...FONT_SIZES]} getPopupContainer={getPopupContainer} onChange={val => val === "default" ? chain().unsetFontSize().run() : chain().setFontSize(val).run()} className="w-20" />
			</Space.Compact>
			<Divider type="vertical" className="m-0 h-6" style={{ borderColor: token.colorBorder }} />
			<Space.Compact className="rounded-md border" style={groupStyle}>
				<ToolbarBtn icon={<BoldOutlined />} onClick={() => chain().toggleBold().run()} active={state.bold} title="ضخیم (Ctrl+B)" />
				<ToolbarBtn icon={<ItalicOutlined />} onClick={() => chain().toggleItalic().run()} active={state.italic} title="مورب (Ctrl+I)" />
				<ToolbarBtn icon={<UnderlineOutlined />} onClick={() => chain().toggleUnderline().run()} active={state.underline} title="زیرخط (Ctrl+U)" />
				<ToolbarBtn icon={<StrikethroughOutlined />} onClick={() => chain().toggleStrike().run()} active={state.strike} title="خط‌خوردگی" />
			</Space.Compact>
			<Space.Compact className="rounded-md border px-1 flex items-center" style={groupStyle}>
				<Tooltip title="رنگ متن" mouseEnterDelay={0.4}>
					<ColorPicker size="small" value={state.color} getPopupContainer={getPopupContainer} onChange={color => chain().setColor(color.toHexString()).run()}>
						<div className="flex items-center justify-center p-1.5 cursor-pointer rounded" style={{ color: token.colorText }}>
							<FormatPainterOutlined style={{ color: state.color === token.colorText ? undefined : state.color }} />
						</div>
					</ColorPicker>
				</Tooltip>
				<Tooltip title="رنگ پس‌زمینه (هایلایت)" mouseEnterDelay={0.4}>
					<ColorPicker size="small" value={state.bgColor} getPopupContainer={getPopupContainer} onChange={color => chain().toggleHighlight({ color: color.toHexString() }).run()}>
						<div className="flex items-center justify-center p-1.5 cursor-pointer rounded" style={{ color: token.colorText }}>
							<BgColorsOutlined style={{ color: state.bgColor === "transparent" || state.bgColor === "#ffffff" ? undefined : state.bgColor }} />
						</div>
					</ColorPicker>
				</Tooltip>
			</Space.Compact>
			<Divider type="vertical" className="m-0 h-6" style={{ borderColor: token.colorBorder }} />
			<Space.Compact className="rounded-md border" style={groupStyle}>
				<ToolbarBtn icon={<AlignRightOutlined />} onClick={() => chain().setTextAlign("right").run()} active={state.alignRight} title="راست‌چین" />
				<ToolbarBtn icon={<AlignCenterOutlined />} onClick={() => chain().setTextAlign("center").run()} active={state.alignCenter} title="وسط‌چین" />
				<ToolbarBtn icon={<AlignLeftOutlined />} onClick={() => chain().setTextAlign("left").run()} active={state.alignLeft} title="چپ‌چین" />
				<ToolbarBtn icon={<MenuOutlined />} onClick={() => chain().setTextAlign("justify").run()} active={state.alignJustify} title="تراز دوطرفه" />
				<ToolbarBtn icon={state.ltr ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={() => state.ltr ? chain().setDirection("rtl").setTextAlign("right").run() : chain().setDirection("ltr").setTextAlign("left").run()} active={state.ltr} title={state.ltr ? "پاراگراف راست‌به‌چپ (فارسی)" : "پاراگراف چپ‌به‌راست (انگلیسی)"} />
			</Space.Compact>
			<Divider type="vertical" className="m-0 h-6" style={{ borderColor: token.colorBorder }} />
			<Space.Compact className="rounded-md border" style={groupStyle}>
				<ToolbarBtn icon={<UnorderedListOutlined />} onClick={() => chain().toggleBulletList().run()} active={state.bulletList} title="لیست نقطه‌ای" />
				<ToolbarBtn icon={<OrderedListOutlined />} onClick={() => chain().toggleOrderedList().run()} active={state.orderedList} title="لیست شماره‌دار" />
				<ToolbarBtn icon={<MinusOutlined />} onClick={() => chain().setHorizontalRule().run()} title="خط جداکننده (افقی)" />
				<ToolbarBtn icon={<TableOutlined />} onClick={() => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} active={state.inTable} title="درج جدول" />
			</Space.Compact>
			{state.inTable && (
				<div className="flex items-center gap-1 pl-2 border-l ml-1" style={{ borderColor: token.colorBorderSecondary }}>
					<Select
						size="small"
						options={TABLE_ACTION_OPTIONS}
						placeholder="عملیات جدول..."
						className="w-32"
						value={null}
						getPopupContainer={getPopupContainer}
						onChange={(action: string) => {
							if (!action)
								return;
							const commands: Record<string, () => void> = {
								addRowAfter: () => chain().addRowAfter().run(),
								addRowBefore: () => chain().addRowBefore().run(),
								deleteRow: () => chain().deleteRow().run(),
								addColumnAfter: () => chain().addColumnAfter().run(),
								addColumnBefore: () => chain().addColumnBefore().run(),
								deleteColumn: () => chain().deleteColumn().run(),
								mergeCells: () => chain().mergeCells().run(),
								splitCell: () => chain().splitCell().run(),
								toggleHeaderRow: () => chain().toggleHeaderRow().run(),
							};
							commands[action]?.();
						}}
					/>
					<Space.Compact className="rounded-md border" style={groupStyle}>
						<ToolbarBtn icon={<BorderOutlined />} onClick={() => chain().updateAttributes("table", { borderless: !state.tableBorderless }).run()} active={state.tableBorderless} title="جدول بدون خط مرزی" />
						<ToolbarBtn icon={<DeleteOutlined className="text-red-500" />} onClick={() => chain().deleteTable().run()} title="حذف کامل جدول" />
					</Space.Compact>
				</div>
			)}
		</div>
	);
}
