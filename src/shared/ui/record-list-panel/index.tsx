import type { CollapseProps } from "antd";
import type { ReactNode } from "react";
import { Alert, Card, Collapse, Empty, Spin } from "antd";

interface RecordListPanelProps {
	title: ReactNode
	items: NonNullable<CollapseProps["items"]>
	activeKey?: string
	loading?: boolean
	error?: boolean
	errorMessage: ReactNode
	emptyDescription: ReactNode
	unavailableDescription?: ReactNode
	activeItemClassName?: string
	onSelect: (key: string) => void
}

/**
 * Shared visual shell for sidebar record selectors such as contracts and predictions.
 */
export function RecordListPanel({
	title,
	items,
	activeKey,
	loading = false,
	error = false,
	errorMessage,
	emptyDescription,
	unavailableDescription,
	activeItemClassName,
	onSelect,
}: RecordListPanelProps) {
	let content: ReactNode;

	if (unavailableDescription) {
		content = <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={unavailableDescription} />;
	}
	else if (loading) {
		content = (
			<div className="flex min-h-32 items-center justify-center">
				<Spin />
			</div>
		);
	}
	else if (error) {
		content = <Alert type="error" showIcon message={errorMessage} />;
	}
	else if (items.length === 0) {
		content = <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyDescription} />;
	}
	else {
		const borderedItems = items.map(item => ({
			...item,
			style: {
				...item.style,
				borderBottomStyle: "solid",
				borderBottomWidth: 1,
			},
		}));

		content = (
			<Collapse
				accordion
				items={borderedItems}
				activeKey={activeKey}
				className={`!border-0 !bg-transparent [&_.ant-collapse-content-box]:!px-4 [&_.ant-collapse-content-box]:!pb-3 [&_.ant-collapse-content-box]:!pt-0 [&_.ant-collapse-content]:!border-0 [&_.ant-collapse-content]:!bg-transparent [&_.ant-collapse-header]:!px-4 [&_.ant-collapse-header]:!py-4 [&_.ant-collapse-item.ant-collapse-item-active]:!border-primary [&_.ant-collapse-item]:mb-3 [&_.ant-collapse-item]:overflow-hidden [&_.ant-collapse-item]:!rounded-2xl [&_.ant-collapse-item]:border [&_.ant-collapse-item]:border-solid [&_.ant-collapse-item]:!border-[var(--ant-color-border)] [&_.ant-collapse-item]:!bg-bgElevated [&_.ant-collapse-item:last-child]:mb-0 ${activeItemClassName ?? ""}`}
				onChange={(key) => {
					const nextKey = Array.isArray(key) ? key[0] : key;
					if (nextKey)
						onSelect(String(nextKey));
				}}
			/>
		);
	}

	return (
		<Card
			size="small"
			title={title}
			className="w-full !rounded-2xl !bg-bgContainer [&_.ant-card-body]:px-3 [&_.ant-card-body]:pb-3 [&_.ant-card-body]:pt-1 [&_.ant-card-head-title]:text-base [&_.ant-card-head-title]:font-semibold [&_.ant-card-head]:min-h-0 [&_.ant-card-head]:border-0 [&_.ant-card-head]:px-4 [&_.ant-card-head]:pb-2 [&_.ant-card-head]:pt-4"
		>
			{content}
		</Card>
	);
}
