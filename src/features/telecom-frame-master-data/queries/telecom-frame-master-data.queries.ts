import type { TelecomFrameDirectoryFilter, TelecomFrameDirectoryResource } from "#src/features/contract/api/telecom-frame.api";
import { telecomFrameDirectoryQuery } from "#src/features/contract/shared/queries/telecom-frame.queries";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createTelecomFrameEntry, deleteTelecomFrameEntry, updateTelecomFrameEntry } from "../api/telecom-frame-master-data.api";

/** Same cache key as the contract form's directory pickers, so edits show up there too. */
const DIRECTORY_QUERY_KEY = ["contracts", "telecom-frame"];

export function useMasterDataList(resource: TelecomFrameDirectoryResource, filter: TelecomFrameDirectoryFilter, enabled: boolean) {
	return useQuery({ ...telecomFrameDirectoryQuery(resource, filter, enabled), staleTime: 0 });
}

export function useMasterDataMutations(resource: TelecomFrameDirectoryResource) {
	const queryClient = useQueryClient();
	const invalidate = () => queryClient.invalidateQueries({ queryKey: DIRECTORY_QUERY_KEY });

	return {
		save: useMutation({
			mutationFn: ({ id, payload }: { id?: number, payload: Parameters<typeof createTelecomFrameEntry>[1] }) =>
				id ? updateTelecomFrameEntry(resource, id, payload) : createTelecomFrameEntry(resource, payload),
			onSuccess: invalidate,
		}),
		remove: useMutation({
			mutationFn: (id: number) => deleteTelecomFrameEntry(resource, id),
			onSuccess: invalidate,
		}),
	};
}
