import { server } from "#tests/mocks";
import { renderWithProviders, screen, waitFor } from "#tests/test-utils";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { HomeNotificationsCard } from "./HomeNotificationsCard";

describe("homeNotificationsCard integration", () => {
	it("renders nothing when there are no notifications in the inbox", async () => {
		server.use(
			http.get("*/api/v1/notifications/inbox/", () => {
				return HttpResponse.json({
					count: 0,
					results: [],
					unread_count: 0,
				});
			}),
		);

		const { container } = renderWithProviders(<HomeNotificationsCard />);

		// Initially or after loading empty data, it returns null
		await waitFor(() => {
			expect(container).toBeEmptyDOMElement();
		});
	});

	it("fetches and displays recent notifications with unread badge", async () => {
		server.use(
			http.get("*/api/v1/notifications/inbox/", ({ request }) => {
				const url = new URL(request.url);
				const isReadFilter = url.searchParams.get("is_read");

				// Handle unread count request
				if (isReadFilter === "false") {
					return HttpResponse.json({
						count: 2,
						unread_count: 2,
						results: [],
					});
				}

				// Handle main inbox list
				return HttpResponse.json({
					count: 2,
					unread_count: 2,
					results: [
						{
							id: 101,
							title: "قرارداد جدید ثبت شد",
							message: "قرارداد شماره ۱۲۳ ایجاد گردید.",
							created_at: "2026-03-20T10:00:00Z",
							is_read: false,
							event_type: "CONTRACT_CREATED",
							rule: {
								id: 1,
								code: "CONTRACT_STATUS",
								name: "وضعیت قرارداد",
							},
						},
						{
							id: 102,
							title: "هشدار صورت‌حساب مالی",
							message: "سررسید پرداخت نزدیک است.",
							created_at: "2026-03-21T11:00:00Z",
							is_read: true,
							event_type: "FINANCIAL_ALERT",
							rule: {
								id: 2,
								code: "FINANCIAL",
								name: "مالی",
							},
						},
					],
				});
			}),
		);

		renderWithProviders(<HomeNotificationsCard />);

		// Wait for MSW response to resolve and UI to render
		expect(await screen.findByText("قرارداد جدید ثبت شد")).toBeInTheDocument();
		expect(screen.getByText("هشدار صورت‌حساب مالی")).toBeInTheDocument();

		// Check the view all link is present
		const viewAllLink = screen.getByRole("link", { name: /مشاهده همه|view all/i });
		expect(viewAllLink).toHaveAttribute("href", "/notifications");

		// Check unread badge presence
		expect(screen.getByText("2")).toBeInTheDocument();
	});

	it("handles API failure gracefully without crashing the view", async () => {
		server.use(
			http.get("*/api/v1/notifications/inbox/", () => {
				return HttpResponse.json({ detail: "Internal Server Error" }, { status: 500 });
			}),
		);

		const { container } = renderWithProviders(<HomeNotificationsCard />);

		// Under server error, recent is empty array, component returns null
		await waitFor(() => {
			expect(container).toBeEmptyDOMElement();
		});
	});
});
