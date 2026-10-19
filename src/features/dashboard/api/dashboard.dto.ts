/**
 * Response shapes of the Home app endpoints (`/home/dashboard/`, `/home/widgets/`, `/home/widgets/{key}/`).
 * Generated from the backend `api_docs/home/schemas.py`. Amounts and percentages arrive as decimal strings
 * ("12500000000.00"); `percentage` of the `registered-performance-rate*` widgets is the only JSON number.
 */

/** Decimal string with two fraction digits, e.g. "12500000000.00". */
export type DecimalString = string;
/** Gregorian `YYYY-MM-DD`. */
export type IsoDate = string;
/** ISO-8601 with offset. */
export type IsoDateTime = string;

export interface ShPeriod {
	sh_year: number
	sh_month: number
}

export interface ShPeriodRange {
	from: ShPeriod
	to: ShPeriod
}

export type FinancialRange = "1m" | "3m" | "6m" | "12m" | "fiscal_ytd";
export type FinancialMetric = "income" | "expense" | "profit";

export interface MoneyTotals {
	income: DecimalString
	expense: DecimalString
	profit: DecimalString
}

export interface NullableMoney {
	income: DecimalString
	expense: DecimalString | null
	profit: DecimalString | null
}

export interface NullableGrowth {
	income: DecimalString | null
	expense: DecimalString | null
	profit: DecimalString | null
}

export interface Paged {
	count: number
	page: number
	page_size: number
	total_pages: number
}

/** GET /home/dashboard/ — optional keys are removed (not null) when the user lacks access. */
export interface HomeDashboardResponse {
	unregistered_performances_count: number
	active_contracts_count: number
	expiring_contracts_next_3_months_count: number
	income_expense_profit_last_month: Omit<MoneyTotals, "profit"> & { profit?: DecimalString }
	predictions_income_expense_last_month?: Omit<MoneyTotals, "profit"> & { profit?: DecimalString }
	pending_business_approval_count?: number
	pending_sign_approval_count?: number
	total_companies_count?: number
	real_sign_in_progress_count?: number
	real_signed_count?: number
	approved_not_in_sign_flow_count?: number
}

export interface WidgetListItem {
	key: string
	title: string
	chart_type: "line" | "bar" | "pie" | "kpi" | "list"
}

export interface MonthlyPerformancePoint extends ShPeriod, NullableMoney {
	value: DecimalString
}

export interface MonthlyPerformanceSeries {
	service_id: number
	service_code: string
	service_name: string | null
	/** null for services without company_type and for the synthetic total series. */
	company_type: string | null
	/** true for the synthetic "all company types of a service" series. */
	is_total: boolean
	points: MonthlyPerformancePoint[]
}

export interface MonthlyPerformanceResponse {
	series: MonthlyPerformanceSeries[]
	totals: NullableMoney
}

export interface MonthlyPerformanceBreakdownItem extends NullableMoney {
	service_id: number
	service_code: string
	service_name: string | null
	company_id: number
	company_name: string | null
	company_type: string | null
	value: DecimalString
}

export interface MonthlyPerformanceBreakdownResponse extends ShPeriod {
	items: MonthlyPerformanceBreakdownItem[]
}

export interface KpiComparison extends NullableMoney {
	periods: ShPeriod[]
	growth: NullableGrowth
}

export interface KpiRatios {
	/** Percent; profit ÷ income. null when income is zero. */
	profit_margin: DecimalString | null
	/** Percent; expense ÷ income. */
	expense_ratio: DecimalString | null
}

export interface KpiMonthlyRow extends ShPeriod, NullableMoney, KpiRatios {
	mom_growth: NullableGrowth
}

export interface KpiShares {
	income_share: DecimalString | null
	expense_share: DecimalString | null
	/** null when the total profit is ≤ 0. */
	profit_share: DecimalString | null
}

export interface KpiCompanyTypeRow extends NullableMoney, KpiRatios, KpiShares {
	company_type: string
	previous_period: KpiComparison
	year_over_year: KpiComparison
	monthly: KpiMonthlyRow[]
}

export interface KpiServiceRow extends NullableMoney, KpiRatios, KpiShares {
	service_id: number
	service_code: string
	service_name: string | null
	previous_period: KpiComparison
	year_over_year: KpiComparison
	monthly: KpiMonthlyRow[]
	/** Shares are relative to the same service. Empty for services without company_type. */
	by_company_type: KpiCompanyTypeRow[]
}

export interface MonthlyPerformanceKpisResponse {
	totals: NullableMoney & KpiRatios & {
		previous_period: KpiComparison
		year_over_year: KpiComparison
	}
	monthly: KpiMonthlyRow[]
	services: KpiServiceRow[]
}

