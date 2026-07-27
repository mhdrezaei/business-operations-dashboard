import { fetchServices } from "#src/api/common/common.api";
import { useQuery } from "@tanstack/react-query";
import { fetchTemplateFonts } from "../api/templates.api";

// هوک دریافت لیست سرویس‌ها
export function useServicesListQuery() {
	return useQuery({
		queryKey: ["common", "services"],
		queryFn: () => fetchServices(),
		staleTime: 5 * 60 * 1000, // 5 دقیقه کش کردن دیتا برای جلوگیری از ریکوئست تکراری
	});
}

// هوک دریافت لیست فونت‌ها
export function useFontsListQuery() {
	return useQuery({
		queryKey: ["templates", "fonts"],
		queryFn: () => fetchTemplateFonts(),
		staleTime: Infinity, // فونت‌ها معمولاً تغییر نمی‌کنند، پس برای همیشه کش می‌شوند
	});
}
