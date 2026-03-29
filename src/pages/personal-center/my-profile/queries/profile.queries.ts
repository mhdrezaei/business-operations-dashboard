import { fetchProfile } from "../api/profile.api";

export function userProfileQuery() {
	return {
		queryKey: ["myprofile"],
		queryFn: () => fetchProfile(),
		staleTime: 60_000,
	};
}
