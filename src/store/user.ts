import type { UserInfoType } from "#src/api/user/types";
import { fetchUserInfo } from "#src/api/user";

import { create } from "zustand";

const initialState = {
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
			const response = await fetchUserInfo();
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
