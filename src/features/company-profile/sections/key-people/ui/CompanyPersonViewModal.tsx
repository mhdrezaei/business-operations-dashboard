import type { CompanyPersonDto } from "../model/company-people.types";
import { Descriptions, Modal } from "antd";
import React from "react";
import { formatJalaliDate } from "../../../shared/utils/jalali-date";
import { COMPANY_PERSON_GENDER_OPTIONS, COMPANY_PERSON_ROLE_OPTIONS, getRoleSlotGroupLabel } from "../model/company-people.constants";
import { getPersonSlotIndex } from "../model/company-people.contract-order";

interface Props {
	person: CompanyPersonDto | null
	onClose: () => void
}

function formatContacts(values: string[] | null) {
	return values?.filter(Boolean).join("، ") || "-";
}

export default function CompanyPersonViewModal({ person, onClose }: Props) {
	return (
		<Modal open={!!person} onCancel={onClose} title="مشاهده شخص کلیدی" footer={null} width={640} destroyOnHidden>
			{person && (
				<Descriptions bordered column={1} size="small">
					<Descriptions.Item label="نام">{person.full_name || "-"}</Descriptions.Item>
					<Descriptions.Item label="نقش">{COMPANY_PERSON_ROLE_OPTIONS.find(option => option.value === person.role)?.label ?? person.role ?? "-"}</Descriptions.Item>
					<Descriptions.Item label="صاحب امضا">{person.is_signatory ? "بله" : "خیر"}</Descriptions.Item>
					<Descriptions.Item label="شناسه ملی">{person.national_id || "-"}</Descriptions.Item>
					<Descriptions.Item label="عنوان">{person.title || "-"}</Descriptions.Item>
					<Descriptions.Item label="جنسیت">{COMPANY_PERSON_GENDER_OPTIONS.find(option => option.value === person.gender)?.label ?? "تعیین نشده"}</Descriptions.Item>
					<Descriptions.Item label="شماره روزنامه رسمی">{person.official_gazette_number || "-"}</Descriptions.Item>
					<Descriptions.Item label="تاریخ روزنامه رسمی">{formatJalaliDate(person.official_gazette_date)}</Descriptions.Item>
					<Descriptions.Item label="شماره جایگاه در نقش">{getPersonSlotIndex(person) ?? "نمایش داده نمی‌شود"}</Descriptions.Item>
					<Descriptions.Item label="گروه جایگاه در قرارداد">{getRoleSlotGroupLabel(person.role_slot_group) || "ثبت نشده"}</Descriptions.Item>
					<Descriptions.Item label="تلفن"><span dir="ltr">{formatContacts(person.phone)}</span></Descriptions.Item>
					<Descriptions.Item label="ایمیل"><span dir="ltr">{formatContacts(person.email)}</span></Descriptions.Item>
				</Descriptions>
			)}
		</Modal>
	);
}
