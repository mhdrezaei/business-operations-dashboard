import type { ReactNode } from "react";
import type { TrafficCompanyType } from "./useContractFiltersData";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useContractFiltersData } from "./useContractFiltersData";

describe("useContractFiltersData", () => {
	let queryClient: QueryClient;

	const mockServices = [
		{ id: 1, name: "سرویس ترافیک", code: "traffic" },
		{ id: 2, name: "سرویس پیامک", code: "SMS" },
		{ id: 3, name: "سرویس پی‌اس‌پی", code: " psp " },
		{ id: 4, name: "سرویس اوپن‌ای‌پی‌آی", code: "openapi" },
	];

	const mockCompaniesTraffic = [
		{ id: 101, name: "شرکت اول IXP", company_type: "IXP" },
		{ id: 102, name: "شرکت دوم CP", company_type: "CP" },
		{ id: 103, name: "شرکت سوم TCI", company_type: "TCI" },
		{ id: 104, name: "شرکت چهارم بدون تایپ", company_type: null },
	];

	const mockCompaniesOpenapi = [
		{ id: 201, name: "شرکت عمومی الف", company_type: "PUBLIC" },
		{ id: 202, name: "شرکت عمومی ب", company_type: null },
	];

	const createWrapper = () => {
		return function QueryWrapper({ children }: { children: ReactNode }) {
			return (
				<QueryClientProvider client={queryClient}>
					{children}
				</QueryClientProvider>
			);
		};
	};

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: {
				queries: {
					retry: false,
					gcTime: 0,
					staleTime: Number.POSITIVE_INFINITY,
				},
			},
		});

		// Seed services cache
		queryClient.setQueryData(["common", "services"], {
			results: mockServices,
		});

		// Seed companies cache for services
		queryClient.setQueryData(["common", "companies", { serviceId: 1 }], {
			results: mockCompaniesTraffic,
		});
		queryClient.setQueryData(["common", "companies", { serviceId: 2 }], {
			results: [
				{ id: 301, name: "شرکت پیامک ۱", company_type: "CP" },
				{ id: 302, name: "شرکت پیامک ۲", company_type: "IXP" },
			],
		});
		queryClient.setQueryData(["common", "companies", { serviceId: 3 }], {
			results: [
				{ id: 401, name: "شرکت پی‌اس‌پی ۱", company_type: "CP" },
			],
		});
		queryClient.setQueryData(["common", "companies", { serviceId: 4 }], {
			results: mockCompaniesOpenapi,
		});
	});

	afterEach(() => {
		queryClient.clear();
	});

	describe("initial state without selected service", () => {
		it("provides service options and disables company selector with prompt placeholder", () => {
			const { result } = renderHook(() => useContractFiltersData(null, null), {
				wrapper: createWrapper(),
			});

			expect(result.current.serviceOptions).toEqual([
				{ label: "سرویس ترافیک", value: 1 },
				{ label: "سرویس پیامک", value: 2 },
				{ label: "سرویس پی‌اس‌پی", value: 3 },
				{ label: "سرویس اوپن‌ای‌پی‌آی", value: 4 },
			]);
			expect(result.current.companyOptions).toEqual([]);
			expect(result.current.isTrafficService).toBe(false);
			expect(result.current.isSmsService).toBe(false);
			expect(result.current.isCompanyDisabled).toBe(true);
			expect(result.current.companyPlaceholder).toBe("ابتدا سرویس را انتخاب کنید");
		});
	});

	describe("loading state for companies", () => {
		it("disables company selector and displays loading placeholder while companies query is loading", () => {
			const loadingQueryClient = new QueryClient({
				defaultOptions: {
					queries: {
						retry: false,
						gcTime: 0,
						staleTime: Number.POSITIVE_INFINITY,
						queryFn: () => new Promise(() => {}),
					},
				},
			});
			loadingQueryClient.setQueryData(["common", "services"], { results: mockServices });

			const { result } = renderHook(() => useContractFiltersData(4, null), {
				wrapper: ({ children }: { children: ReactNode }) => (
					<QueryClientProvider client={loadingQueryClient}>
						{children}
					</QueryClientProvider>
				),
			});

			expect(result.current.isCompanyDisabled).toBe(true);
			expect(result.current.companyPlaceholder).toBe("در حال دریافت لیست شرکت‌ها...");
		});
	});

	describe("standard service without company type requirement (e.g. openapi)", () => {
		it("enables company selector directly and shows all companies without requiring company type", () => {
			const { result } = renderHook(() => useContractFiltersData(4, null), {
				wrapper: createWrapper(),
			});

			expect(result.current.isTrafficService).toBe(false);
			expect(result.current.isSmsService).toBe(false);
			expect(result.current.isCompanyDisabled).toBe(false);
			expect(result.current.companyPlaceholder).toBe("شرکت را انتخاب کنید");
			expect(result.current.companyOptions).toEqual([
				{ label: "شرکت عمومی الف", value: 201 },
				{ label: "شرکت عمومی ب", value: 202 },
			]);
		});
	});

	describe("traffic service cascading behavior", () => {
		it("detects traffic service and prompts user to pick company type before companies can be selected", () => {
			const { result } = renderHook(() => useContractFiltersData(1, null), {
				wrapper: createWrapper(),
			});

			expect(result.current.isTrafficService).toBe(true);
			expect(result.current.isSmsService).toBe(false);
			expect(result.current.companyOptions).toEqual([]);
			expect(result.current.isCompanyDisabled).toBe(true);
			expect(result.current.companyPlaceholder).toBe("ابتدا نوع شرکت را انتخاب کنید");
		});

		it("filters companies by selectedTrafficCompanyType when company type is chosen", () => {
			const { result, rerender } = renderHook(
				({ companyType }: { companyType: TrafficCompanyType | null }) =>
					useContractFiltersData(1, companyType),
				{
					wrapper: createWrapper(),
					initialProps: { companyType: "IXP" as TrafficCompanyType | null },
				},
			);

			expect(result.current.isTrafficService).toBe(true);
			expect(result.current.isCompanyDisabled).toBe(false);
			expect(result.current.companyPlaceholder).toBe("شرکت را انتخاب کنید");
			expect(result.current.companyOptions).toEqual([
				{ label: "شرکت اول IXP", value: 101 },
			]);

			// Change to CP
			rerender({ companyType: "CP" });
			expect(result.current.companyOptions).toEqual([
				{ label: "شرکت دوم CP", value: 102 },
			]);

			// Change to TCI
			rerender({ companyType: "TCI" });
			expect(result.current.companyOptions).toEqual([
				{ label: "شرکت سوم TCI", value: 103 },
			]);
		});
	});

	describe("sMS and PSP company-type services", () => {
		it("detects SMS service and enforces company type selection", () => {
			queryClient.setQueryData(["common", "companies", { serviceId: 2 }], {
				results: [
					{ id: 301, name: "شرکت پیامک ۱", company_type: "CP" },
					{ id: 302, name: "شرکت پیامک ۲", company_type: "IXP" },
				],
			});

			const { result, rerender } = renderHook(
				({ companyType }: { companyType: TrafficCompanyType | null }) =>
					useContractFiltersData(2, companyType),
				{
					wrapper: createWrapper(),
					initialProps: { companyType: null as TrafficCompanyType | null },
				},
			);

			expect(result.current.isSmsService).toBe(true);
			expect(result.current.isTrafficService).toBe(false);
			expect(result.current.isCompanyDisabled).toBe(true);
			expect(result.current.companyPlaceholder).toBe("ابتدا نوع شرکت را انتخاب کنید");

			// Provide company type
			rerender({ companyType: "CP" });
			expect(result.current.isCompanyDisabled).toBe(false);
			expect(result.current.companyOptions).toEqual([
				{ label: "شرکت پیامک ۱", value: 301 },
			]);
		});

		it("enforces company type selection for PSP service as well", () => {
			const { result } = renderHook(() => useContractFiltersData(3, null), {
				wrapper: createWrapper(),
			});

			expect(result.current.isTrafficService).toBe(false);
			expect(result.current.isSmsService).toBe(false);
			expect(result.current.isCompanyDisabled).toBe(true);
			expect(result.current.companyPlaceholder).toBe("ابتدا نوع شرکت را انتخاب کنید");
		});
	});

	describe("empty data handling", () => {
		it("safely handles empty services and companies data without errors", () => {
			const emptyQueryClient = new QueryClient({
				defaultOptions: {
					queries: {
						retry: false,
						gcTime: 0,
						staleTime: Number.POSITIVE_INFINITY,
					},
				},
			});
			emptyQueryClient.setQueryData(["common", "services"], { results: [] });
			emptyQueryClient.setQueryData(["common", "companies", { serviceId: 99 }], { results: [] });

			const { result } = renderHook(() => useContractFiltersData(99, null), {
				wrapper: ({ children }: { children: ReactNode }) => (
					<QueryClientProvider client={emptyQueryClient}>
						{children}
					</QueryClientProvider>
				),
			});

			expect(result.current.serviceOptions).toEqual([]);
			expect(result.current.companyOptions).toEqual([]);
		});
	});
});
