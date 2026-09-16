import type { ContractSectionTone } from "#src/features/contract/shared/ui/form/components/contract-form-section-tone";
import type { DragEndEvent } from "@dnd-kit/core";
import type { CSSProperties } from "react";
import type { CompanyProfileFormValues } from "../../../model/company-profile.form.types";
import type { CompanyPersonDto, CompanyPersonRole } from "../model/company-people.types";
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
import { Alert, Button, Empty, Popconfirm, Select, Skeleton, Switch, Tag, Tooltip } from "antd";
import React, { useMemo, useState } from "react";
import { useWatch } from "react-hook-form";
import { deleteCompanyPerson, updateCompanyPerson } from "../../../api/key-people.api";
import { companyPeopleListQuery } from "../../../queries/company-people.queries";
import { COMPANY_PERSON_ROLE_OPTIONS } from "../model/company-people.constants";
import { companyPersonDtoToPayload } from "../model/company-people.mappers";
import CompanyPeopleModal from "./CompanyPeopleModal";
import "#src/features/contract/shared/ui/form/contract-form.css";
import "./company-people-panel.css";

interface PersonRowProps {
	person: CompanyPersonDto
	order?: number
	count?: number
	draggable?: boolean
	busy: boolean
	canUpdate: boolean
	canDelete: boolean
	onEdit: (person: CompanyPersonDto) => void
	onDelete: (person: CompanyPersonDto) => Promise<void>
	onMove?: (person: CompanyPersonDto, order: number) => Promise<void>
	onAddToContract?: (person: CompanyPersonDto) => Promise<void>
}

function formatContact(values: string[] | null, emptyText: string) {
	return values?.filter(Boolean).join("، ") || emptyText;
}

function PersonRow({
	person,
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
}: PersonRowProps) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: person.id,
		disabled: !draggable || !canUpdate || busy,
	});
	const style = { transform: CSS.Transform.toString(transform), transition } as CSSProperties;
	const displayedOrder = order ?? null;

	return (
		<article ref={setNodeRef} style={style} className={`company-person-card${isDragging ? " company-person-card--dragging" : ""}`}>
			<ContractDashedBorder />
			<div className="company-person-card__content">
				<div className="company-person-row__main">
					<div className="company-person-row__identity">
						<strong>{person.full_name}</strong>
						{person.is_signatory ? <Tag color="blue">صاحب امضا</Tag> : null}
					</div>
					<div className="company-person-row__details">
						{person.title
							? (
								<span>
									<b>عنوان:</b>
									{" "}
									{person.title}
								</span>
							)
							: null}
						<span>
							<b>تلفن:</b>
							{" "}
							<span dir="ltr">{formatContact(person.phone, "ثبت نشده")}</span>
						</span>
						<span>
							<b>ایمیل:</b>
							{" "}
							<span dir="ltr">{formatContact(person.email, "ثبت نشده")}</span>
						</span>
					</div>
				</div>

				<div className="company-person-row__actions">
					<Button icon={<EditOutlined />} disabled={!canUpdate || busy} onClick={() => onEdit(person)}>ویرایش</Button>
					<Popconfirm
						title="این شخص حذف شود؟"
						description="اطلاعات شخص پس از حذف قابل بازیابی نیست."
						okText="حذف"
						cancelText="انصراف"
						okButtonProps={{ danger: true }}
						onConfirm={() => onDelete(person)}
					>
						<Button danger icon={<DeleteOutlined />} disabled={!canDelete || busy}>حذف</Button>
					</Popconfirm>
				</div>

				{displayedOrder != null && onMove
					? (
						<div className="company-person-row__order">
							<Tooltip title="برای جابه‌جایی بکشید">
								<Button
									className="company-person-row__handle"
									icon={<HolderOutlined />}
									disabled={!canUpdate || busy}
									aria-label={`جابجایی ${person.full_name}`}
									{...attributes}
									{...listeners}
								/>
							</Tooltip>
							<span className="company-person-row__priority" aria-label={`اولویت ${displayedOrder}`}>{displayedOrder}</span>
							<span className="company-person-row__order-label">جایگاه در قرارداد</span>
							<Button icon={<ArrowUpOutlined />} disabled={!canUpdate || busy || displayedOrder === 1} aria-label="انتقال به جایگاه بالاتر" onClick={() => onMove(person, displayedOrder - 1)} />
							<Button icon={<ArrowDownOutlined />} disabled={!canUpdate || busy || displayedOrder === count} aria-label="انتقال به جایگاه پایین‌تر" onClick={() => onMove(person, displayedOrder + 1)} />
							<Tooltip title="حذف از ترتیب قرارداد؛ اطلاعات شخص باقی می‌ماند">
								<Button danger icon={<DeleteOutlined />} disabled={!canUpdate || busy} aria-label="حذف از قرارداد" onClick={() => onMove(person, 0)} />
							</Tooltip>
						</div>
					)
					: onAddToContract
						? (
							<div className="company-person-row__add">
								<Button type="dashed" icon={<PlusOutlined />} disabled={!canUpdate || busy} loading={busy} onClick={() => onAddToContract(person)}>
									افزودن به قرارداد
								</Button>
							</div>
						)
						: null}
			</div>
		</article>
	);
}

