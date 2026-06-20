import type { ReactNode } from "react";
import type {
	AdminUserAssignDeputyServiceAdminPayload,
	AdminUserAttachManagedUserPayload,
	AdminUserDeputyPermissionsDto,
	AdminUserDto,
} from "../../model/admin-users.types";

import { BasicButton } from "#src/components";
import { CloseOutlined, CrownOutlined, DisconnectOutlined, LinkOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Card, Checkbox, Modal, Select, Spin } from "antd";
import { useMemo, useState } from "react";
import {
	fetchAdminUsersList,
	fetchAssignDeputyServiceAdmin,
	fetchAssignServiceAdmin,
	fetchAttachManagedUser,
	fetchDetachManagedUser,
} from "../../api/admin-users.api";

type ModalView = "overview" | "service-admin" | "deputy-service-admin" | "managed-user-link";
type ActionAccent = "service" | "deputy" | "link";
type ActionState = "active" | "inactive" | "linked" | "unlinked";
type NoticeTone = "warning" | "info" | "link";

const DEPUTY_PERMISSION_OPTIONS: Array<{
	key: keyof AdminUserDeputyPermissionsDto
	label: string
}> = [
	{ key: "can_create_users", label: "ایجاد کاربر" },
	{ key: "can_create_roles", label: "ایجاد نقش" },
	{ key: "can_edit_users", label: "ویرایش کاربران" },
	{ key: "can_assign_roles", label: "اختصاص نقش‌ها به کاربران" },
	{ key: "can_manage_policies", label: "ویرایش نقش‌ها" },
];

const EMPTY_DEPUTY_PERMISSIONS: AdminUserDeputyPermissionsDto = {
	can_create_users: false,
	can_create_roles: false,
	can_edit_users: false,
	can_assign_roles: false,
	can_manage_policies: false,
};

const panelClassName = "flex flex-col gap-4";
const boxClassName = "rounded-2xl   px-5 py-[18px]";
const paragraphClassName = "m-0 px-4 text-[13px] leading-8 ";
const fieldGroupClassName = "space-y-2 rounded-2xl   p-4";
const footerClassName = "flex flex-wrap items-center justify-end gap-2 pt-1";
const hintClassName = "m-0 text-[13px] leading-8";
const selectClassName = [
	"w-full",
	"[&_.ant-select-selector]:!min-h-[46px]",
	"[&_.ant-select-selector]:!rounded-[14px]",
	"[&_.ant-select-selector]:!border-[var(--ant-colorBorderSecondary)]",
	"[&_.ant-select-selector]:!bg-[var(--ant-colorBgContainer)]",
	"[&_.ant-select-selector]:!px-3.5",
	"[&_.ant-select-selector]:!py-2",
	"[&_.ant-select-selector]:!shadow-none",
	"[&_.ant-select-selection-item]:!leading-[30px]",
	"[&_.ant-select-selection-item]:!text-right",
	"[&_.ant-select-selection-placeholder]:!leading-[30px]",
	"[&_.ant-select-selection-placeholder]:!text-right",
	"[&_.ant-select-selection-placeholder]:!text-[var(--ant-colorTextTertiary)]",
	"[&_.ant-select-arrow]:!text-[var(--ant-colorTextSecondary)]",
].join(" ");
const selectPopupClassName = "rtl text-right font-[inherit]";

interface Props {
	open: boolean
	user: AdminUserDto | null
	loading?: boolean
	onClose: () => void
	onUpdated: () => void
}

function cx(...classes: Array<string | false | null | undefined>) {
	return classes.filter(Boolean).join(" ");
}

function getIsServiceAdmin(user: AdminUserDto | null): boolean {
	if (!user) {
		return false;
	}

	return user.is_service_admin === true || user.admin_role === "service_admin";
}

function getIsDeputyServiceAdmin(user: AdminUserDto | null): boolean {
	if (!user) {
		return false;
	}

	return user.is_deputy_service_admin === true || user.admin_role === "deputy_service_admin";
}

function getIsOrdinaryManagedUser(user: AdminUserDto | null): boolean {
	return !getIsServiceAdmin(user) && !getIsDeputyServiceAdmin(user);
}

function getUserDisplayName(user: Pick<AdminUserDto, "first_name" | "last_name" | "username">): string {
	const fullName = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
	return fullName || user.username;
}

function toServiceAdminOptionLabel(user: AdminUserDto): string {
	return `${getUserDisplayName(user)} (${user.username})`;
}

