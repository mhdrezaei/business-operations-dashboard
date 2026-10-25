import type { TelecomFrameDirectoryResource } from "#src/features/contract/api/telecom-frame.api";
import type { TFunction } from "i18next";
import { z } from "zod";

export type MasterDataLevel = "department" | "generalOffice" | "boPerson" | "division" | "poPerson";
export type MasterDataTab = "bo" | "po";

export interface MasterDataLevelConfig {
	resource: TelecomFrameDirectoryResource
	/** i18n key under `telecomFrameMasterData.levels` */
	titleKey: string
	isPerson: boolean
	/** Parent level whose selection scopes (and is sent with) this level's records. */
	parent?: { level: MasterDataLevel, field: "department" | "general_office" | "division" }
}

/** BO: department > general office > person. PO: division > person. */
export const MASTER_DATA_LEVELS: Record<MasterDataLevel, MasterDataLevelConfig> = {
	department: { resource: "bo/departments", titleKey: "department", isPerson: false },
	generalOffice: { resource: "bo/general-offices", titleKey: "generalOffice", isPerson: false, parent: { level: "department", field: "department" } },
	boPerson: { resource: "bo/people", titleKey: "boPerson", isPerson: true, parent: { level: "generalOffice", field: "general_office" } },
	division: { resource: "po/divisions", titleKey: "division", isPerson: false },
	poPerson: { resource: "po/people", titleKey: "poPerson", isPerson: true, parent: { level: "division", field: "division" } },
};

export function masterDataFormSchema(t: TFunction<"translation", undefined>) {
	return z.object({
		name: z.string().trim().min(1, t("form.required")),
		title: z.string().trim(),
		company_types: z.array(z.string()),
		is_active: z.boolean(),
	});
}

export type MasterDataFormValues = z.infer<ReturnType<typeof masterDataFormSchema>>;

export interface MasterDataPayload {
	name?: string
	full_name?: string
	title?: string
	company_types: string[]
	is_active: boolean
	department?: number
	general_office?: number
	division?: number
}

/** Persons send `full_name`/`title`; the other levels send `name`. The parent id is added by the caller. */
export function toMasterDataPayload(values: MasterDataFormValues, isPerson: boolean): MasterDataPayload {
	const base = { company_types: values.company_types, is_active: values.is_active };
	return isPerson
		? { full_name: values.name, title: values.title, ...base }
		: { name: values.name, ...base };
}
