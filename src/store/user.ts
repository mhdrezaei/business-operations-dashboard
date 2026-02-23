import type { UserInfoType } from "#src/api/user/types";
import { fetchAuditAccess, fetchUserInfo } from "#src/api/user";

import { create } from "zustand";

const initialState: UserInfoType = {
	id: "",
	is_staff: false,
	is_superuser: false,
	avatar: "",
	first_name: "",
	last_name: "",
	username: "",
	email: "",
	phoneNumber: "",
	description: "",
	roles: [],
	domains: [],
	company_visible_cards: [],
	services: [],
	portal_viewer: null,
	// menus: [],
};

type UserState = UserInfoType;

interface UserAction {
	getUserInfo: () => Promise<UserInfoType>
	reset: () => void
};

export const useUserStore = create<UserState & UserAction>()(

	set => ({
		...initialState,

		getUserInfo: async () => {
			const [profile, accessSnapshot] = await Promise.all([
				fetchUserInfo(),
				fetchAuditAccess(),
			]);

			const response: UserInfoType = {
				...profile,
				roles: accessSnapshot.roles ?? profile.roles ?? [],
				domains: accessSnapshot.domains ?? [],
				company_visible_cards: accessSnapshot.company_visible_cards ?? [],
				services: accessSnapshot.services ?? [],
				portal_viewer: accessSnapshot.portal_viewer ?? null,
			};

			set({
				...response,
			});
			return response;
		},

		reset: () => {
			return set({
				...initialState,
			});
		},

	}),

);
