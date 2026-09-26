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
		<NodeViewWrapper as="span" className="inline mx-[0.1em] align-baseline" dir="rtl">
			<span
				contentEditable={false}
				title={`{$${key}}`}
				className="text-primary rounded-[0.2em] border-primary border px-[0.3em] py-[0.05em] select-none transition-colors"
				style={{ fontSize: "inherit", fontWeight: "inherit", verticalAlign: "baseline" }}
			>
				{label}
				<button
					type="button"
					onClick={deleteNode}
					className="inline-flex items-center justify-center p-[0.1em] rounded-full transition-colors ml-[0.2em] cursor-pointer"
					onMouseEnter={e => (e.currentTarget.style.color = token.colorError)}
					onMouseLeave={e => (e.currentTarget.style.color = token.colorTextSecondary)}
				>
					<CloseOutlined style={{ fontSize: "0.75em" }} />
				</button>
			</span>
		</NodeViewWrapper>
	);
}
