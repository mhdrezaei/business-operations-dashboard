export interface AddendumValue {
	id?: number
	parentAddendumId?: number | null
	displayAddendumNumber?: string
	startYear: number | null
	startMonth: number | null
	endYear: number | null
	endMonth: number | null
	contractNumber?: string
	description?: string
	pricing?: any
	contractPricing?: any
	children?: AddendumValue[]
}

export const defaultAddendumValue: AddendumValue = {
	startYear: null,
	startMonth: null,
	endYear: null,
	endMonth: null,
	contractNumber: "",
	description: "",
	children: [],
};
