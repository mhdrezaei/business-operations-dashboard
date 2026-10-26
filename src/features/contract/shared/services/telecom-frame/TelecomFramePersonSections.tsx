import { telecomFrameDirectoryQuery } from "#src/features/contract/shared/queries/telecom-frame.queries";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toDirectoryOptions } from "./telecom-frame.directory";
import { DirectorySelect, TelecomFramePersonPicker } from "./TelecomFramePersonPicker";

interface PickerProps {
	companyType: string | null | undefined
}

export function TelecomFrameBoPersonPicker({ companyType }: PickerProps) {
	const { t } = useTranslation();
	const [departmentId, setDepartmentId] = useState<number | null>(null);
	const [generalOfficeId, setGeneralOfficeId] = useState<number | null>(null);
	const departments = useQuery(telecomFrameDirectoryQuery("bo/departments"));
	const generalOffices = useQuery(telecomFrameDirectoryQuery("bo/general-offices", { department: departmentId }, departmentId != null));
	const allPeople = useQuery(telecomFrameDirectoryQuery("bo/people"));
	const people = useQuery(telecomFrameDirectoryQuery("bo/people", { general_office: generalOfficeId }, generalOfficeId != null));

	return (
		<TelecomFramePersonPicker
			name="serviceFields.boPersonIds"
			title={t("contract.telecomFrame.boPersons")}
			allPeople={allPeople.data}
			people={people.data}
			personDisabled={generalOfficeId == null}
			personLoading={people.isFetching}
			companyType={companyType}
		>
			<DirectorySelect
				label={t("contract.telecomFrame.department")}
				value={departmentId}
				options={toDirectoryOptions(departments.data, companyType)}
				loading={departments.isLoading}
				onChange={(id) => {
					setDepartmentId(id);
					setGeneralOfficeId(null);
				}}
			/>
			<DirectorySelect
				label={t("contract.telecomFrame.generalOffice")}
				value={generalOfficeId}
				options={toDirectoryOptions(departmentId == null ? [] : generalOffices.data, companyType)}
				disabled={departmentId == null}
				loading={generalOffices.isFetching}
				onChange={setGeneralOfficeId}
			/>
		</TelecomFramePersonPicker>
	);
}

export function TelecomFramePoPersonPicker({ companyType }: PickerProps) {
	const { t } = useTranslation();
	const [divisionId, setDivisionId] = useState<number | null>(null);
	const divisions = useQuery(telecomFrameDirectoryQuery("po/divisions"));
	const allPeople = useQuery(telecomFrameDirectoryQuery("po/people"));
	const people = useQuery(telecomFrameDirectoryQuery("po/people", { division: divisionId }, divisionId != null));

	return (
		<TelecomFramePersonPicker
			name="serviceFields.poPersonIds"
			title={t("contract.telecomFrame.poPersons")}
			allPeople={allPeople.data}
			people={people.data}
			personDisabled={divisionId == null}
			personLoading={people.isFetching}
			companyType={companyType}
		>
			<DirectorySelect
				label={t("contract.telecomFrame.division")}
				value={divisionId}
				options={toDirectoryOptions(divisions.data, companyType)}
				loading={divisions.isLoading}
				onChange={setDivisionId}
			/>
		</TelecomFramePersonPicker>
	);
}
