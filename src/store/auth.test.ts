import { getAppNamespace } from "#src/utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("#src/api/user", () => ({
	fetchLogin: vi.fn(async () => ({ access: "login-access", refresh: "login-refresh" })),
	fetchOtpLogin: vi.fn(async () => ({ access: "otp-access", refresh: "otp-refresh" })),
	fetchRefreshToken: vi.fn(),
}));

vi.mock("#src/store", () => ({
	useAccessStore: { getState: () => ({ reset: vi.fn() }) },
	useTabsStore: { getState: () => ({ resetTabs: vi.fn() }) },
	useUserStore: { getState: () => ({ reset: vi.fn() }) },
}));

const { useAuthStore } = await import("./auth");

const STORAGE_KEY = getAppNamespace("access-token");
const persisted = (access: string, refresh: string) => JSON.stringify({ state: { access, refresh }, version: 0 });

describe("useAuthStore", () => {
	beforeEach(() => {
		localStorage.clear();
		useAuthStore.setState({ access: "", refresh: "" });
	});

	it("stores both tokens on password login", async () => {
		await useAuthStore.getState().login({ username: "u", password: "p" } as never);

		expect(useAuthStore.getState()).toMatchObject({ access: "login-access", refresh: "login-refresh" });
	});

	it("stores both tokens on otp login", async () => {
		await useAuthStore.getState().otpLogin({ mobile: "09120000000", otp_code: "1234" });

		expect(useAuthStore.getState()).toMatchObject({ access: "otp-access", refresh: "otp-refresh" });
	});

	it("clears the tokens on logout", async () => {
		useAuthStore.setState({ access: "a", refresh: "r" });

		await useAuthStore.getState().logout();

		expect(useAuthStore.getState()).toMatchObject({ access: "", refresh: "" });
	});

	it("picks up tokens rotated by another tab through the storage event", async () => {
		useAuthStore.setState({ access: "old-access", refresh: "old-refresh" });
		localStorage.setItem(STORAGE_KEY, persisted("new-access", "new-refresh"));

		window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));

		await vi.waitFor(() => expect(useAuthStore.getState()).toMatchObject({ access: "new-access", refresh: "new-refresh" }));
	});

	it("follows a logout done in another tab", async () => {
		useAuthStore.setState({ access: "a", refresh: "r" });
		localStorage.setItem(STORAGE_KEY, persisted("", ""));

		window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));

		await vi.waitFor(() => expect(useAuthStore.getState()).toMatchObject({ access: "", refresh: "" }));
	});

	it("ignores storage events for other keys", async () => {
		const rehydrate = vi.spyOn(useAuthStore.persist, "rehydrate");

		window.dispatchEvent(new StorageEvent("storage", { key: "something-else" }));

		expect(rehydrate).not.toHaveBeenCalled();
		rehydrate.mockRestore();
	});
});
