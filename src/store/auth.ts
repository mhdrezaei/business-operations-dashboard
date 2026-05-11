import type { AuthType } from "#src/api/user/types";
import type { PasswordLoginFormType } from "#src/pages/login/components/password-login";
import { fetchLogin, fetchOtpLogin } from "#src/api/user";
import { queryClient } from "#src/shared/lib/query-client";
import { useAccessStore, useTabsStore, useUserStore } from "#src/store";
import { getAppNamespace } from "#src/utils";

import { create } from "zustand";
import { persist } from "zustand/middleware";

const initialState = {
	access: "",
	refresh: "",
};

type AuthState = Pick<AuthType, "access" | "refresh">;

interface OtpLoginPayload {
	mobile: string
	otp_code: string
}

interface AuthAction {
	login: (loginPayload: PasswordLoginFormType) => Promise<unknown>
	otpLogin: (payload: OtpLoginPayload) => Promise<unknown>
	logout: () => Promise<void>
	reset: () => void
}

export const useAuthStore = create<AuthState & AuthAction>()(
	persist(
		(set, get) => ({
			...initialState,

			login: async (loginPayload) => {
				const response = await fetchLogin(loginPayload);
				return set({
					access: response.access,
					refresh: response.refresh,
				});
			},

			otpLogin: async (payload) => {
				const response = await fetchOtpLogin(payload);

				// useUserStore.getState().setUser?.(response.user);

				return set({
					access: response.access,
					refresh: response.refresh,
				});
			},

			logout: async () => {
				// فقط پاک کردن توکن‌ها (بدون درخواست HTTP)
				get().reset();
			},

			reset: () => {
				queryClient.removeQueries();
				set({ ...initialState });
				useUserStore.getState().reset();
				useAccessStore.getState().reset();
				useTabsStore.getState().resetTabs();
			},
		}),
		{ name: getAppNamespace("access-token") },
	),
);
