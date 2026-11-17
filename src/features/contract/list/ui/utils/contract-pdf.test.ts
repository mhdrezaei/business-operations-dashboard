import type { ContractListItemType } from "../../model/contracts.list.types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { openContractPdfPrint } from "./contract-pdf";

describe("contract-pdf - openContractPdfPrint", () => {
	let mockWin: {
		document: {
			open: ReturnType<typeof vi.fn>
			write: ReturnType<typeof vi.fn>
			close: ReturnType<typeof vi.fn>
		}
		focus: ReturnType<typeof vi.fn>
		print: ReturnType<typeof vi.fn>
	};
	let capturedHtml = "";

	const baseRecord: ContractListItemType = {
		id: 101,
		company_id: 1,
		company_name: "شرکت داده‌پرداز",
		service_id: 2,
		service_name: "سرویس پیامک",
		contract_number: "CTR-101",
		start_date: "2026-03-21",
		end_date: "2027-03-20",
		start_jy: 1405,
		start_jm: 1,
		end_jy: 1405,
		end_jm: 12,
		is_official: true,
		is_business_approved: true,
		is_signed: true,
		real_signed_at: null,
		addenda_count: 2,
	};

	beforeEach(() => {
		capturedHtml = "";
		mockWin = {
			document: {
				open: vi.fn(),
				write: vi.fn((html: string) => {
					capturedHtml = html;
				}),
				close: vi.fn(),
			},
			focus: vi.fn(),
			print: vi.fn(),
		};
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	function printContract(record = baseRecord, detail: Record<string, any> = {}) {
		vi.spyOn(window, "open").mockReturnValue(mockWin as unknown as Window);
		openContractPdfPrint({ record, detail });
		return capturedHtml;
	}

	it("throws POPUP_BLOCKED error when window.open returns null", () => {
		vi.spyOn(window, "open").mockReturnValue(null);

		expect(() => openContractPdfPrint({ record: baseRecord, detail: {} })).toThrow("POPUP_BLOCKED");
	});

	it("opens window with expected popup dimensions, writes HTML and closes document", () => {
		const openSpy = vi.spyOn(window, "open").mockReturnValue(mockWin as unknown as Window);

		openContractPdfPrint({ record: baseRecord, detail: {} });

		expect(openSpy).toHaveBeenCalledWith("", "_blank", "width=1100,height=860");
		expect(mockWin.document.open).toHaveBeenCalledTimes(1);
		expect(mockWin.document.write).toHaveBeenCalledTimes(1);
		expect(mockWin.document.close).toHaveBeenCalledTimes(1);
	});

	it("focuses and triggers print after 350ms timeout", () => {
		vi.useFakeTimers();
		vi.spyOn(window, "open").mockReturnValue(mockWin as unknown as Window);

		openContractPdfPrint({ record: baseRecord, detail: {} });

		expect(mockWin.focus).not.toHaveBeenCalled();
		expect(mockWin.print).not.toHaveBeenCalled();

		vi.advanceTimersByTime(350);

		expect(mockWin.focus).toHaveBeenCalledTimes(1);
		expect(mockWin.print).toHaveBeenCalledTimes(1);
	});

	describe("xSS prevention and HTML escaping (escapeHtml)", () => {
		it("escapes dangerous HTML characters in company name, description, and contract ID", () => {
			const xssDetail = {
				id: 202,
				company: { name: "<script>alert('xss')</script>&\"test\"" },
				note: "توضیحات <img src=x onerror=alert(1)> & 'quote'",
				service: { name: "سرویس <test>" },
			};

			const html = printContract(baseRecord, xssDetail);

			expect(html).not.toContain("<script>");
			expect(html).not.toContain("<img src=x onerror=alert(1)>");
			expect(html).toContain("&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;&amp;&quot;test&quot;");
			expect(html).toContain("توضیحات &lt;img src=x onerror=alert(1)&gt; &amp; &#39;quote&#39;");
			expect(html).toContain("سرویس &lt;test&gt;");
		});

		it("falls back to '-' when optional values are null or undefined", () => {
			const emptyDetail = {
				id: 999,
				company: null,
				service: null,
				note: null,
			};
			const recordWithoutNames = { ...baseRecord, company_name: undefined, service_name: undefined };

			const html = printContract(recordWithoutNames as unknown as ContractListItemType, emptyDetail);

			expect(html).toContain("<div class=\"label\">شرکت</div><div class=\"value\">-</div>");
			expect(html).toContain("<div class=\"label\">سرویس</div><div class=\"value\">-</div>");
			expect(html).toContain("<div class=\"label\">توضیحات</div><div class=\"value\">-</div>");
		});
	});

	describe("persian formatting for dates and numbers (formatFaDate & formatFaNumber)", () => {
		it("formats Jalali year and month names correctly in header metadata", () => {
			const detail = {
				start_jy: 1404,
				start_jm: 1, // فروردین
				end_jy: 1404,
				end_jm: 12, // اسفند
			};

			const html = printContract(baseRecord, detail);

			expect(html).toMatch(/۱[٬,]۴۰۴ فروردین/);
			expect(html).toMatch(/۱[٬,]۴۰۴ اسفند/);
		});

		it("handles mid-year Jalali months correctly", () => {
			const detail = {
				start_jy: 1403,
				start_jm: 7, // مهر
				end_jy: 1403,
				end_jm: 11, // بهمن
			};

			const html = printContract(baseRecord, detail);

			expect(html).toMatch(/۱[٬,]۴۰۳ مهر/);
			expect(html).toMatch(/۱[٬,]۴۰۳ بهمن/);
		});

		it("outputs '-' when year or month is invalid or missing", () => {
			const detail = {
				start_jy: null,
				start_jm: null,
				end_jy: 0,
				end_jm: 0,
			};
			const recordWithoutDates = { ...baseRecord, start_jy: null, start_jm: null, end_jy: null, end_jm: null };

			const html = printContract(recordWithoutDates as unknown as ContractListItemType, detail);

			expect(html).toContain("<div class=\"label\">شروع قرارداد</div><div class=\"value\">-</div>");
			expect(html).toContain("<div class=\"label\">پایان قرارداد</div><div class=\"value\">-</div>");
		});

		it("formats numbers with Persian digits and digit grouping", () => {
			const recordWithHighCount = { ...baseRecord, addenda_count: 1250 };
			const html = printContract(recordWithHighCount, { addenda: [] });

			// Persian formatted 1,250
			expect(html).toMatch(/۱[٬,]۲۵۰/);
		});
	});

	describe("addenda rendering (renderAddenda)", () => {
		it("renders empty state message when contract has no addenda", () => {
			const html = printContract(baseRecord, { addenda: [] });

			expect(html).toContain("<p class=\"empty\">الحاقیه‌ای برای این قرارداد ثبت نشده است.</p>");
			expect(html).not.toContain("class=\"addenda-list\"");
		});

		it("renders empty state message when addenda is not an array", () => {
			const html = printContract(baseRecord, { addenda: null });

			expect(html).toContain("<p class=\"empty\">الحاقیه‌ای برای این قرارداد ثبت نشده است.</p>");
		});

		it("renders list of addenda with title, description, and Jalali date range", () => {
			const detailWithAddenda = {
				addenda: [
					{
						description: "الحاقیه تمدید مدت قرارداد",
						start_jy: 1405,
						start_jm: 1,
						end_jy: 1405,
						end_jm: 6,
					},
					{
						note: "الحاقیه تغییر تعرفه",
						start_jy: 1405,
						start_jm: 7,
						end_jy: 1405,
						end_jm: 12,
					},
				],
			};

			const html = printContract(baseRecord, detailWithAddenda);

			expect(html).toContain("class=\"addenda-list\"");
			expect(html).toContain("الحاقیه ۱");
			expect(html).toContain("الحاقیه تمدید مدت قرارداد");
			expect(html).toMatch(/۱[٬,]۴۰۵ فروردین تا ۱[٬,]۴۰۵ شهریور/);

			expect(html).toContain("الحاقیه ۲");
			expect(html).toContain("الحاقیه تغییر تعرفه");
			expect(html).toMatch(/۱[٬,]۴۰۵ مهر تا ۱[٬,]۴۰۵ اسفند/);
		});

		it("escapes addenda description and handles missing fields gracefully", () => {
			const detailWithMalformedAddenda = {
				addenda: [
					{
						description: "<b>تغییرات</b>",
						start_jy: null,
						start_jm: null,
					},
				],
			};

			const html = printContract(baseRecord, detailWithMalformedAddenda);

			expect(html).toContain("&lt;b&gt;تغییرات&lt;/b&gt;");
			expect(html).toContain("- تا -");
		});
	});

	describe("pricing sections rendering (resolvePricingSections)", () => {
		it("renders nothing for contracts without pricing details (e.g. SMS contracts)", () => {
			const html = printContract(baseRecord, {});

			expect(html).not.toContain("جزئیات اصلی قرارداد");
		});

		it("renders traffic locations with location titles, calculation types, and tiers", () => {
			const trafficDetail = {
				locations: [
					{
						location: "TEHRAN",
						calculation_type: "FLAT",
						tiers: [
							{ min_inclusive: 0, max_exclusive: 1000, rate_per_unit: 50 },
						],
					},
					{
						location: "COUNTY",
						calculation_type: "TIER_PROGRESSIVE",
						tiers: [],
					},
				],
			};

			const html = printContract(baseRecord, trafficDetail);

			expect(html).toContain("جزئیات اصلی قرارداد");
			expect(html).toContain("ترافیک تهران");
			expect(html).toContain("نوع: ثابت");
			expect(html).toContain("ترافیک مراکز استان‌ها");
			expect(html).toContain("نوع: پلکانی متغیر");
			expect(html).toContain("داده‌ای ثبت نشده است.");
		});

		it("renders OpenAPI PACKAGE model with bill inquiry and receipt register package tiers", () => {
			const packageDetail = {
				contract_openapi_details: {
					contract_model: "PACKAGE",
					package_model: {
						tiers: [
							{
								bill_min_inclusive: 0,
								bill_max_exclusive: 500,
								bill_inquiry_rate: { tiers: [{ rate_per_unit: 100 }] },
								sms_sale_rate: { tiers: [{ rate_per_unit: 80 }] },
							},
						],
					},
				},
			};

			const html = printContract(baseRecord, packageDetail);

			expect(html).toContain("جزئیات اصلی قرارداد");
			expect(html).toContain("استعلام قبض</h3>");
			expect(html).toContain("ثبت وصولی</h3>");
			expect(html).toContain("نوع: بسته‌ای");
		});

		it("renders OpenAPI standard model with bill_inquiry and receipt_register calculation types", () => {
			const standardOpenapiDetail = {
				contract_openapi_details: {
					contract_model: "STANDARD",
					bill_inquiry: {
						calculation_type: "TIER_SINGLE",
						tiers: [
							{ min_inclusive: 0, max_exclusive: 100, rate_per_unit: 15 },
						],
					},
					receipt_register: {
						calculation_type: "TIER_MIXED",
						tiers: [
							{ min_inclusive: 0, max_exclusive: 200, rate_per_unit: 25 },
						],
					},
				},
			};

			const html = printContract(baseRecord, standardOpenapiDetail);

			expect(html).toContain("جزئیات اصلی قرارداد");
			expect(html).toContain("استعلام قبض</h3>");
			expect(html).toContain("نوع: پلکانی ثابت");
			expect(html).toContain("ثبت وصولی</h3>");
			expect(html).toContain("نوع: تلفیقی");
		});
	});
});
