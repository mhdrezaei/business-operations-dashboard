import { fetchCompaniesByService, fetchServices } from "#src/api/common/common.api";
import { queryOptions } from "@tanstack/react-query";
import {
	fetchOpenApiPredictionYears,
	fetchPspPredictionYears,
	fetchShahkarPredictionYears,
	fetchSmsPredictionYears,
	fetchTrafficPredictionYears,
} from "../../api/predictions.api";

export function predictionServicesQuery() {
	return queryOptions({
		queryKey: ["common", "services", { domain: "predictions" }],
		queryFn: () => fetchServices({ domain: "predictions" }),
		staleTime: 5 * 60 * 1000,
	});
}

export function predictionCompaniesByServiceQuery(serviceId: number | null | undefined) {
	return queryOptions({
		queryKey: ["common", "companies", "predictions", { serviceId }],
		enabled: !!serviceId,
		queryFn: () => fetchCompaniesByService(serviceId!),
		staleTime: 2 * 60 * 1000,
	});
}

export function openApiPredictionYearsQuery(serviceId: number | null | undefined, enabled = true) {
	return queryOptions({
		queryKey: ["predictions", "openapi", "years", { serviceId }],
		enabled: enabled && !!serviceId,
		queryFn: () => fetchOpenApiPredictionYears(serviceId!),
		staleTime: 30 * 1000,
	});
}

export function pspPredictionYearsQuery(
	serviceId: number | null | undefined,
	companyType?: string | null,
	enabled = true,
) {
	return queryOptions({
		queryKey: ["predictions", "psp", "years", { serviceId, companyType: companyType ?? null }],
		enabled: enabled && !!serviceId,
		queryFn: () => fetchPspPredictionYears(serviceId!, companyType),
		staleTime: 30 * 1000,
	});
}

export function shahkarPredictionYearsQuery(serviceId: number | null | undefined, enabled = true) {
	return queryOptions({
		queryKey: ["predictions", "shahkar", "years", { serviceId }],
		enabled: enabled && !!serviceId,
		queryFn: () => fetchShahkarPredictionYears(serviceId!),
		staleTime: 30 * 1000,
	});
}

export function smsPredictionYearsQuery(
	serviceId: number | null | undefined,
	companyType?: string | null,
	enabled = true,
) {
	return queryOptions({
		queryKey: ["predictions", "sms", "years", { serviceId, companyType: companyType ?? null }],
		enabled: enabled && !!serviceId,
		queryFn: () => fetchSmsPredictionYears(serviceId!, companyType),
		staleTime: 30 * 1000,
	});
}

export function trafficPredictionYearsQuery(
	serviceId: number | null | undefined,
	companyType?: string | null,
	enabled = true,
) {
	return queryOptions({
		queryKey: ["predictions", "traffic", "years", { serviceId, companyType: companyType ?? null }],
		enabled: enabled && !!serviceId,
		queryFn: () => fetchTrafficPredictionYears(serviceId!, companyType),
		staleTime: 30 * 1000,
	});
}