function hasAtLeastOneDeputyPermission(permissions: AdminUserDeputyPermissionsDto): boolean {
	return Object.values(permissions).some(Boolean);
}

function getActionTitleClassName(accent: ActionAccent) {
	const accentClasses: Record<ActionAccent, string> = {
		service: "text-[var(--ant-colorPrimaryText)]",
		deputy: "text-[var(--ant-colorInfoText)]",
		link: "text-[var(--ant-colorWarningText)]",
	};

	return cx("text-[14px] font-extrabold", accentClasses[accent]);
}

function getActionIconClassName(accent: ActionAccent) {
	const accentClasses: Record<ActionAccent, string> = {
		service: " text-[var(--ant-colorPrimaryText)]",
		deputy: " text-[var(--ant-colorInfoText)]",
		link: " text-[var(--ant-colorWarningText)]",
	};

	return cx(
		"inline-flex h-10 w-10 items-center justify-center rounded-xl   text-base",
		accentClasses[accent],
	);
}

function getStatusPillClassName(state: ActionState) {
	const stateClasses: Record<ActionState, string> = {
		active: "border-[var(--ant-colorSuccessBorder)] bg-[var(--ant-colorSuccessBg)]  text-[var(--ant-colorSuccessText)]",
		inactive: "border-[var(--ant-colorBorderSecondary)] colorErrorBg text-[var(--ant-colorTextSecondary)]",
		linked: "border-[var(--ant-colorPrimaryBorder)] bg-[var(--ant-colorPrimaryBg)] text-[var(--ant-colorPrimaryText)]",
		unlinked: "border-[var(--ant-colorWarningBorder)] bg-[var(--ant-colorWarningBg)] text-[var(--ant-colorWarningText)]",
	};
	console.warn("xxxxxxxxxxxxxxxxxxxxx", stateClasses[state]);

	return cx(
		"inline-flex min-w-[72px] items-center justify-center rounded-lg border  p-1 px-3.5 text-xs font-extrabold leading-none shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
		stateClasses[state],
	);
}

function getNoticeClassName(tone: NoticeTone) {
	const toneClasses: Record<NoticeTone, string> = {
		warning: "border-[var(--ant-colorWarningBorder)] text-[var(--ant-colorWarningText)]",
		info: "border-[var(--ant-colorInfoBorder)] text-[var(--ant-colorInfoText)]",
		link: "border-[var(--ant-colorPrimaryBorder)] text-[var(--ant-colorPrimaryText)]",
	};

	return cx(
		"rounded-2xl border  px-4 py-3 text-[13px] font-semibold leading-7",
		toneClasses[tone],
	);
}

function checkboxClassName() {
	return "[&_.ant-checkbox+span]:!pe-0 [&_.ant-checkbox+span]:!ps-2 [&_.ant-checkbox+span]:!text-[14px] [&_.ant-checkbox+span]:!font-bold [&_.ant-checkbox+span]:!text-[var(--ant-colorText)]";
}

function FieldLabel({ children }: { children: ReactNode }) {
	return <div className="text-[13px] bg-re font-bold text-[var(--ant-colorText)]">{children}</div>;
}

function NoticeBox({ message, tone }: { message: string, tone: NoticeTone }) {
	return <div className={getNoticeClassName(tone)}>{message}</div>;
}

function ManagementActionCard({
	accent,
	description,
	icon,
	label,
	state,
	status,
	title,
	onClick,
}: {
	accent: ActionAccent
	description: string
	icon: ReactNode
	label: string
	state: ActionState
	status: string
	title: string
	onClick: () => void
}) {
	return (
		<Card>
			<button type="button" className="group w-full bg-transparent rounded-lg   text-right hover:shadow-[var(--ant-boxShadowTertiary)]" onClick={onClick}>
				<div dir="ltr" className="mb-3 flex items-center justify-between gap-3">
					<span className={getStatusPillClassName(state)}>{status}</span>
					<div dir="rtl" className="flex flex-1 items-center justify-start gap-3 text-right">
						<span className={getActionIconClassName(accent)}>{icon}</span>
						<div className="min-w-0 space-y-1">
							<div className={getActionTitleClassName(accent)}>{title}</div>
							<div className="text-xs text-[var(--ant-colorTextTertiary)]">{label}</div>
						</div>
					</div>
				</div>
				<p className="m-0 text-[13px] leading-8 text-[var(--ant-colorTextSecondary)]">{description}</p>
			</button>
		</Card>
	);
}

