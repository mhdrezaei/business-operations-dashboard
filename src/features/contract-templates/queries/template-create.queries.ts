// src/features/contract-templates/queries/template-create.queries.ts
import { fetchServices } from "#src/api/common/common.api";
import { useQuery } from "@tanstack/react-query";
import { fetchTemplateFonts } from "../api/templates.api";

export function useServicesListQuery() {
	return useQuery({
		queryKey: ["common", "services"],
		queryFn: () => fetchServices(),
		staleTime: 5 * 60 * 1000,
	});
}

export function useFontsListQuery() {
	return useQuery({
		queryKey: ["templates", "fonts"],
		queryFn: () => fetchTemplateFonts(),
		staleTime: Infinity,
	});
}
