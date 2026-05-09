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
	role: null,
	admin_role: null,
	domains: [],
	company_visible_cards: [],
	services: [],
	is_service_admin: false,
	is_deputy_service_admin: false,
	service_admin_service_ids: [],
	admin_sections: [],
	admin_section_actions: {},
	deputy_service_admin_id: null,
	deputy_permissions: {
		can_create_users: false,
		can_create_roles: false,
		can_edit_users: false,
		can_assign_roles: false,
		can_manage_policies: false,
	},
	can_manage_users: false,
	can_manage_roles: false,
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
				role: accessSnapshot.role ?? profile.role ?? null,
				admin_role: accessSnapshot.admin_role ?? accessSnapshot.role ?? profile.admin_role ?? profile.role ?? null,
				is_staff: accessSnapshot.is_staff ?? profile.is_staff ?? false,
				domains: accessSnapshot.domains ?? [],
				company_visible_cards: accessSnapshot.company_visible_cards ?? [],
				services: accessSnapshot.services ?? [],
				is_service_admin: accessSnapshot.is_service_admin ?? false,
				is_deputy_service_admin: accessSnapshot.is_deputy_service_admin ?? false,
				service_admin_service_ids: accessSnapshot.service_admin_service_ids ?? [],
				admin_sections: accessSnapshot.admin_sections ?? [],
				admin_section_actions: accessSnapshot.admin_section_actions ?? {},
				deputy_service_admin_id: accessSnapshot.deputy_service_admin_id ?? null,
				deputy_permissions: accessSnapshot.deputy_permissions ?? initialState.deputy_permissions,
				can_manage_users: accessSnapshot.can_manage_users ?? false,
				can_manage_roles: accessSnapshot.can_manage_roles ?? false,
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
