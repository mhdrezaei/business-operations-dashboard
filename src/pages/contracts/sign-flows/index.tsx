import type { SignFlowListItem } from "#src/features/contract/api/contracts.api";
import type { ActionType, ProFormInstance } from "@ant-design/pro-components";

import { BasicContent, BasicTable } from "#src/components";
import { fetchSignFlowsList } from "#src/features/contract/api/contracts.api";
import { servicesQuery } from "#src/features/contract/create/queries/contract.queries";
import { useQuery } from "@tanstack/react-query";

import { message } from "antd";
import React, { useMemo, useRef, useState } from "react";
import { SignFlowDetailModal } from "./components/SignFlowDetailModal";
import { getSignFlowColumns } from "./constants";

export default function SignFlowListPage() {
	const actionRef = useRef<ActionType>(null);
	const formRef = useRef<ProFormInstance>();
	const services = useQuery(servicesQuery());

	const serviceOptions = useMemo(() => {
		const opts = [{ label: "همه سرویس‌ها", value: "" }];
		const results = services.data?.results ?? [];
		results.forEach((s: any) => {
			if (s?.code) {
				opts.push({ label: s.name || s.code, value: s.code });
			}
		});
		return opts;
	}, [services.data]);

	const [modalVisible, setModalVisible] = useState(false);
	const [selectedId, setSelectedId] = useState<number | null>(null);

	const columns = useMemo(() => getSignFlowColumns(serviceOptions, formRef, (id: number) => {
		setSelectedId(id);
		setModalVisible(true);
	}), [serviceOptions]);

	return (
		<BasicContent className="h-full">
			<BasicTable<SignFlowListItem>
				filterTitle="جستجوی گردش‌های امضا"
				filterSubtitle="برای جستجو و فیلتر گردش‌های امضای قرارداد، مقادیر زیر را انتخاب کنید."
				tableSubtitle="گردش‌های امضای ثبت شده را مشاهده و مدیریت کنید."
				rowKey="id"
				columns={columns}
				actionRef={actionRef}
				columnsState={{
					defaultValue: {
						started_at: { show: false },
						finished_at: { show: false },
						cancel_reason: { show: false },
					},
				}}
				formRef={formRef}
				request={async (params) => {
					try {
						const res = await fetchSignFlowsList({
							page: params.current,
							page_size: params.pageSize,
							mine: params.mine as "assigned" | "created",
							state: params.state,
							service: params.service,
							record_type: params.record_type as "contract" | "addendum",
						});
						return {
							data: res.results,
							success: true,
							total: res.count,
						};
					}
					catch (err) {
						console.error(err);
						message.error("خطا در دریافت لیست گردش‌های امضا");
						return {
							data: [],
							success: false,
							total: 0,
						};
					}
				}}
				pagination={{
					defaultPageSize: 15,
				}}
				rowSelection={false}
			/>
			<SignFlowDetailModal open={modalVisible} id={selectedId} onCancel={() => setModalVisible(false)} />
		</BasicContent>
	);
}
