export interface AddendumValue {
	startYear: number | null
	startMonth: number | null
	endYear: number | null
	endMonth: number | null
	description?: string
	pricing: any
}

export const defaultAddendumValue: AddendumValue = {
	startYear: null,
	startMonth: null,
	endYear: null,
	endMonth: null,
	description: "",
	pricing: {
		type: null,
		fixedAmount: null,
		rows: [{ from: null, to: null, fee: null }],
		sections: [{ mode: null, rows: [{ from: null, to: null, fee: null }] }],
	},
};
