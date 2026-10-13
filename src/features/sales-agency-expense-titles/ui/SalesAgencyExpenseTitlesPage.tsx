import type { SalesAgencyExpenseTitle, SalesAgencyExpenseTitlePayload } from "../model/sales-agency-expense-title.types";
import { BasicContent } from "#src/components";
import { EditOutlined, PlusOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Card, Empty, Form, Input, Modal, Spin, Switch, Typography } from "antd";
import { useEffect, useState } from "react";
import { createSalesAgencyExpenseTitle, fetchSalesAgencyExpenseTitles, updateSalesAgencyExpenseTitle } from "../api/sales-agency-expense-titles.api";

const queryKey = ["sales-agency", "expense-titles"];

export default function SalesAgencyExpenseTitlesPage() {
	const queryClient = useQueryClient();
	const [modalOpen, setModalOpen] = useState(false);
	const [selected, setSelected] = useState<SalesAgencyExpenseTitle | null>(null);
	const [form] = Form.useForm<SalesAgencyExpenseTitlePayload>();
	const titlesQuery = useQuery({
		queryKey,
		queryFn: fetchSalesAgencyExpenseTitles,
	});
	const saveMutation = useMutation({
		mutationFn: (payload: SalesAgencyExpenseTitlePayload) => selected
			? updateSalesAgencyExpenseTitle(selected.id, payload)
			: createSalesAgencyExpenseTitle(payload),
		onSuccess: async () => {
			window.$message?.success("عنوان هزینه ذخیره شد.");
			setModalOpen(false);
			await queryClient.invalidateQueries({ queryKey });
		},
	});

	useEffect(() => {
		if (modalOpen) {
			form.setFieldsValue({ name: selected?.name ?? "", is_active: selected?.is_active ?? false });
		}
	}, [form, modalOpen, selected]);

	const openModal = (title: SalesAgencyExpenseTitle | null) => {
		setSelected(title);
		setModalOpen(true);
	};

	const titles = titlesQuery.data?.results ?? [];

	return (
		<BasicContent className="h-full !overflow-y-auto">
			<div className="mx-auto flex max-w-6xl flex-col gap-5 py-2" dir="rtl">
				<div>
					<Typography.Title level={3} className="!mb-1">عنوان‌های هزینه‌ی عاملیت فروش</Typography.Title>
					<Typography.Text type="secondary">مدیریت فهرست عنوان‌های هزینه‌ی عاملیت فروش</Typography.Text>
				</div>

				<Card title="فهرست عنوان‌ها" className="shadow-sm">
					<div className="mb-4 flex justify-end">
						<Button type="primary" icon={<PlusOutlined />} onClick={() => openModal(null)}>افزودن عنوان هزینه</Button>
					</div>
					{titlesQuery.isLoading
						? <div className="py-12 text-center"><Spin /></div>
						: titlesQuery.isError
							? (
								<Alert
									showIcon
									type="error"
									message="دریافت عنوان‌های هزینه ناموفق بود."
									action={<Button size="small" onClick={() => void titlesQuery.refetch()}>تلاش دوباره</Button>}
								/>
							)
							: titles.length === 0
								? <Empty description="عنوانی ثبت نشده است." />
								: (
									<div className="flex flex-col gap-2">
										{titles.map(title => (
											<div key={title.id} className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 px-4 py-3 dark:border-gray-700">
												<Typography.Text>{title.name}</Typography.Text>
												<Button aria-label={`ویرایش ${title.name}`} icon={<EditOutlined />} onClick={() => openModal(title)} />
											</div>
										))}
									</div>
								)}
				</Card>
			</div>

			<Modal
				title={selected ? "ویرایش عنوان هزینه" : "افزودن عنوان هزینه"}
				open={modalOpen}
				onCancel={() => setModalOpen(false)}
				footer={null}
			>
				<Form form={form} layout="vertical" onFinish={payload => saveMutation.mutate(payload)}>
					<Form.Item name="name" label="نام" rules={[{ required: true, whitespace: true, message: "نام عنوان هزینه را وارد کنید." }]}>
						<Input />
					</Form.Item>
					<div className="mb-6 flex items-center gap-2">
						<Form.Item name="is_active" valuePropName="checked" className="mb-0">
							<Switch />
						</Form.Item>
						<span>فعال</span>
					</div>
					<div className="flex gap-3">
						<Button type="primary" htmlType="submit" loading={saveMutation.isPending}>ذخیره</Button>
						<Button onClick={() => setModalOpen(false)}>انصراف</Button>
					</div>
				</Form>
			</Modal>
		</BasicContent>
	);
}