interface RoleGroupProps extends Omit<PersonRowProps, "person" | "order" | "count" | "onAddToContract"> {
	label: string
	people: CompanyPersonDto[]
	totalCount: number
}

function RoleGroup({ label, people, totalCount, onMove, ...rowProps }: RoleGroupProps) {
	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
		useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
	);

	function handleDragEnd({ active, over }: DragEndEvent) {
		if (!over || active.id === over.id || !onMove)
			return;
		const oldIndex = people.findIndex(person => person.id === active.id);
		const target = people.find(person => person.id === over.id);
		if (oldIndex >= 0 && target?.contract_order != null)
			void onMove(people[oldIndex], target.contract_order);
	}

	return (
		<ContractFormSection
			title={label}
			tone={getRoleTone(people[0]?.role)}
			className={`company-profile-section ${getRoleClassName(people[0]?.role)} company-people-role`}
			extra={(
				<span className="company-people-role__count">
					{totalCount}
					{" "}
					جایگاه
				</span>
			)}
		>
			<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
				<SortableContext items={people.map(person => person.id)} strategy={verticalListSortingStrategy}>
					<div className="company-people-role__list">
						{people.map(person => (
							<PersonRow key={person.id} {...rowProps} person={person} order={person.contract_order ?? undefined} count={totalCount} draggable onMove={onMove} />
						))}
					</div>
				</SortableContext>
			</DndContext>
		</ContractFormSection>
	);
}

function getRoleTone(role?: CompanyPersonRole): ContractSectionTone {
	switch (role) {
		case "BOARD":
			return "purple";
		case "COMMERCIAL":
			return "geekblue";
		case "CONTRACTS":
			return "gold";
		case "FINANCE":
			return "addenda";
		case "REPRESENTATIVE":
			return "blue";
		case "OTHER":
			return "traffic";
		case "CEO":
		default:
			return "primary";
	}
}

function getRoleClassName(role?: CompanyPersonRole) {
	switch (role) {
		case "BOARD":
			return "company-profile-section--address";
		case "COMMERCIAL":
			return "company-profile-section--contact";
		case "CONTRACTS":
			return "company-profile-section--legal";
		case "FINANCE":
			return "company-profile-section--finance";
		case "REPRESENTATIVE":
			return "company-profile-section--internal";
		case "OTHER":
		case "CEO":
		default:
			return "company-profile-section--general";
	}
}

