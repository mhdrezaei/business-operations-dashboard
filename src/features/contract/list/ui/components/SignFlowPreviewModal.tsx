import type { SignFlowPreviewResponse } from "../../../api/contracts.api";
import { PlayCircleOutlined } from "@ant-design/icons";
import { Button, Modal, Spin } from "antd";
import React from "react";

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
	return (
		<Modal
			open={open}
			onCancel={onClose}
			footer={null}
			closable={false}
			width={600}
			className="modern-dark-modal"
			styles={{
				content: {
					backgroundColor: "#0F172A", // Tailwind slate-900
					padding: 0,
					borderRadius: "16px",
					border: "1px solid #1E293B", // Tailwind slate-800
					boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
				},
				mask: {
					backgroundColor: "rgba(0, 0, 0, 0.6)",
					backdropFilter: "blur(4px)",
				},
			}}
		>
			<div className="p-6 text-slate-200 font-sans" dir="rtl">
				{loading
					? (
						<div className="flex flex-col items-center justify-center py-12">
							<Spin size="large" />
							<div className="mt-4 text-slate-400">در حال دریافت مراحل تایید...</div>
						</div>
					) : data
						? (
							<div className="flex flex-col gap-4">
								{/* Header Message */}
								<div className="bg-indigo-950/40 border border-indigo-900/50 rounded-xl p-4 text-indigo-200 text-[15px] leading-relaxed text-center shadow-inner">
									مراحل زیر و افراد تاییدکننده‌ی هرکدام، دقیقاً همین‌ها خواهند بود — شروع کنم؟
								</div>

								{/* Steps List */}
								<div className="flex flex-col gap-3 mt-2">
									{data.steps.map(step => (
										<div
											key={step.order}
											className="bg-slate-900/80 border border-slate-700/50 rounded-xl p-4 flex flex-col gap-3 shadow-sm hover:border-slate-600 transition-colors"
										>
											<div className="flex justify-between items-center w-full">
												<div className="text-slate-100 font-bold text-base">
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
																className="bg-slate-800/80 text-slate-300 text-xs px-3 py-1.5 rounded-full border border-slate-700/60"
															>
																{user.username}
															</div>
														))
													)
													: (
														<div className="text-slate-500 text-xs italic">
															بدون تاییدکننده
														</div>
													)}
											</div>
										</div>
									))}

									{data.steps.length === 0 && (
										<div className="text-center text-slate-500 py-6">
											هیچ مرحله‌ای برای این قرارداد یافت نشد.
										</div>
									)}
								</div>

								{/* Actions */}
								<div className="flex items-center gap-3 mt-4">
									<Button
										size="large"
										className="flex-1 bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-600 hover:border-slate-500 h-12 rounded-xl text-base transition-colors"
										onClick={onClose}
									>
										بازگشت
									</Button>

									<Button
										type="primary"
										size="large"
										icon={<PlayCircleOutlined />}
										className="flex-1 bg-indigo-600 hover:bg-indigo-500 border-none h-12 rounded-xl text-base shadow-lg shadow-indigo-900/20"
										onClick={onStart}
									>
										شروع کن
									</Button>
								</div>
							</div>
						)
						: (
							<div className="text-center text-rose-400 py-8">
								خطا در دریافت اطلاعات گردش کار.
							</div>
						)}
			</div>
		</Modal>
	);
};