export interface FinancialComparison extends ShPeriodRange, MoneyTotals {
	growth: NullableGrowth
}

export interface FinancialSummaryResponse {
	range: FinancialRange
	months_count: number
	period: ShPeriodRange
	totals: MoneyTotals
	/** null when the user cannot view predictions. */
	prediction: MoneyTotals | null
	/** actual ÷ prediction × 100. */
	realization: NullableGrowth | null
	previous_period: FinancialComparison
	year_over_year: FinancialComparison
}

export interface IncomeExpenseProfitBreakdownRow {
	service_id: number
	service_code: string
	service_name: string | null
	company_type: string | null
	amount: DecimalString
}

export interface IncomeExpenseProfitResponse {
	/** false: the user has no permitted service for this source; no other field is present. */
	available: boolean
	range?: FinancialRange
	period?: ShPeriodRange
	sh_year?: number
	sh_month?: number
	source?: "actual" | "prediction"
	metric?: FinancialMetric | null
	/** Present only without `metric`. */
	totals?: MoneyTotals
	/** Present only with `metric`. */
	breakdown?: IncomeExpenseProfitBreakdownRow[]
}

export type CompanyFinancialsPeriod = "1m" | "3m" | "6m" | "fiscal_ytd";

export interface CompanyFinancialsRow {
	company_id: number
	company_name: string
	service_id: number
	service_code: string
	service_name: string
	company_type: string | null
	periods: Record<string, MoneyTotals & KpiShares>
}

export interface CompanyFinancialsChartItem {
	company_id: number
	service_id: number
	company_name: string
	service_name: string
	amount: DecimalString
	share: DecimalString | null
}

export interface CompanyFinancialsChart {
	/** Up to 5 top rows with a positive amount. */
	items: CompanyFinancialsChartItem[]
	other: { amount: DecimalString, share: DecimalString | null }
}

export interface CompanyFinancialsResponse extends Paged {
	periods: Record<string, ShPeriodRange>
	/** System-wide totals, independent of service_ids and search. */
	totals: Record<string, MoneyTotals>
	sort_by: FinancialMetric
	sort_period: CompanyFinancialsPeriod
	order: SortOrder
	results: CompanyFinancialsRow[]
	/** Keys: income and expense. */
	chart: Record<string, CompanyFinancialsChart>
}

export type SortOrder = "desc" | "asc";

export interface BusinessApprovalCounts {
	approved: number
	/** Always 0 in the current backend logic. */
	rejected: number
	pending: number
	total: number
}

export interface SignApprovalCounts extends BusinessApprovalCounts {
	/** Not business-approved yet. */
	pending_business_approval: number
}

export interface ApprovalCounts {
	business_approval: BusinessApprovalCounts
	sign_approval: SignApprovalCounts
}

export interface ApprovalCompanyTypeRow extends ApprovalCounts {
	company_type: string
}

export interface ApprovalServiceRow extends ApprovalCounts {
	service_id: number
	service_code: string
	service_name: string
	by_company_type: ApprovalCompanyTypeRow[]
}

export interface ContractsApprovalStatusResponse {
	total: ApprovalServiceRow
	by_service: ApprovalServiceRow[]
}

export interface CountBucket extends ShPeriod {
	count: number
}

export interface ExpiringContractDetail extends ShPeriod {
	service_id: number
	service_code: string
	company_id: number
	company_name: string
	company_type: string | null
	base_contract_id: number
	base_contract_uuid: string
	contract_number: string
	is_addendum: boolean
	addendum_model: string | null
	addendum_group_id: string | null
	display_addendum_number: string | null
	rows: { id: number, attributes?: Record<string, string | null> }[]
	end_date: IsoDate
}

export interface ContractsExpiringResponse {
	buckets: CountBucket[]
	by_service: {
		service_id: number
		service_code: string
		service_name: string
		buckets: CountBucket[]
		by_company_type: { company_type: string, buckets: CountBucket[] }[]
	}[]
	/** Filled only with `detail=1`. */
	details: ExpiringContractDetail[]
}

export interface NotRenewedRow {
	company_id: number
	company_name: string
	company_type: string | null
	service_id: number
	service_code: string
	service_name: string
	contracts_count: number
	last_base_contract_id: number
	last_base_contract_uuid: string
	last_contract_number: string
	last_end_date: IsoDate
	last_end_sh_year: number
	last_end_sh_month: number
	days_since_end: number
}

