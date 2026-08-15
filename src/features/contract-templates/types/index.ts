import type { Editor } from "@tiptap/react";

export interface TemplateCreateHeaderProps {
	onClose: () => void
	onOpenPrintPreview?: () => void
}
export interface HeaderData {
	logo_asset_id?: number | null
	logo_data_url?: string | null
	logo_url?: string | null
	show_contract_number?: boolean
	extra_text?: string
}

export interface HeaderEditorProps {
	header: HeaderData
	onChange: (data: HeaderData) => void
}
export interface ProEditorProps {
	editor: Editor | null
	onChange?: (content: string) => void
}
export interface AssetUploadResponse {
	id: number
	file_url: string
}

export interface TemplateFont {
	id: number
	name: string
	family: string
	format: string
	size: number
	file_url: string
}

export interface PaginatedFonts {
	count: number
	next: string | null
	previous: string | null
	results: TemplateFont[]
}
export interface TemplateCreateSidebarProps {
	editor: Editor | null
	headerData: HeaderData
	setHeaderData: (data: HeaderData) => void
	customFonts: TemplateFont[]
	reloadFonts: () => void
}
export interface TemplatePrintPreviewModalProps {
	isOpen: boolean
	onClose: () => void
	editor: Editor | null
	headerData?: HeaderData
	customFonts?: TemplateFont[]
}

type RenderMode = "object" | "text" | "enum" | "money" | "tiers";
type VariableKind = "object" | "scalar";

interface IVariableConstraint {
	slot?: number
	source_paths?: string[]
	nullable_for_document_kind?: boolean
	contract_model?: string
}

export interface IVariableNode {
	key: string
	label: string
	category: string
	kind: VariableKind
	path: string
	supported_financial_model: string[]
	supported_financial_model_labels: any[]
	render_mode: RenderMode
	children: IVariableNode[]
	constraints: IVariableConstraint
	example: any
}

export interface ICatalogResponse {
	service: string
	variant: string | null
	company_type: string | null
	document_kind: string
	variables: IVariableNode[]
}
