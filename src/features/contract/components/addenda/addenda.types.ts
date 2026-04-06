export interface AddendumValue {
	startYear: number | null
	startMonth: number | null
	endYear: number | null
	endMonth: number | null
	contractNumber?: string
	description?: string
	pricing: any
	contractPricing?: any
}

export const defaultAddendumValue: AddendumValue = {
	startYear: null,
	startMonth: null,
	endYear: null,
	endMonth: null,
	contractNumber: "",
	description: "",
	pricing: {
		type: null,
		fixedAmount: null,
		rows: [
			{ from: null, to: null, fee: null },
			{ from: null, to: null, fee: null },
		],
		sections: [{
			mode: null,
			rows: [
				{ from: null, to: null, fee: null },
				{ from: null, to: null, fee: null },
			],
		}],
	},
	contractPricing: {
		type: null,
		fixedAmount: null,
		rows: [
			{ from: null, to: null, fee: null },
			{ from: null, to: null, fee: null },
		],
		sections: [{
			mode: null,
			rows: [
				{ from: null, to: null, fee: null },
				{ from: null, to: null, fee: null },
			],
		}],
	},
};