function OverviewPanel({
	user,
	onClose,
	onNavigate,
}: {
	user: AdminUserDto
	onClose: () => void
	onNavigate: (view: Exclude<ModalView, "overview">) => void
}) {
	const isServiceAdmin = getIsServiceAdmin(user);
	const isDeputyServiceAdmin = getIsDeputyServiceAdmin(user);
	const hasManagedParent = (user.managed_by_admin_ids?.length ?? 0) > 0;

	return (
		<div className={panelClassName}>
			<section className={boxClassName}>
				<p className={paragraphClassName}>
					در این بخش می‌توانید جایگاه مدیریتی این کاربر را به‌صورت متمرکز مشخص کنید. از همین‌جا می‌شود تعیین کرد که
					کاربر ادمین سرویس باشد، معاون ادمین سرویس شود، یا به‌عنوان کاربر عادی زیرمجموعه یک ادمین سرویس دیگر قرار
					بگیرد یا از آن رابطه خارج شود.
				</p>
			</section>

			<div className="flex flex-col gap-[14px]">
				<ManagementActionCard
					accent="service"
					description="در این بخش مشخص می‌کنید که این کاربر ادمین سرویس باشد یا نه. فهرست سرویس‌هایی که این کاربر مجاز به مدیریت آن‌هاست، پس از ذخیره بر اساس دسترسی‌های واقعی و مؤثر خودش تعیین می‌شود."
					icon={<CrownOutlined />}
					label="وضعیت کاربر در سطح ادمین سرویس"
					state={isServiceAdmin ? "active" : "inactive"}
					status={isServiceAdmin ? "فعال" : "غیرفعال"}
					title="تنظیم ادمین سرویس"
					onClick={() => onNavigate("service-admin")}
				/>

				<ManagementActionCard
					accent="deputy"
					description="در این بخش می‌توانید اختیارهای معاون را مشخص کنید. معاون فقط در محدوده ادمین سرویس بالادست خود و به اندازه دسترسی‌هایی که واقعاً در اختیار دارد فعالیت می‌کند."
					icon={<SafetyCertificateOutlined />}
					label="وضعیت کاربر در سطح معاون ادمین سرویس"
					state={isDeputyServiceAdmin ? "active" : "inactive"}
					status={isDeputyServiceAdmin ? "فعال" : "غیرفعال"}
					title="تنظیم معاون ادمین سرویس"
					onClick={() => onNavigate("deputy-service-admin")}
				/>

				<ManagementActionCard
					accent="link"
					description="این بخش فقط برای کاربران عادی است و مشخص می‌کند که این کاربر زیرمجموعه کدام ادمین سرویس باشد یا از زیرمجموعه او خارج شود."
					icon={hasManagedParent ? <LinkOutlined /> : <DisconnectOutlined />}
					label="وضعیت اتصال کاربر عادی به ادمین سرویس"
					state={hasManagedParent ? "linked" : "unlinked"}
					status={hasManagedParent ? "دارد" : "ندارد"}
					title="اتصال یا جداسازی از ادمین سرویس"
					onClick={() => onNavigate("managed-user-link")}
				/>
			</div>

			<div className={footerClassName}>
				<BasicButton onClick={onClose}>بستن</BasicButton>
			</div>
		</div>
	);
}

