import type { RenderOptions } from "@testing-library/react";
import type { PropsWithChildren, ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import "#src/locales";

export function createTestQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
				gcTime: 0,
			},
			mutations: {
				retry: false,
			},
		},
	});
}

export interface ExtendedRenderOptions extends Omit<RenderOptions, "queries"> {
	queryClient?: QueryClient
	initialEntries?: string[]
}

export function renderWithProviders(
	ui: ReactElement,
	options: ExtendedRenderOptions = {},
) {
	const {
		queryClient = createTestQueryClient(),
		initialEntries = ["/"],
		...renderOptions
	} = options;

	function Wrapper({ children }: PropsWithChildren) {
		return (
			<QueryClientProvider client={queryClient}>
				<MemoryRouter initialEntries={initialEntries}>
					{children}
				</MemoryRouter>
			</QueryClientProvider>
		);
	}

	return {
		user: userEvent.setup(),
		queryClient,
		...render(ui, { wrapper: Wrapper, ...renderOptions }),
	};
}

// eslint-disable-next-line react-refresh/only-export-components
export * from "@testing-library/react";
export { userEvent };