export default function CompanyPeoplePanel() {
	const companyId = useWatch<CompanyProfileFormValues, "companyId">({ name: "companyId" });
	const serviceId = useWatch<CompanyProfileFormValues, "serviceId">({ name: "serviceId" });
	const { hasDomainPermissionByServiceId } = useAccess();
	const [optimisticPeople, setOptimisticPeople] = useState<CompanyPersonDto[] | null>(null);
	const [role, setRole] = useState<CompanyPersonRole | undefined>();
	const [onlySignatories, setOnlySignatories] = useState(false);
	const [openModal, setOpenModal] = useState(false);
	const [selectedId, setSelectedId] = useState<number | null>(null);
	const [busyId, setBusyId] = useState<number | null>(null);
	const peopleQuery = useQuery(companyPeopleListQuery(companyId ? { company: companyId } : null));

	const canCreate = hasDomainPermissionByServiceId("company_profile", "create", serviceId);
	const canUpdate = hasDomainPermissionByServiceId("company_profile", "update", serviceId);
	const canDelete = hasDomainPermissionByServiceId("company_profile", "delete", serviceId);

	const people = optimisticPeople ?? peopleQuery.data?.results ?? [];

	const filteredPeople = useMemo(
		() => people.filter(person => (!role || person.role === role) && (!onlySignatories || person.is_signatory)),
		[onlySignatories, people, role],
	);

	const activeGroups = useMemo(() => COMPANY_PERSON_ROLE_OPTIONS
		.map(option => ({
			...option,
			people: filteredPeople
				.filter(person => person.role === option.value && person.contract_order != null)
				.sort((a, b) => (a.contract_order ?? 0) - (b.contract_order ?? 0)),
			totalCount: people.filter(person => person.role === option.value && person.contract_order != null).length,
		}))
		.filter(group => group.people.length > 0), [filteredPeople]);
	const unassignedPeople = useMemo(() => filteredPeople.filter(person => person.contract_order == null), [filteredPeople]);

	async function changeContractOrder(person: CompanyPersonDto, nextOrder: number | null) {
		if (!serviceId || busyId != null)
			return;
		const previousPeople = people;
		const rolePeople = people
			.filter(item => item.role === person.role && item.contract_order != null)
			.sort((a, b) => (a.contract_order ?? 0) - (b.contract_order ?? 0));
		const oldOrder = person.contract_order;
		setBusyId(person.id);

		try {
			if (nextOrder == null && oldOrder != null) {
				const followers = rolePeople.filter(item => (item.contract_order ?? 0) > oldOrder);
				const followerIds = new Set(followers.map(item => item.id));
				setOptimisticPeople(people.map((item) => {
					if (item.id === person.id)
						return { ...item, contract_order: null };
					if (followerIds.has(item.id))
						return { ...item, contract_order: (item.contract_order ?? 1) - 1 };
					return item;
				}));

				await updateCompanyPerson(person.id, companyPersonDtoToPayload(person, serviceId, null));
				for (const follower of followers) {
					await updateCompanyPerson(
						follower.id,
						companyPersonDtoToPayload(follower, serviceId, (follower.contract_order ?? 1) - 1),
					);
				}
			}
			else if (nextOrder != null && oldOrder == null) {
				setOptimisticPeople(people.map(item => item.id === person.id ? { ...item, contract_order: nextOrder } : item));
				await updateCompanyPerson(person.id, companyPersonDtoToPayload(person, serviceId, nextOrder));
			}
			else if (nextOrder != null && oldOrder != null && nextOrder !== oldOrder) {
				const boundedOrder = Math.max(1, Math.min(nextOrder, rolePeople.length));
				const oldIndex = rolePeople.findIndex(item => item.id === person.id);
				const reordered = arrayMove(rolePeople, oldIndex, boundedOrder - 1);
				const orderById = new Map(reordered.map((item, index) => [item.id, index + 1]));
				setOptimisticPeople(people.map(item => orderById.has(item.id) ? { ...item, contract_order: orderById.get(item.id)! } : item));

				await updateCompanyPerson(person.id, companyPersonDtoToPayload(person, serviceId, null));
				const affected = boundedOrder < oldOrder
					? rolePeople
						.filter(item => item.id !== person.id && (item.contract_order ?? 0) >= boundedOrder && (item.contract_order ?? 0) < oldOrder)
						.sort((a, b) => (b.contract_order ?? 0) - (a.contract_order ?? 0))
					: rolePeople
						.filter(item => item.id !== person.id && (item.contract_order ?? 0) > oldOrder && (item.contract_order ?? 0) <= boundedOrder)
						.sort((a, b) => (a.contract_order ?? 0) - (b.contract_order ?? 0));

				for (const affectedPerson of affected) {
					const shiftedOrder = (affectedPerson.contract_order ?? 0) + (boundedOrder < oldOrder ? 1 : -1);
					await updateCompanyPerson(
						affectedPerson.id,
						companyPersonDtoToPayload(affectedPerson, serviceId, shiftedOrder),
					);
				}
				await updateCompanyPerson(person.id, companyPersonDtoToPayload(person, serviceId, boundedOrder));
			}

			await peopleQuery.refetch();
			setOptimisticPeople(null);
			window.$message?.success(nextOrder == null ? "شخص از ترتیب قرارداد خارج شد" : "ترتیب قرارداد به‌روزرسانی شد");
		}
		catch {
			setOptimisticPeople(previousPeople);
			await peopleQuery.refetch();
			setOptimisticPeople(null);
			window.$message?.error("به‌روزرسانی ترتیب انجام نشد");
		}
		finally {
			setBusyId(null);
		}
	}

	async function addToContract(person: CompanyPersonDto) {
		const lastOrder = people
			.filter(item => item.role === person.role && item.contract_order != null)
			.reduce((maximum, item) => Math.max(maximum, item.contract_order ?? 0), 0);
		await changeContractOrder(person, lastOrder + 1);
	}

	async function removePerson(person: CompanyPersonDto) {
		setBusyId(person.id);
		try {
			await deleteCompanyPerson(person.id);
			setOptimisticPeople(people.filter(item => item.id !== person.id));
			await peopleQuery.refetch();
			setOptimisticPeople(null);
			window.$message?.success("شخص حذف شد");
		}
		catch {
			window.$message?.error("حذف شخص انجام نشد");
		}
		finally {
			setBusyId(null);
		}
	}

	function editPerson(person: CompanyPersonDto) {
		setSelectedId(person.id);
		setOpenModal(true);
	}

	function addPerson() {
		setSelectedId(null);
		setOpenModal(true);
	}

	function closeModal() {
		setOpenModal(false);
		setSelectedId(null);
	}

	if (!companyId)
		return null;

	const hasVisiblePeople = activeGroups.length > 0 || unassignedPeople.length > 0;
	const rowProps = { busy: false, canUpdate, canDelete, onEdit: editPerson, onDelete: removePerson };

	return (
		<BasicContent>
			<div className="company-profile-sections company-people-panel">
				<ContractFormSection
					title="اشخاص کلیدی"
					tone="primary"
					collapsible={false}
					className="company-profile-section company-profile-section--general company-people-toolbar"
					extra={(
						<Button type="primary" icon={<PlusOutlined />} disabled={!canCreate || !serviceId} onClick={addPerson}>
							افزودن شخص
						</Button>
					)}
				>
					<div className="company-people-filters">
						<Select allowClear placeholder="همه نقش‌ها" options={COMPANY_PERSON_ROLE_OPTIONS} value={role} onChange={setRole} />
						<label className="company-people-filters__switch">
							<Switch size="small" checked={onlySignatories} onChange={setOnlySignatories} />
							<span>فقط صاحبان امضا</span>
						</label>
					</div>

					<Alert
						showIcon
						type="info"
						message={`${people.length} شخص ثبت‌شده؛ شماره جایگاه هر شخص از ترتیب داخل نقش خودش محاسبه می‌شود.`}
						description="برای تغییر ترتیب، کارت را بکشید یا از دکمه‌های بالا و پایین استفاده کنید."
					/>
				</ContractFormSection>

				{peopleQuery.isLoading
					? <Skeleton active paragraph={{ rows: 8 }} />
					: peopleQuery.isError
						? <Alert type="error" showIcon message="دریافت اشخاص کلیدی ناموفق بود" action={<Button onClick={() => peopleQuery.refetch()}>تلاش دوباره</Button>} />
						: hasVisiblePeople
							? (
								<>
									{activeGroups.map(group => (
										<RoleGroup key={group.value} {...rowProps} busy={busyId != null} label={group.label} people={group.people} totalCount={group.totalCount} onMove={(person, order) => changeContractOrder(person, order === 0 ? null : order)} />
									))}

									{unassignedPeople.length > 0 && (
										<ContractFormSection
											title="سایر افراد"
											tone="purple"
											className="company-profile-section company-profile-section--address company-people-unassigned"
											extra={(
												<span className="company-people-role__count">
													{unassignedPeople.length}
													{" "}
													شخص
												</span>
											)}
										>
											<p className="company-people-unassigned__description">این افراد هنوز جایگاهی در قرارداد ندارند.</p>
											<div className="company-people-unassigned__list">
												{unassignedPeople.map(person => (
													<PersonRow key={person.id} {...rowProps} person={person} busy={busyId === person.id} onAddToContract={addToContract} />
												))}
											</div>
										</ContractFormSection>
									)}
								</>
							)
							: <Empty description={people.length ? "شخصی با این فیلترها پیدا نشد" : "هنوز شخصی ثبت نشده است"} />}
			</div>

			{serviceId && (
				<CompanyPeopleModal
					open={openModal}
					companyId={companyId}
					serviceId={serviceId}
					personId={selectedId}
					onClose={closeModal}
					onUpdated={async () => {
						await peopleQuery.refetch();
						setOptimisticPeople(null);
					}}
				/>
			)}
		</BasicContent>
	);
}