function ServiceAdminPanel({
	user,
	onCancel,
	onUpdated,
}: {
	user: AdminUserDto
	onCancel: () => void
	onUpdated: () => void
}) {
	const [isServiceAdmin, setIsServiceAdmin] = useState(() => getIsServiceAdmin(user));
	const [saving, setSaving] = useState(false);
	const initialValue = getIsServiceAdmin(user);

	async function handleSave() {
		setSaving(true);
		try {
			await fetchAssignServiceAdmin(user.id, { is_service_admin: isServiceAdmin });
			window.$message?.success(
				isServiceAdmin
					? "وضعیت ادمین سرویس کاربر ذخیره شد."
					: "کاربر از وضعیت ادمین سرویس خارج شد.",
			);
			onUpdated();
		}
		finally {
			setSaving(false);
		}
	}

	return (
		<div className={panelClassName}>
			<NoticeBox
				tone="warning"
				message="با انجام این تغییر، اگر کاربر هم‌اکنون زیرمجموعه ادمین سرویس دیگری باشد، ارتباط قبلی حذف می‌شود."
			/>

			<section className={cx(boxClassName, "space-y-4")}>
				<Checkbox checked={isServiceAdmin} className={checkboxClassName()} onChange={event => setIsServiceAdmin(event.target.checked)}>
					این کاربر ادمین سرویس است
				</Checkbox>

				<p className={hintClassName}>
					سرویس‌های قابل مدیریت در این پنجره به‌صورت دستی انتخاب نمی‌شوند. پس از ذخیره، این فهرست از اطلاعات ثبت‌شده
					در سامانه و دسترسی مؤثر همین کاربر خوانده می‌شود.
				</p>
			</section>

			<div className={footerClassName}>
				<BasicButton type="primary" loading={saving} disabled={saving || isServiceAdmin === initialValue} onClick={handleSave}>
					ذخیره
				</BasicButton>
				<BasicButton onClick={onCancel}>انصراف</BasicButton>
			</div>
		</div>
	);
}

function DeputyServiceAdminPanel({
	serviceAdminUsers,
	user,
	onCancel,
	onUpdated,
}: {
	serviceAdminUsers: AdminUserDto[]
	user: AdminUserDto
	onCancel: () => void
	onUpdated: () => void
}) {
	const initialDeputyState = getIsDeputyServiceAdmin(user);
	const [isDeputyServiceAdmin, setIsDeputyServiceAdmin] = useState(() => initialDeputyState);
	const [parentServiceAdminId, setParentServiceAdminId] = useState<number | undefined>(() => user.deputy_service_admin_id ?? undefined);
	const [permissions, setPermissions] = useState<AdminUserDeputyPermissionsDto>(() => user.deputy_permissions ?? EMPTY_DEPUTY_PERMISSIONS);
	const [saving, setSaving] = useState(false);

	const serviceAdminOptions = useMemo(() => {
		return serviceAdminUsers
			.filter(serviceAdminUser => serviceAdminUser.id !== user.id)
			.map(serviceAdminUser => ({
				label: toServiceAdminOptionLabel(serviceAdminUser),
				value: serviceAdminUser.id,
			}));
	}, [serviceAdminUsers, user.id]);

	const hasAnyPermission = hasAtLeastOneDeputyPermission(permissions);
	const canSave = !saving && (!isDeputyServiceAdmin || (Boolean(parentServiceAdminId) && hasAnyPermission));

	async function handleSave() {
		const payload: AdminUserAssignDeputyServiceAdminPayload = isDeputyServiceAdmin
			? {
				is_deputy_service_admin: true,
				...permissions,
				service_admin_user_id: parentServiceAdminId ?? null,
			}
			: {
				is_deputy_service_admin: false,
				...EMPTY_DEPUTY_PERMISSIONS,
				service_admin_user_id: null,
			};

		setSaving(true);
		try {
			await fetchAssignDeputyServiceAdmin(user.id, payload);
			window.$message?.success(
				isDeputyServiceAdmin
					? "وضعیت معاون ادمین سرویس کاربر ذخیره شد."
					: "کاربر از وضعیت معاون ادمین سرویس خارج شد.",
			);
			onUpdated();
		}
		finally {
			setSaving(false);
		}
	}

	function togglePermission(permissionKey: keyof AdminUserDeputyPermissionsDto, checked: boolean) {
		setPermissions(currentPermissions => ({
			...currentPermissions,
			[permissionKey]: checked,
		}));
	}

	return (
		<div className={panelClassName}>
			<NoticeBox
				tone="info"
				message="معاون زیرمجموعه مستقیم ادمین سرویس است. کاربر و نقش‌هایی که به‌وسیله او ایجاد می‌شوند در همان محدوده ادمین سرویس بالادست باقی می‌مانند و خود معاون نیز نمی‌تواند معاون دیگری تعریف کند."
			/>

			<section className={cx(boxClassName, "space-y-4")}>
				<Checkbox
					checked={isDeputyServiceAdmin}
					className={checkboxClassName()}
					onChange={event => setIsDeputyServiceAdmin(event.target.checked)}
				>
					این کاربر معاون ادمین سرویس است
				</Checkbox>

				<div className={fieldGroupClassName}>
					<FieldLabel>ادمین سرویس والد</FieldLabel>
					<Select
						allowClear
						className={selectClassName}
						disabled={!isDeputyServiceAdmin}
						options={serviceAdminOptions}
						placeholder="انتخاب کنید"
						popupClassName={selectPopupClassName}
						value={parentServiceAdminId}
						onChange={value => setParentServiceAdminId(value)}
					/>
				</div>

				<div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
					{DEPUTY_PERMISSION_OPTIONS.map(permissionOption => (
						<label
							key={permissionOption.key}
							className={cx(
								"flex min-h-11 items-center rounded-2xl border border-[var(--ant-colorBorderSecondary)] bg-[var(--ant-colorBgContainer)] px-4 py-2.5",
								!isDeputyServiceAdmin && "opacity-70",
								isDeputyServiceAdmin && "hover:border-[var(--ant-colorPrimaryBorder)] hover:shadow-[var(--ant-boxShadowTertiary)]",
							)}
						>
							<Checkbox
								checked={permissions[permissionOption.key]}
								className="[&_.ant-checkbox]:order-2 [&_.ant-checkbox+span]:!w-full [&_.ant-checkbox+span]:!ps-2 [&_.ant-checkbox+span]:!text-[14px] [&_.ant-checkbox+span]:!font-bold [&_.ant-checkbox+span]:!text-[var(--ant-colorText)]"
								disabled={!isDeputyServiceAdmin}
								onChange={event => togglePermission(permissionOption.key, event.target.checked)}
							>
								{permissionOption.label}
							</Checkbox>
						</label>
					))}
				</div>

				<p className={hintClassName}>
					اگر این کاربر به‌عنوان معاون فعال شود، سامانه او را از حالت کاربر عادی زیرمجموعه خارج می‌کند. برای فعال‌سازی
					معاونت، باید دست‌کم یکی از اختیارهای معاون روشن باشد.
				</p>
			</section>

			<div className={footerClassName}>
				<BasicButton type="primary" loading={saving} disabled={!canSave} onClick={handleSave}>
					ذخیره
				</BasicButton>
				<BasicButton onClick={onCancel}>انصراف</BasicButton>
			</div>
		</div>
	);
}

