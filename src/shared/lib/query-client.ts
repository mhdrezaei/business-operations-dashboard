import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
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
