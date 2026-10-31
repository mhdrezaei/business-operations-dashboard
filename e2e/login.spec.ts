import { expect, test } from "@playwright/test";

test.describe("login & navigation flow", () => {
	test("redirects unauthenticated user to /login", async ({ page }) => {
		await page.goto("/");
		await expect(page).toHaveURL(/.*\/login/);
	});

	test("renders login form with username and password fields", async ({ page }) => {
		await page.goto("/login");

		// Check header with logos
		await expect(page.locator("header")).toBeVisible();

		// Check username and password fields
		const usernameInput = page.locator("input[id*='username'], input[name*='username']").first();
		const passwordInput = page.locator("input[type='password']").first();

		await expect(usernameInput).toBeVisible();
		await expect(passwordInput).toBeVisible();
	});

	test("shows validation when submitting empty login form", async ({ page }) => {
		await page.goto("/login");

		const submitButton = page.locator("button[type='submit']").first();
		if (await submitButton.isVisible()) {
			await submitButton.click();
			// Ant Design form validation error appears
			await expect(page.locator(".ant-form-item-explain-error").first()).toBeVisible();
		}
	});
});
