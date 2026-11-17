import { beforeEach, describe, expect, it, vi } from "vitest";
import { AUTH_HEADER } from "./constants";

const mocks = vi.hoisted(() => {
	const state = { access: "stale", refresh: "r1" };
	return {
		state,
		fetchRefreshToken: vi.fn(),
		goLogin: vi.fn(),
		kyRetry: vi.fn(),
		rehydrate: vi.fn(async () => {}),
	};
});

vi.mock("#src/api/user", () => ({ fetchRefreshToken: mocks.fetchRefreshToken }));
vi.mock("./go-login", () => ({ goLogin: mocks.goLogin }));
vi.mock("ky", () => ({ default: mocks.kyRetry }));
vi.mock("#src/store", () => ({
	useAuthStore: {
		persist: { rehydrate: mocks.rehydrate },
		getState: () => mocks.state,
		setState: (next: Partial<typeof mocks.state>) => Object.assign(mocks.state, next),
	},
}));

const { refreshTokenAndRetry } = await import("./refresh");

const makeRequest = (token = "stale") => new Request("http://localhost/api", { headers: { [AUTH_HEADER]: `Bearer ${token}` } });
const httpError = (status: number) => Object.assign(new Error(`HTTP ${status}`), { response: { status } });

describe("refreshTokenAndRetry", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		Object.assign(mocks.state, { access: "stale", refresh: "r1" });
		mocks.kyRetry.mockImplementation(async (request: Request) => ({ retriedWith: request.headers.get(AUTH_HEADER) }));
	});

	it("refreshes once, stores the rotated tokens and retries with the new access token", async () => {
		mocks.fetchRefreshToken.mockResolvedValue({ access: "a2", refresh: "r2" });
		const request = makeRequest();

		const response = await refreshTokenAndRetry(request, {});

		expect(mocks.fetchRefreshToken).toHaveBeenCalledWith({ refresh: "r1" });
		expect(mocks.state).toMatchObject({ access: "a2", refresh: "r2" });
		expect(response).toEqual({ retriedWith: "Bearer a2" });
	});

	it("re-reads the persisted tokens before using the refresh token", async () => {
		mocks.fetchRefreshToken.mockResolvedValue({ access: "a2", refresh: "r2" });

		await refreshTokenAndRetry(makeRequest(), {});

		expect(mocks.rehydrate).toHaveBeenCalled();
		expect(mocks.rehydrate.mock.invocationCallOrder[0]).toBeLessThan(mocks.fetchRefreshToken.mock.invocationCallOrder[0]);
	});

	it("reuses an access token another tab already obtained instead of burning the refresh token", async () => {
		mocks.state.access = "from-other-tab";

		const response = await refreshTokenAndRetry(makeRequest("stale"), {});

		expect(mocks.fetchRefreshToken).not.toHaveBeenCalled();
		expect(response).toEqual({ retriedWith: "Bearer from-other-tab" });
	});

	it("shares one refresh between concurrent requests", async () => {
		let resolveRefresh!: (value: { access: string, refresh: string }) => void;
		mocks.fetchRefreshToken.mockReturnValue(new Promise((resolve) => {
			resolveRefresh = resolve;
		}));

		const first = refreshTokenAndRetry(makeRequest(), {});
		const second = refreshTokenAndRetry(makeRequest(), {});
		await vi.waitFor(() => expect(mocks.fetchRefreshToken).toHaveBeenCalledTimes(1));
		resolveRefresh({ access: "a2", refresh: "r2" });

		await expect(first).resolves.toEqual({ retriedWith: "Bearer a2" });
		await expect(second).resolves.toEqual({ retriedWith: "Bearer a2" });
		expect(mocks.fetchRefreshToken).toHaveBeenCalledTimes(1);
	});

	it.each([400, 401])("sends the user to login when the backend rejects the refresh token (%i)", async (status) => {
		mocks.fetchRefreshToken.mockRejectedValue(httpError(status));

		await expect(refreshTokenAndRetry(makeRequest(), {})).rejects.toThrow(`HTTP ${status}`);

		expect(mocks.goLogin).toHaveBeenCalledTimes(1);
	});

	it.each([500, 503])("keeps the session on a server error (%i)", async (status) => {
		mocks.fetchRefreshToken.mockRejectedValue(httpError(status));

		await expect(refreshTokenAndRetry(makeRequest(), {})).rejects.toThrow(`HTTP ${status}`);

		expect(mocks.goLogin).not.toHaveBeenCalled();
	});

	it("keeps the session on a network failure and allows a later refresh", async () => {
		mocks.fetchRefreshToken.mockRejectedValueOnce(new TypeError("Failed to fetch"));
		await expect(refreshTokenAndRetry(makeRequest(), {})).rejects.toThrow("Failed to fetch");
		expect(mocks.goLogin).not.toHaveBeenCalled();

		mocks.fetchRefreshToken.mockResolvedValueOnce({ access: "a2", refresh: "r2" });
		await expect(refreshTokenAndRetry(makeRequest(), {})).resolves.toEqual({ retriedWith: "Bearer a2" });
	});

	it("serialises the refresh through the Web Locks API when available", async () => {
		const request = vi.fn(async (_name: string, task: () => Promise<unknown>) => task());
		vi.stubGlobal("navigator", { ...navigator, locks: { request } });
		mocks.fetchRefreshToken.mockResolvedValue({ access: "a2", refresh: "r2" });

		await refreshTokenAndRetry(makeRequest(), {});

		expect(request).toHaveBeenCalledWith("negah-token-refresh", expect.any(Function));
		vi.unstubAllGlobals();
	});
});
