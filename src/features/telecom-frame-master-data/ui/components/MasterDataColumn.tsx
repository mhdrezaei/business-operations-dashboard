import type { TelecomFrameDirectoryEntryDto } from "#src/features/contract/api/telecom-frame.api";
import { entryLabel } from "#src/features/contract/shared/services/telecom-frame/telecom-frame.directory";
import { SectionCard } from "#src/shared/ui/section-card";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Empty, Popconfirm, Spin, Tag, Typography } from "antd";
import clsx from "clsx";
import { useTranslation } from "react-i18next";

interface MasterDataColumnProps {
	title: string
	items: TelecomFrameDirectoryEntryDto[]
	loading: boolean
	selectedId?: number | null
	addDisabled?: boolean
	onSelect?: (id: number) => void
	onAdd: () => void
	onEdit: (item: TelecomFrameDirectoryEntryDto) => void
	onDelete: (item: TelecomFrameDirectoryEntryDto) => void
}

/** One level of the BO/PO hierarchy: its records with add / edit / delete; selecting a record scopes the next level. */
export function MasterDataColumn({ title, items, loading, selectedId, addDisabled, onSelect, onAdd, onEdit, onDelete }: MasterDataColumnProps) {
	const { t } = useTranslation();

	return (
		<SectionCard
			title={title}
			collapsible={false}
			extra={(
				<Button
					type="primary"
					size="small"
					icon={<PlusOutlined />}
					disabled={addDisabled}
					title={addDisabled ? t("telecomFrameMasterData.selectParentFirst") : t("telecomFrameMasterData.add")}
					onClick={onAdd}
				/>
			)}
		>
			<Spin spinning={loading}>
				{items.length === 0
					? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("telecomFrameMasterData.empty")} />
					: (
						<ul className="m-0 flex max-h-[420px] list-none flex-col gap-2 overflow-y-auto p-0">
							{items.map(item => (
								<li
									key={item.id}
									className={clsx(
										"flex items-center justify-between gap-2 rounded-lg border border-solid px-3 py-2",
										selectedId === item.id ? "border-primary bg-colorPrimaryBg" : "border-colorBorderSecondary",
										onSelect && "cursor-pointer",
									)}
									onClick={() => onSelect?.(item.id)}
								>
									<div className="min-w-0">
										<Typography.Text strong ellipsis className="block">{entryLabel(item)}</Typography.Text>
										{item.title ? <Typography.Text type="secondary" ellipsis className="block text-xs">{item.title}</Typography.Text> : null}
										{item.is_active === false ? <Tag color="error">{t("telecomFrameMasterData.inactive")}</Tag> : null}
									</div>
									<div className="flex shrink-0 items-center gap-1" onClick={event => event.stopPropagation()}>
										<Button type="text" icon={<EditOutlined />} title={t("telecomFrameMasterData.edit")} onClick={() => onEdit(item)} />
										<Popconfirm
											title={t("common.confirmDelete")}
											okText={t("common.confirm")}
											cancelText={t("common.cancel")}
											onConfirm={() => onDelete(item)}
										>
											<Button type="text" danger icon={<DeleteOutlined />} title={t("common.delete")} />
										</Popconfirm>
									</div>
								</li>
							))}
						</ul>
					)}
			</Spin>
		</SectionCard>
	);
}
