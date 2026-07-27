import { theme } from "antd";
import { useFontsListQuery } from "../../queries/template-create.queries";

export default function TemplateCreateEditor() {
	const { token } = theme.useToken();

	// لود کردن فونت‌ها در پس‌زمینه به محض باز شدن ادیتور
	const { data: fontsData, isLoading: isLoadingFonts } = useFontsListQuery();

	return (
		<div
			className="flex-1 flex flex-col rounded-xl border overflow-hidden"
			style={{ backgroundColor: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
		>
			<div
				className="h-12 border-b flex items-center px-4 gap-2"
				style={{ borderColor: token.colorBorderSecondary }}
			>
				<div style={{ color: token.colorTextDescription }} className="text-sm">
					{isLoadingFonts ? "در حال دریافت فونت‌ها..." : `${fontsData?.results?.length || 0} فونت آماده است`}
				</div>
			</div>

			<div
				className="flex-1 p-6 overflow-y-auto flex justify-center"
				style={{ backgroundColor: token.colorBgLayout }}
			>
				<div className="w-full max-w-4xl h-[1056px] shadow-lg rounded bg-white">
					{/* محتوای ادیتور */}
				</div>
			</div>
		</div>
	);
}
