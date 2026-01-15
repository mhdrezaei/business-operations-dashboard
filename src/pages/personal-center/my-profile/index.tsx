import { BasicContent, FormAvatarItem } from "#src/components";
import { useUserStore } from "#src/store";

import {
	ProForm,
	ProFormDigit,
	ProFormText,
	ProFormTextArea,
} from "@ant-design/pro-components";
import { Form, Input } from "antd";

export default function Profile() {
	const currentUser = useUserStore();
	const getAvatarURL = () => {
		if (currentUser) {
			if (currentUser.avatar) {
				return currentUser.avatar;
			}
			const url = "https://avatar.vercel.sh/blur.svg?text=2";
			return url;
		}
		return "";
	};

	const handleFinish = async () => {
		window.$message?.success("به‌روزرسانی اطلاعات پایه با موفقیت انجام شد");
	};

	return (
		<BasicContent className="max-w-md ml-10">
			<h3>اطلاعات من</h3>
			<ProForm
				layout="vertical"
				onFinish={handleFinish}
				initialValues={{
					...currentUser,
					avatar: getAvatarURL(),
				}}
				requiredMark
			>
				<Form.Item
					name="avatar"
					label="آواتار"
					rules={[
						{
							required: true,
							message: "لطفاً نام نمایشی خود را وارد کنید!",
						},
					]}
				>
					<FormAvatarItem />
				</Form.Item>
				<ProFormText
					name="username"
					label="نام کاربری"
					rules={[
						{
							required: true,
							message: "لطفاً نام کاربری خود را وارد کنید!",
						},
					]}
				/>
				<ProFormText
					name="email"
					label="ایمیل"
					rules={[
						{
							required: true,
							message: "لطفاً ایمیل خود را وارد کنید!",
						},
					]}
				/>
				<ProFormDigit
					name="phoneNumber"
					label="شماره تماس"
					rules={[
						{
							required: true,
							message: "لطفاً شماره تماس خود را وارد کنید!",
						},
					]}
				>
					<Input type="tel" allowClear />
				</ProFormDigit>
				<ProFormTextArea
					allowClear
					name="description"
					label="معرفی شخصی"
					placeholder="معرفی شخصی"
				/>
			</ProForm>
		</BasicContent>
	);
};
