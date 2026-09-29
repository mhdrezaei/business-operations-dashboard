import type { SignFlowPreviewResponse } from "../../../api/contracts.api";
import { PlayCircleOutlined } from "@ant-design/icons";
import { Button, Modal, Spin, theme } from "antd";
import React from "react";
import { usePreferencesStore } from "../../../../../store/preferences";

interface Props {
	open: boolean
	onClose: () => void
	onStart: () => void
	data: SignFlowPreviewResponse | null
	loading: boolean
}

export const SignFlowPreviewModal: React.FC<Props> = ({
	open,
	onClose,
	onStart,
	data,
	loading,
}) => {
	const { token } = theme.useToken();
	const prefTheme = usePreferencesStore(state => state.theme);
	const isDark = prefTheme === "dark" || (prefTheme === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);

	return (
		<Modal
			open={open}
			onCancel={onClose}
			footer={null}
			closable={false}
			width={600}
			rootClassName={isDark ? "dark" : ""}
			styles={{
				content: {
					padding: 0,
					borderRadius: "16px",
					overflow: "hidden",
					border: `1px solid ${token.colorBorderSecondary}`,
				},
				mask: {
					backgroundColor: isDark ? "rgba(0, 0, 0, 0.6)" : "rgba(0, 0, 0, 0.4)",
					backdropFilter: "blur(4px)",
				},
			}}
		>
			<div className="p-6 font-sans transition-colors duration-300" style={{ backgroundColor: token.colorBgElevated, color: token.colorText }} dir="rtl">
				{loading
					? (
						<div className="flex flex-col items-center justify-center py-12">
							<Spin size="large" />
							<div className="mt-4 text-slate-500 dark:text-slate-400">در حال دریافت مراحل تایید...</div>
						</div>
					) : data
						? (
							<div className="flex flex-col gap-4">
								{/* Header Message */}
								<div className="border rounded-xl p-4 text-[15px] leading-relaxed text-center shadow-inner transition-colors duration-300" style={{ backgroundColor: token.colorPrimaryBg, borderColor: token.colorPrimaryBorder, color: token.colorPrimary }}>
									مراحل زیر و افراد تاییدکننده‌ی هرکدام، دقیقاً همین‌ها خواهند بود — شروع کنم؟
								</div>

								{/* Steps List */}
								<div className="flex flex-col gap-3 mt-2">
									{data.steps.map(step => (
										<div
											key={step.order}
											className="border rounded-xl p-4 flex flex-col gap-3 shadow-sm transition-colors duration-300"
											style={{ backgroundColor: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
										>
											<div className="flex justify-between items-center w-full">
												<div className="font-bold text-base" style={{ color: token.colorTextHeading }}>
													مرحله
													{" "}
													{step.order}
													{" "}
													—
													{" "}
													{step.name}
												</div>
											</div>

											<div className="flex flex-wrap gap-2 justify-end">
												{step.resolved_users.length > 0
													? (
														step.resolved_users.map(user => (
															<div
																key={user.user_id}
																className="text-xs px-3 py-1.5 rounded-full border transition-colors duration-300 shadow-sm"
																style={{ backgroundColor: token.colorFillAlter, borderColor: token.colorBorderSecondary, color: token.colorTextSecondary }}
															>
																{user.username}
															</div>
														))
													)
													: (
														<div className="text-xs italic" style={{ color: token.colorTextQuaternary }}>
															بدون تاییدکننده
														</div>
													)}
											</div>
										</div>
									))}

									{data.steps.length === 0 && (
										<div className="text-center py-6" style={{ color: token.colorTextQuaternary }}>
											هیچ مرحله‌ای برای این قرارداد یافت نشد.
										</div>
									)}
								</div>

								{/* Actions */}
								<div className="flex items-center gap-3 mt-4">
									<Button
										size="large"
										className="flex-1 h-12 rounded-xl text-base transition-colors"
										onClick={onClose}
									>
										بازگشت
									</Button>

									<Button
										type="primary"
										size="large"
										icon={<PlayCircleOutlined />}
										className="flex-1 h-12 rounded-xl text-base shadow-lg"
										style={{ boxShadow: `0 4px 14px 0 ${token.colorPrimary}40` }}
										onClick={onStart}
									>
										شروع کن
									</Button>
								</div>
							</div>
						)
						: (
							<div className="text-center text-rose-500 dark:text-rose-400 py-8">
								خطا در دریافت اطلاعات گردش کار.
							</div>
						)}
			</div>
		</Modal>
	);
};
