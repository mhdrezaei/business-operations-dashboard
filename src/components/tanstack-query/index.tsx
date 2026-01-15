import type { ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false, // آيا هنگام فوکوس پنجره داده ها دوباره دريافت شوند
			refetchOnReconnect: false, // آيا هنگام بازگشت شبکه داده ها دوباره دريافت شوند
			retry: 0, // تعداد تلاش مجدد
		},
		mutations: {
			retry: 0, // تعداد تلاش مجدد
		},
	},
});

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
