import type { DragEndEvent } from "@dnd-kit/core";
import type { CSSProperties } from "react";
import type { BankAccountDto } from "../model/bank-accounts.types";
import { BasicContent } from "#src/components";
import { ContractDashedBorder } from "#src/features/contract/shared/ui/form/components/ContractDashedBorder";
import { ContractFormSection } from "#src/features/contract/shared/ui/form/components/ContractFormSection";
import { useAccess } from "#src/hooks";
import {
	ArrowDownOutlined,
	ArrowUpOutlined,
	DeleteOutlined,
	EditOutlined,
	HolderOutlined,
	PlusOutlined,
} from "@ant-design/icons";
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button, Empty, Popconfirm, Skeleton, Tooltip } from "antd";
import React, { useMemo, useState } from "react";
import { deleteBankAccount, updateBankAccount } from "../../../api/bank-accounts.api";
import { bankAccountsByCompanyQuery } from "../../../queries/bank-accounts.queries";
import { formatCardNumber, formatIban } from "../model/bank-accounts.constants";
import { bankAccountDtoToPayload } from "../model/bank-accounts.mappers";
import BankAccountModal from "./BankAccountModal";
import "#src/features/contract/shared/ui/form/contract-form.css";
import "./bank-accounts-panel.css";

interface Props {
	serviceId: number
	companyId: number
}

interface AccountCardProps {
	account: BankAccountDto
	order?: number
	count?: number
	draggable?: boolean
	busy: boolean
	canUpdate: boolean
	canDelete: boolean
	onEdit: (account: BankAccountDto) => void
	onDelete: (account: BankAccountDto) => Promise<void>
	onMove?: (account: BankAccountDto, order: number) => Promise<void>
	onAddToContract?: (account: BankAccountDto) => Promise<void>
}

function AccountCard({
	account,
	order,
	count,
	draggable = false,
	busy,
	canUpdate,
	canDelete,
	onEdit,
	onDelete,
	onMove,
	onAddToContract,
}: AccountCardProps) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: account.id,
		disabled: !draggable || !canUpdate || busy,
	});
	const style = { transform: CSS.Transform.toString(transform), transition } as CSSProperties;
	const displayedOrder = order ?? null;

	return (
		<article ref={setNodeRef} style={style} className={`bank-account-card${isDragging ? " bank-account-card--dragging" : ""}`}>
			<ContractDashedBorder />
			<div className="bank-account-card__content">
				<div className="bank-account-card__main">
					<strong className="bank-account-card__title">{account.bank_name}</strong>
					<div className="bank-account-card__details">
						<span>
							<b>صاحب حساب:</b>
							{" "}
							{account.account_holder_name}
						</span>
						<span>
							<b>شماره حساب:</b>
							{" "}
							<span dir="ltr">{account.account_number || "ثبت نشده"}</span>
						</span>
						<span>
							<b>شماره کارت:</b>
							{" "}
							<span dir="ltr">{account.card_number ? formatCardNumber(account.card_number) : "ثبت نشده"}</span>
						</span>
						<span>
							<b>شبا:</b>
							{" "}
							<span dir="ltr">{account.iban ? formatIban(account.iban) : "ثبت نشده"}</span>
						</span>
					</div>
				</div>

				<div className="bank-account-card__actions">
					<Button icon={<EditOutlined />} disabled={!canUpdate || busy} onClick={() => onEdit(account)}>ویرایش</Button>
					<Popconfirm
						title="این حساب حذف شود؟"
						description="اطلاعات حساب پس از حذف قابل بازیابی نیست."
						okText="حذف"
						cancelText="انصراف"
						okButtonProps={{ danger: true }}
						onConfirm={() => onDelete(account)}
					>
						<Button danger icon={<DeleteOutlined />} disabled={!canDelete || busy}>حذف</Button>
					</Popconfirm>
				</div>

				{displayedOrder != null && onMove
					? (
						<div className="bank-account-card__order">
							<Tooltip title="برای جابه‌جایی بکشید">
								<Button
									className="bank-account-card__handle"
									icon={<HolderOutlined />}
									disabled={!canUpdate || busy}
									aria-label={`جابجایی حساب ${account.bank_name}`}
									{...attributes}
									{...listeners}
								/>
							</Tooltip>
							<span className="bank-account-card__priority" aria-label={`اولویت ${displayedOrder}`}>{displayedOrder}</span>
							<span className="bank-account-card__order-label">جایگاه در قرارداد</span>
							<Button icon={<ArrowUpOutlined />} disabled={!canUpdate || busy || displayedOrder === 1} aria-label="انتقال به جایگاه بالاتر" onClick={() => onMove(account, displayedOrder - 1)} />
							<Button icon={<ArrowDownOutlined />} disabled={!canUpdate || busy || displayedOrder === count} aria-label="انتقال به جایگاه پایین‌تر" onClick={() => onMove(account, displayedOrder + 1)} />
							<Tooltip title="حذف از ترتیب قرارداد؛ اطلاعات حساب باقی می‌ماند">
								<Button danger icon={<DeleteOutlined />} disabled={!canUpdate || busy} aria-label="حذف از قرارداد" onClick={() => onMove(account, 0)} />
							</Tooltip>
						</div>
					)
					: onAddToContract
						? (
							<div className="bank-account-card__add">
								<Button type="dashed" icon={<PlusOutlined />} disabled={!canUpdate || busy} loading={busy} onClick={() => onAddToContract(account)}>
									افزودن به قرارداد
								</Button>
							</div>
						)
						: null}
			</div>
		</article>
	);
}

