import type { Editor } from "@tiptap/react";
import { FunctionOutlined, LayoutOutlined } from "@ant-design/icons";
import { Tabs, theme } from "antd";
// src/features/contract-templates/create/components/TemplateCreateSidebar.tsx
import React from "react";

import SidebarSettingsTab from "./SidebarSettingsTab";
import SidebarVariablesTab from "./SidebarVariablesTab";

interface SidebarProps {
	editor: Editor | null
}

export default function TemplateCreateSidebar({ editor }: SidebarProps) {
	const { token } = theme.useToken();

	return (
		<div
			className="h-full flex flex-col rounded-xl border shadow-sm overflow-hidden"
			style={{ backgroundColor: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
		>
			<style>
				{`
                .custom-tabs .ant-tabs-content-holder { flex: auto; min-height: 0; overflow: hidden; }
                .custom-tabs .ant-tabs-content, .custom-tabs .ant-tabs-tabpane { height: 100%; }
                .ant-collapse-ghost > .ant-collapse-item > .ant-collapse-content > .ant-collapse-content-box { padding-top: 0 !important; padding-bottom: 8px !important; }
                
                .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(136, 136, 136, 0.35); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgba(136, 136, 136, 0.55); }
                .custom-scrollbar { scrollbar-width: thin; scrollbar-color: rgba(136, 136, 136, 0.35) transparent; }
            `}
			</style>

			<Tabs
				defaultActiveKey="1"
				centered
				indicator={{ size: origin => origin - 20, align: "center" }}
				className="h-full flex flex-col custom-tabs"
				items={[
					{
						key: "1",
						label: (
							<span className="text-xs px-2">
								<FunctionOutlined />
								{" "}
								متغیرها
							</span>
						),
						children: <SidebarVariablesTab editor={editor} />,
					},
					{
						key: "2",
						label: (
							<span className="text-xs px-2">
								<LayoutOutlined />
								{" "}
								تنظیمات سند
							</span>
						),
						children: <SidebarSettingsTab editor={editor} />,
					},
				]}
			/>
		</div>
	);
}
