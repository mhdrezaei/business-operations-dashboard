import type {
	TelecomFrameDirectoryFilter,
	TelecomFrameDirectoryResource,
} from "#src/features/contract/api/telecom-frame.api";
import { fetchTelecomFrameDirectory } from "#src/features/contract/api/telecom-frame.api";
import { queryOptions } from "@tanstack/react-query";

export function telecomFrameDirectoryQuery(
	resource: TelecomFrameDirectoryResource,
	filter: TelecomFrameDirectoryFilter = {},
	enabled = true,
) {
	return queryOptions({
		queryKey: ["contracts", "telecom-frame", resource, filter],
		enabled,
		queryFn: () => fetchTelecomFrameDirectory(resource, filter),
		staleTime: 5 * 60 * 1000,
	});
}