function ManagedUserLinkPanel({
	serviceAdminUsers,
	user,
	onCancel,
	onUpdated,
}: {
	serviceAdminUsers: AdminUserDto[]
	user: AdminUserDto
	onCancel: () => void
	onUpdated: () => void
}) {
	const currentManagedAdminIds = user.managed_by_admin_ids ?? [];
	const currentManagedAdmins = serviceAdminUsers.filter(serviceAdminUser => currentManagedAdminIds.includes(serviceAdminUser.id));
	const [selectedServiceAdminId, setSelectedServiceAdminId] = useState<number | undefined>(() => currentManagedAdminIds[0]);
	const [saving, setSaving] = useState(false);

	const serviceAdminOptions = useMemo(() => {
		return serviceAdminUsers
			.filter(serviceAdminUser => serviceAdminUser.id !== user.id)
			.map(serviceAdminUser => ({
				label: toServiceAdminOptionLabel(serviceAdminUser),
				value: serviceAdminUser.id,
			}));
	}, [serviceAdminUsers, user.id]);

	const isOrdinaryUser = getIsOrdinaryManagedUser(user);
	const isAlreadyAttachedToSelected = selectedServiceAdminId != null && currentManagedAdminIds.includes(selectedServiceAdminId);
	const canAttach = isOrdinaryUser && !!selectedServiceAdminId && !saving && !isAlreadyAttachedToSelected;
	const canDetach = isOrdinaryUser && currentManagedAdmins.length > 0 && !saving;

	async function handleAttach() {
		if (!selectedServiceAdminId) {
			return;
		}

		const payload: AdminUserAttachManagedUserPayload = {
			admin_user_id: selectedServiceAdminId,
		};

		setSaving(true);
		try {
			await fetchAttachManagedUser(user.id, payload);
			window.$message?.success("کاربر به ادمین سرویس متصل شد.");
			onUpdated();
		}
		finally {
			setSaving(false);
		}
	}

	async function handleDetach() {
		setSaving(true);
		try {
			await fetchDetachManagedUser(user.id);
			window.$message?.success("کاربر از ادمین سرویس جدا شد.");
			onUpdated();
		}
		finally {
			setSaving(false);
		}
	}

	return (
		<div className={panelClassName}>
			<NoticeBox tone="link" message="فقط کاربران عادی را می‌توان به ادمین سرویس متصل کرد." />

			<section className={cx(boxClassName, "space-y-4")}>
				<div className={fieldGroupClassName}>
					<FieldLabel>ادمین سرویس</FieldLabel>
					<Select
						allowClear
						className={selectClassName}
						disabled={!isOrdinaryUser}
						options={serviceAdminOptions}
						placeholder="انتخاب کنید"
						popupClassName={selectPopupClassName}
						value={selectedServiceAdminId}
						onChange={value => setSelectedServiceAdminId(value)}
					/>
				</div>

				<div className={fieldGroupClassName}>
					<FieldLabel>ادمین‌های سرویس فعلی</FieldLabel>
					<p className={paragraphClassName}>
						{currentManagedAdmins.length > 0
							? currentManagedAdmins.map(currentAdmin => toServiceAdminOptionLabel(currentAdmin)).join("، ")
							: "ندارد"}
					</p>
				</div>

				<p className={hintClassName}>
					پس از جداسازی، ممکن است این کاربر دیگر زیرمجموعه هیچ ادمین سرویسی نباشد.
				</p>
			</section>

			<div className={footerClassName}>
				<BasicButton type="primary" loading={saving} disabled={!canAttach} onClick={handleAttach}>
					اتصال
				</BasicButton>
				<BasicButton danger loading={saving} disabled={!canDetach} onClick={handleDetach}>
					جداسازی
				</BasicButton>
				<BasicButton onClick={onCancel}>انصراف</BasicButton>
			</div>
		</div>
	);
}

