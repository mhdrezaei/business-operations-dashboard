// src/features/contract-templates/create/components/editor/ui/VariableChip.tsx
import type { NodeViewProps } from "@tiptap/react";
import { CloseOutlined } from "@ant-design/icons";
import { NodeViewWrapper } from "@tiptap/react";
import { theme } from "antd";
import React from "react";
import { getVariable } from "../variables/registry";

export default function VariableChip({ node, deleteNode }: NodeViewProps) {
	const { token } = theme.useToken();

	const key = node.attrs.key as string;

	const variableDef = getVariable(key);
	const label = variableDef ? variableDef.label : key;

	return (
		<NodeViewWrapper as="span" className="inline-block align-baseline mx-1" dir="rtl">
			<span
				contentEditable={false}
				title={`{$${key}}`}
				className="inline-flex items-center text-primary  gap-1 rounded-md border-primary border px-2 py-1 pl-0 text-xs font-medium leading-none select-none transition-colors"

			>
				{label}
				<button
					type="button"
					onClick={deleteNode}
					className="flex items-center justify-center p-0.5 rounded-full transition-colors ml-1 cursor-pointer"
					onMouseEnter={e => (e.currentTarget.style.color = token.colorError)}
					onMouseLeave={e => (e.currentTarget.style.color = token.colorTextSecondary)}
				>
					<CloseOutlined style={{ fontSize: "9px" }} />
				</button>
			</span>
		</NodeViewWrapper>
	);
}
