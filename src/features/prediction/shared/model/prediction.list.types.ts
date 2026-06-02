import type { PredictionServiceCode } from "./prediction.form.types";

export interface PredictionListParams {
	service?: number
	fiscal_year?: number
	company_type?: string
	ordering?: string
	page?: number
	page_size?: number
	search?: string
}

export interface PredictionListRow {
	id: number
	serviceId: number
	serviceCode: PredictionServiceCode
	serviceLabel: string
	fiscalYear: number | null
	preview: string
	note: string
	createdAt: string | null
	updatedAt: string | null
	raw: unknown
}
