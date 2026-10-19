import type { CompanyFinancialsPeriod, FinancialMetric } from "#src/features/dashboard/api/dashboard.dto";

export const FINANCIAL_METRICS: FinancialMetric[] = ["income", "expense", "profit"];

/** Range options of the financial cards; the id is the `range` value sent to the API (the backend computes months). */
export const FINANCIAL_RANGES: CompanyFinancialsPeriod[] = ["1m", "3m", "6m", "fiscal_ytd"];
export const DEFAULT_FINANCIAL_RANGE: CompanyFinancialsPeriod = "fiscal_ytd";
