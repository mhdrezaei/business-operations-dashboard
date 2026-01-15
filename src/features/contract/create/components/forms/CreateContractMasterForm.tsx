import { getContractTypeOptions, getMonthTypeOptions, getYearTypeOptions } from "#src/features/contract/constant";
import {
	ProCard,
	ProForm,
	ProFormDatePicker,
	ProFormDependency,
	ProFormSelect,
	ProFormText,
	ProFormTextArea,
	ProFormUploadButton,

} from "@ant-design/pro-components";
import { DatePicker, Form } from "antd";
import { useTranslation } from "react-i18next";

function Contract() {
	const { t } = useTranslation();
	const [form] = Form.useForm<any>();
	const handleFinish = async (e: any) => {
		console.error(e);
		window.$message?.success("به‌روزرسانی اطلاعات پایه با موفقیت انجام شد");
	};
	return (
		<ProCard>

			<h3>ایجاد قرارداد جدید</h3>
			<ProForm
				layout="vertical"
				onFinish={handleFinish}
				requiredMark
				autoFocusFirstInput
				grid
				form={form}
			>
				<ProFormDatePicker />
				<DatePicker format="faIRIntl" />
				<ProFormSelect
					colSize={12}
					name="contractType"
					label={t("contract.formLabel.contractType")}
					options={getContractTypeOptions(t)}
					colProps={{ md: 24, xl: 12 }}
					rules={[
						{
							required: true,
							message: "انتخاب نوع قرارداد الزامی است",

						},

					]}
				/>
				<ProFormSelect
					colSize={12}
					name="companyName"
					label={t("contract.formLabel.companyName")}
					options={["openapi", "psp"]}
					colProps={{ md: 24, xl: 12 }}
					rules={[
						{
							required: true,
							message: "انتخاب نوع قرارداد الزامی است",

						},

					]}
				/>
				<ProFormSelect
					colSize={12}
					name="StartYear"
					label={t("contract.formLabel.startYear")}
					options={getYearTypeOptions()}
					colProps={{ md: 12, xl: 6 }}
					rules={[
						{
							required: true,
							message: "انتخاب سال شروع الزامی است",

						},

					]}
				/>
				<ProFormSelect
					colSize={12}
					name="StartMonth"
					label={t("contract.formLabel.startMonth")}
					options={getMonthTypeOptions(t)}
					colProps={{ md: 12, xl: 6 }}
					rules={[
						{
							required: true,
							message: "انتخاب سال شروع الزامی است",

						},

					]}
				/>
				<ProFormSelect
					colSize={12}
					name="endYear"
					label={t("contract.formLabel.endYear")}
					options={getYearTypeOptions()}
					colProps={{ md: 12, xl: 6 }}
					rules={[
						{
							required: true,
							message: "انتخاب سال شروع الزامی است",

						},

					]}
				/>
				<ProFormSelect
					colSize={12}
					name="endMonth"
					label={t("contract.formLabel.endMonth")}
					options={getMonthTypeOptions(t)}
					colProps={{ md: 12, xl: 6 }}
					rules={[
						{
							required: true,
							message: "انتخاب سال شروع الزامی است",

						},

					]}
				/>
				<ProFormDependency name={["contractType"]}>
					{({ contractType }) => {
						if (contractType === 0) {
							return (
								<>

									<ProFormText placeholder="نوع" />

								</>
							);
						}
					}}
				</ProFormDependency>
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
				<ProFormTextArea label="توضیحان" placeholder="توضیحات" />
				{" "}

				<ProFormUploadButton
					accept="file/*.pdf"
					placeholder="آپلود"
					title="انتخاب فایل های PDF"
					label="فایل‌های قرارداد (PDF)"
					name="upload"
				/>

			</ProForm>
		</ProCard>
	);
}

export default Contract;
