import type { PublicProfileDto, UpsertPublicProfilePayload } from "#src/features/company-profile/api/company-profile.api";
import type { SocialLinkItem } from "../company-info.types";

function cleanArray(v: unknown): string[] {
	if (!v)
		return [];
	if (Array.isArray(v))
		return v.map(x => String(x).trim()).filter(Boolean);

	const s = String(v);
	return s.split(/\n|,/g).map(x => x.trim()).filter(Boolean);
}

function parseSocialLinks(raw: string | null | undefined): SocialLinkItem[] {
	if (!raw)
		return [];
	try {
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : [];
	}
	catch {
		return [];
	}
}

function serializeSocialLinks(items: SocialLinkItem[]): string | null {
	const cleaned = items
		.map(i => ({ label: i.label.trim(), url: i.url.trim() }))
		.filter(i => i.label && i.url);
	return cleaned.length ? JSON.stringify(cleaned) : null;
}

export interface PublicProfileFormValues {
	service: number
	company: number
	legal_name: string
	brand_name: string
	legal_address: string
	postal_code: string
	map_address: string
	map_latitude: string
	map_longitude: string
	phone: string[]
	mobile: string[]
	fax: string[]
	email: string[]
	website: string
	working_hours: string
	social_links: SocialLinkItem[]
}

export const emptyPublicProfileValues: PublicProfileFormValues = {
	service: 0,
	company: 0,
	legal_name: "",
	brand_name: "",
	legal_address: "",
	postal_code: "",
	map_address: "",
	map_latitude: "",
	map_longitude: "",
	phone: [],
	mobile: [],
	fax: [],
	email: [],
	website: "",
	working_hours: "",
	social_links: [],
};

export function dtoToPublicForm(dto: PublicProfileDto, meta: { serviceId: number, companyId: number }): PublicProfileFormValues {
	return {
		service: meta.serviceId,
		company: meta.companyId,
		legal_name: dto.legal_name ?? "",
		brand_name: dto.brand_name ?? "",
		legal_address: dto.legal_address ?? "",
		postal_code: dto.postal_code ?? "",
		map_address: dto.map_address ?? "",
		map_latitude: dto.map_latitude ?? "",
		map_longitude: dto.map_longitude ?? "",
		phone: cleanArray(dto.phone),
		mobile: cleanArray(dto.mobile),
		fax: cleanArray(dto.fax),
		email: cleanArray(dto.email),
		website: dto.website ?? "",
		working_hours: dto.working_hours ?? "",
		social_links: parseSocialLinks(dto.social_links),
	};
}

export function publicFormToPayload(values: PublicProfileFormValues): UpsertPublicProfilePayload {
	return {
		service: values.service,
		company: values.company,
		legal_name: values.legal_name.trim() || null,
		brand_name: values.brand_name.trim() || null,
		legal_address: values.legal_address.trim() || null,
		postal_code: values.postal_code.trim() || null,
		map_address: values.map_address.trim() || null,
		map_latitude: values.map_latitude.trim() || null,
		map_longitude: values.map_longitude.trim() || null,

		phone: values.phone.map(x => x.trim()).filter(Boolean),
		mobile: values.mobile.map(x => x.trim()).filter(Boolean),
		fax: values.fax.map(x => x.trim()).filter(Boolean),
		email: values.email.map(x => x.trim()).filter(Boolean),

		website: values.website.trim() || null,
		working_hours: values.working_hours.trim() || null,
		social_links: serializeSocialLinks(values.social_links),
	};
}
