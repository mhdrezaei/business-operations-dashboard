import type { ReactNode } from "react";

import { queryClient } from "#src/shared/lib/query-client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

export interface TanstackQueryProps {
	children: ReactNode
}

export function TanstackQuery({ children }: TanstackQueryProps) {
	return (
		<QueryClientProvider client={queryClient}>
			<ReactQueryDevtools initialIsOpen={false} />
			{children}
		</QueryClientProvider>
	);
}
