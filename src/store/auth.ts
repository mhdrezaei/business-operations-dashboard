import type { AuthType } from "#src/api/user/types";
import type { PasswordLoginFormType } from "#src/pages/login/components/password-login";
import { fetchLogin, fetchLogout } from "#src/api/user";
import { useAccessStore, useTabsStore, useUserStore } from "#src/store";
import { getAppNamespace } from "#src/utils";

import { create } from "zustand";
import { persist } from "zustand/middleware";

const initialState = {
	access: "",
	refresh: "",
};

type AuthState = Pick<AuthType, "access" | "refresh">;

interface AuthAction {
	login: (loginPayload: PasswordLoginFormType) => Promise<unknown>
	logout: () => Promise<void>
	reset: () => void
};

export const useAuthStore = create<AuthState & AuthAction>()(

	persist((set, get) => ({
		...initialState,

		login: async (loginPayload) => {
			const response = await fetchLogin(loginPayload);
			console.warn(response, "Res");
			return set({
				access: response.access,
				refresh: response.refresh,
			});
		},

		logout: async () => {
			/**
			 * 1. خروج از سيستم
			 */

			await fetchLogout();
			/**
			 * 2. پاک کردن token و ساير اطلاعات
			 */

			get().reset();
		},

		reset: () => {
			/**
			 * پاک کردن token
			 */
			set({
				...initialState,
			});
			/**
			 * پاک کردن اطلاعات کاربر
			 * @see {@link https://github.com/pmndrs/zustand?tab=readme-ov-file#read-from-state-in-actions | Read from state in actions}
			 */
			useUserStore.getState().reset();

			/**
			 * پاک کردن اطلاعات مجوز
			 * @see https://github.com/pmndrs/zustand?tab=readme-ov-file#readingwriting-state-and-reacting-to-changes-outside-of-components
			 */
			useAccessStore.getState().reset();

			/**
			 * پاک کردن تب ها
			 */
			useTabsStore.getState().resetTabs();

			/**
			 * پاک کردن کش keepAlive
			 * در container-layout بر اساس openTabs کش keepAlive به طور خودکار رفرش مي شود
			 */
		},

	}), { name: getAppNamespace("access-token") }),

);