function ServiceAdminModalFlow({
	loading,
	user,
	onClose,
	onUpdated,
}: {
	loading?: boolean
	user: AdminUserDto
	onClose: () => void
	onUpdated: () => void
}) {
	const [view, setView] = useState<ModalView>("overview");

	const usersDirectoryQuery = useQuery({
		queryKey: ["audit", "admin", "users", "directory"],
		queryFn: () => fetchAdminUsersList({ page: 1, page_size: 200 }),
		staleTime: 60_000,
	});

	const serviceAdminUsers = useMemo(() => {
		return (usersDirectoryQuery.data?.results ?? []).filter(directoryUser => getIsServiceAdmin(directoryUser));
	}, [usersDirectoryQuery.data?.results]);

	let title = `تنظیم سطح دسترسی برای ${user.username}`;

	if (view === "service-admin") {
		title = `وضعیت ادمین سرویس برای ${user.username}`;
	}
	else if (view === "deputy-service-admin") {
		title = `وضعیت معاون ادمین سرویس برای ${user.username}`;
	}
	else if (view === "managed-user-link") {
		title = `اتصال یا جداسازی ${user.username}`;
	}

	function handleUpdated() {
		setView("overview");
		onUpdated();
	}

	function handleCancel() {
		setView("overview");
	}

	return (
		<Modal
			open
			className=""
			closeIcon={<CloseOutlined />}
			destroyOnHidden
			footer={null}
			maskClosable={false}
			title={title}
			width={700}
			onCancel={view === "overview" ? onClose : handleCancel}
		>
			<Spin spinning={!!loading || usersDirectoryQuery.isLoading}>
				{view === "overview" && <OverviewPanel user={user} onClose={onClose} onNavigate={setView} />}

				{view === "service-admin" && (
					<ServiceAdminPanel user={user} onCancel={handleCancel} onUpdated={handleUpdated} />
				)}

				{view === "deputy-service-admin" && (
					<DeputyServiceAdminPanel
						serviceAdminUsers={serviceAdminUsers}
						user={user}
						onCancel={handleCancel}
						onUpdated={handleUpdated}
					/>
				)}

				{view === "managed-user-link" && (
					<ManagedUserLinkPanel
						serviceAdminUsers={serviceAdminUsers}
						user={user}
						onCancel={handleCancel}
						onUpdated={handleUpdated}
					/>
				)}
			</Spin>
		</Modal>
	);
}

export function AdminUserServiceAdminModal({ open, user, loading, onClose, onUpdated }: Props) {
	if (!open || !user) {
		return null;
	}

	return (
		<ServiceAdminModalFlow
			key={`${user.id}-${user.admin_role}-${user.deputy_service_admin_id ?? "none"}-${user.managed_by_admin_ids?.join(",") ?? "none"}`}
			loading={loading}
			user={user}
			onClose={onClose}
			onUpdated={onUpdated}
		/>
	);
}