export interface ContractsNotRenewedResponse extends Paged {
	summary: {
		total: number
		by_service: {
			service_id: number
			service_code: string
			service_name: string
			count: number
			by_company_type: { company_type: string, count: number }[]
		}[]
	}
	results: NotRenewedRow[]
}

export type ApprovalStage = "pending_business_approval" | "pending_sign_approval" | "approved";
export type RealSignState = "not_started" | "in_progress" | "signed";

export interface ContractListRow {
	kind: "contract" | "addendum"
	id: number
	base_contract_id: number
	base_contract_uuid: string
	addendum_model: string | null
	addendum_group_id: string | null
	contract_number: string
	display_addendum_number: string | null
	service_id: number
	service_code: string
	service_name: string
	company_id: number
	company_name: string
	company_type: string | null
	start_date: IsoDate
	start_sh_year: number
	start_sh_month: number
	/** Effective inclusive end. */
	end_date: IsoDate
	end_sh_year: number
	end_sh_month: number
	is_business_approved: boolean | null
	/** Contract-office approval (`is_signed`) — not the real signature. */
	is_signed: boolean | null
	real_signed_at: IsoDateTime | null
	approval_stage: ApprovalStage
	real_sign_state: RealSignState
	is_official: boolean
	real_sign_flow: { id: number, current_step_order: number | null, started_at: IsoDateTime } | null
}

export interface ContractListResponse extends Paged {
	results: ContractListRow[]
}

export interface CompanyListRow {
	id: number
	name: string
	service_id: number
	service_code: string
	service_name: string
	company_type: string | null
	contracts_count: number
	active_contracts_count: number
	has_active_contract: boolean
	active_contract_end_date: IsoDate | null
	last_contract_end_date: IsoDate | null
	contracts: {
		id: number
		contract_number: string
		start_date: IsoDate
		end_date: IsoDate
		is_active: boolean
		is_official: boolean
	}[]
}

export interface CompanyListResponse extends Paged {
	results: CompanyListRow[]
}

export interface RateCounts {
	registered_count: number
	total_count: number
	/** Two fraction digits; null when total_count is zero. */
	percentage: number | null
}

export interface RegisteredPerformanceRateResponse extends ShPeriod, RateCounts {
	by_service: (RateCounts & {
		service_id: number
		service_code: string
		service_name: string
		by_company_type: (RateCounts & { company_type: string })[]
	})[]
}

export interface RegisteredPerformanceRateCompaniesResponse extends ShPeriod, RateCounts, Paged {
	service_id: number
	service_code: string
	service_name: string
	company_type: string | null
	results: { company_id: number, company_name: string, company_type: string | null, registered: boolean }[]
}

export interface UnregisteredPerformancesResponse {
	total: number
	by_service: {
		service_id: number
		service_code: string
		service_name: string
		/** Number of unregistered (company × month) cells. */
		count: number
		by_company_type: { company_type: string, count: number }[]
	}[]
}

export interface UnregisteredPerformancesCompaniesResponse extends Omit<Paged, "count"> {
	service_id: number
	service_code: string
	service_name: string
	company_type: string | null
	/** (company × month) cells. */
	count: number
	/** Companies; the pagination base. */
	companies_count: number
	results: {
		company_id: number
		company_name: string
		company_type: string | null
		unregistered_months_count: number
		unregistered_months: ShPeriod[]
	}[]
}

export type ContractListKey = `list-${"active-contracts" | "all-contracts"}` | `list-stage-${"pending-business-approval" | "pending-sign-approval" | "approved-not-in-sign-flow" | "sign-in-progress" | "signed"}`;

export type KpiListKey = ContractListKey | "list-companies";

export interface WidgetResponseMap extends Record<ContractListKey, ContractListResponse> {
	"company-financials": CompanyFinancialsResponse
	"list-companies": CompanyListResponse
	"contracts-approval-status-details": ContractListResponse
	"contracts-approval-status": ContractsApprovalStatusResponse
	"contracts-expiring": ContractsExpiringResponse
	"contracts-not-renewed": ContractsNotRenewedResponse
	"financial-summary": FinancialSummaryResponse
	"income-expense-profit": IncomeExpenseProfitResponse
	"monthly-performance": MonthlyPerformanceResponse
	"monthly-performance-breakdown": MonthlyPerformanceBreakdownResponse
	"monthly-performance-kpis": MonthlyPerformanceKpisResponse
	"registered-performance-rate": RegisteredPerformanceRateResponse
	"registered-performance-rate-companies": RegisteredPerformanceRateCompaniesResponse
	"unregistered-performances": UnregisteredPerformancesResponse
	"unregistered-performances-companies": UnregisteredPerformancesCompaniesResponse
}

export type WidgetKey = keyof WidgetResponseMap;