interface OrderedAccountsProps extends Omit<AccountCardProps, "account" | "order" | "count" | "onAddToContract"> {
	accounts: BankAccountDto[]
}

function OrderedAccounts({ accounts, onMove, ...cardProps }: OrderedAccountsProps) {
	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
		useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
	);

	function handleDragEnd({ active, over }: DragEndEvent) {
		if (!over || active.id === over.id || !onMove)
			return;
		const account = accounts.find(item => item.id === active.id);
		const target = accounts.find(item => item.id === over.id);
		if (account && target?.contract_order != null)
			void onMove(account, target.contract_order);
	}

	return (
		<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
			<SortableContext items={accounts.map(account => account.id)} strategy={verticalListSortingStrategy}>
				<div className="bank-accounts-list">
					{accounts.map(account => (
						<AccountCard
							key={account.id}
							{...cardProps}
							account={account}
							order={account.contract_order ?? undefined}
							count={accounts.length}
							draggable
							onMove={onMove}
						/>
					))}
				</div>
			</SortableContext>
		</DndContext>
	);
}

export default function BankAccountsTable({ serviceId, companyId }: Props) {
	const { hasDomainPermissionByServiceId } = useAccess();
	const [optimisticAccounts, setOptimisticAccounts] = useState<BankAccountDto[] | null>(null);
	const [openModal, setOpenModal] = useState(false);
	const [editing, setEditing] = useState<BankAccountDto | null>(null);
	const [busyId, setBusyId] = useState<number | null>(null);
	const accountsQuery = useQuery(bankAccountsByCompanyQuery(companyId));

	const canCreate = hasDomainPermissionByServiceId("company_profile", "create", serviceId);
	const canUpdate = hasDomainPermissionByServiceId("company_profile", "update", serviceId);
	const canDelete = hasDomainPermissionByServiceId("company_profile", "delete", serviceId);
	const accounts = optimisticAccounts ?? accountsQuery.data?.results ?? [];
	const orderedAccounts = useMemo(
		() => accounts.filter(account => account.contract_order != null).sort((a, b) => (a.contract_order ?? 0) - (b.contract_order ?? 0)),
		[accounts],
	);
	const unassignedAccounts = useMemo(() => accounts.filter(account => account.contract_order == null), [accounts]);

	async function changeContractOrder(account: BankAccountDto, nextOrder: number | null) {
		if (busyId != null)
			return;
		const previousAccounts = accounts;
		const oldOrder = account.contract_order;
		setBusyId(account.id);

		try {
			if (nextOrder == null && oldOrder != null) {
				const followers = orderedAccounts.filter(item => (item.contract_order ?? 0) > oldOrder);
				const followerIds = new Set(followers.map(item => item.id));
				setOptimisticAccounts(accounts.map((item) => {
					if (item.id === account.id)
						return { ...item, contract_order: null };
					if (followerIds.has(item.id))
						return { ...item, contract_order: (item.contract_order ?? 1) - 1 };
					return item;
				}));

				await updateBankAccount(account.id, bankAccountDtoToPayload(account, serviceId, null));
				for (const follower of followers) {
					await updateBankAccount(
						follower.id,
						bankAccountDtoToPayload(follower, serviceId, (follower.contract_order ?? 1) - 1),
					);
				}
			}
			else if (nextOrder != null && oldOrder == null) {
				setOptimisticAccounts(accounts.map(item => item.id === account.id ? { ...item, contract_order: nextOrder } : item));
				await updateBankAccount(account.id, bankAccountDtoToPayload(account, serviceId, nextOrder));
			}
			else if (nextOrder != null && oldOrder != null && nextOrder !== oldOrder) {
				const boundedOrder = Math.max(1, Math.min(nextOrder, orderedAccounts.length));
				const oldIndex = orderedAccounts.findIndex(item => item.id === account.id);
				const reordered = arrayMove(orderedAccounts, oldIndex, boundedOrder - 1);
				const orderById = new Map(reordered.map((item, index) => [item.id, index + 1]));
				setOptimisticAccounts(accounts.map(item => orderById.has(item.id) ? { ...item, contract_order: orderById.get(item.id)! } : item));

				await updateBankAccount(account.id, bankAccountDtoToPayload(account, serviceId, null));
				const affected = boundedOrder < oldOrder
					? orderedAccounts
						.filter(item => item.id !== account.id && (item.contract_order ?? 0) >= boundedOrder && (item.contract_order ?? 0) < oldOrder)
						.sort((a, b) => (b.contract_order ?? 0) - (a.contract_order ?? 0))
					: orderedAccounts
						.filter(item => item.id !== account.id && (item.contract_order ?? 0) > oldOrder && (item.contract_order ?? 0) <= boundedOrder)
						.sort((a, b) => (a.contract_order ?? 0) - (b.contract_order ?? 0));

				for (const affectedAccount of affected) {
					const shiftedOrder = (affectedAccount.contract_order ?? 0) + (boundedOrder < oldOrder ? 1 : -1);
					await updateBankAccount(
						affectedAccount.id,
						bankAccountDtoToPayload(affectedAccount, serviceId, shiftedOrder),
					);
				}
				await updateBankAccount(account.id, bankAccountDtoToPayload(account, serviceId, boundedOrder));
			}

			await accountsQuery.refetch();
			setOptimisticAccounts(null);
			window.$message?.success(nextOrder == null ? "حساب از ترتیب قرارداد خارج شد" : "ترتیب حساب‌ها به‌روزرسانی شد");
		}
		catch {
			setOptimisticAccounts(previousAccounts);
			await accountsQuery.refetch();
			setOptimisticAccounts(null);
			window.$message?.error("به‌روزرسانی ترتیب انجام نشد");
		}
		finally {
			setBusyId(null);
		}
	}

	async function addToContract(account: BankAccountDto) {
		const lastOrder = orderedAccounts.reduce((maximum, item) => Math.max(maximum, item.contract_order ?? 0), 0);
		await changeContractOrder(account, lastOrder + 1);
	}

	async function removeAccount(account: BankAccountDto) {
		setBusyId(account.id);
		try {
			await deleteBankAccount(account.id);
			setOptimisticAccounts(accounts.filter(item => item.id !== account.id));
			await accountsQuery.refetch();
			setOptimisticAccounts(null);
			window.$message?.success("حساب حذف شد");
		}
		catch {
			window.$message?.error("حذف حساب انجام نشد");
		}
		finally {
			setBusyId(null);
		}
	}

	function closeModal() {
		setOpenModal(false);
		setEditing(null);
	}

	const cardProps = {
		busy: false,
		canUpdate,
		canDelete,
		onEdit: (account: BankAccountDto) => {
			setEditing(account);
			setOpenModal(true);
		},
		onDelete: removeAccount,
	};

	return (
		<BasicContent>
			<div className="company-profile-sections bank-accounts-panel">
				<ContractFormSection
					title="حساب‌های بانکی"
					tone="primary"
					collapsible={false}
					className="company-profile-section company-profile-section--general bank-accounts-toolbar"
					extra={(
						<Button
							type="primary"
							icon={<PlusOutlined />}
							disabled={!canCreate}
							onClick={() => {
								setEditing(null);
								setOpenModal(true);
							}}
						>
							افزودن حساب
						</Button>
					)}
				>
					<Alert
						showIcon
						type="info"
						message={`${accounts.length} حساب ثبت‌شده؛ شماره جایگاه هر حساب از ترتیب قرارداد محاسبه می‌شود.`}
						description="برای تغییر ترتیب، کارت را بکشید یا از دکمه‌های بالا و پایین استفاده کنید."
					/>
				</ContractFormSection>

				{accountsQuery.isLoading
					? <Skeleton active paragraph={{ rows: 8 }} />
					: accountsQuery.isError
						? <Alert type="error" showIcon message="دریافت حساب‌های بانکی ناموفق بود" action={<Button onClick={() => accountsQuery.refetch()}>تلاش دوباره</Button>} />
						: accounts.length
							? (
								<>
									{orderedAccounts.length > 0 && (
										<ContractFormSection
											title="حساب‌های بانکی قرارداد"
											tone="geekblue"
											className="company-profile-section company-profile-section--contact bank-accounts-ordered"
											extra={(
												<span className="bank-accounts-section__count">
													{orderedAccounts.length}
													{" "}
													جایگاه
												</span>
											)}
										>
											<OrderedAccounts
												{...cardProps}
												accounts={orderedAccounts}
												busy={busyId != null}
												onMove={(account, order) => changeContractOrder(account, order === 0 ? null : order)}
											/>
										</ContractFormSection>
									)}

									{unassignedAccounts.length > 0 && (
										<ContractFormSection
											title="سایر حساب‌ها"
											tone="purple"
											className="company-profile-section company-profile-section--address bank-accounts-unassigned"
											extra={(
												<span className="bank-accounts-section__count">
													{unassignedAccounts.length}
													{" "}
													حساب
												</span>
											)}
										>
											<p className="bank-accounts-unassigned__description">این حساب‌ها هنوز جایگاهی در قرارداد ندارند.</p>
											<div className="bank-accounts-list">
												{unassignedAccounts.map(account => (
													<AccountCard
														key={account.id}
														{...cardProps}
														account={account}
														busy={busyId === account.id}
														onAddToContract={addToContract}
													/>
												))}
											</div>
										</ContractFormSection>
									)}
								</>
							)
							: <Empty description="هنوز حساب بانکی ثبت نشده است" />}
			</div>

			<BankAccountModal
				open={openModal}
				serviceId={serviceId}
				companyId={companyId}
				editing={editing}
				disabled={editing ? !canUpdate : !canCreate}
				onClose={closeModal}
				onSaved={async () => {
					await accountsQuery.refetch();
					setOptimisticAccounts(null);
				}}
			/>
		</BasicContent>
	);
}
