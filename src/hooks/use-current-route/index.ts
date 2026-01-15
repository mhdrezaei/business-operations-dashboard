import { useMemo } from "react";
import { useMatches } from "react-router";

/**
 * دريافت اطلاعات مسير فعلي
 *
 * @returns نتيجه تطابق مسير فعلي
 */
export function useCurrentRoute() {
	const matches = useMatches();

	const currentRoute = useMemo(() => {
		const match = matches[matches.length - 1];

		return match;
	}, [matches, location]);

	return currentRoute;
}
