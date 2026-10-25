import type { PublicProfileDto, UpsertPublicProfilePayload } from "#src/features/company-profile/api/company-profile.api";
import type { SocialLinkItem } from "../company-info.types";
import { normalizeMapCoordinate } from "../company-map-coordinate";

function cleanArray(v: unknown): string[] {
	if (!v)
		return [];
	if (Array.isArray(v))
		return v.map(x => String(x).trim()).filter(Boolean);

	const s = String(v);
	return s.split(/\n|,/g).map(x => x.trim()).filter(Boolean);
}

export function parseSocialLinks(raw: unknown): SocialLinkItem[] {
	if (!raw)
		return [];
	if (Array.isArray(raw)) {
		return raw
			.map((item) => {
				const entry = (item ?? {}) as Record<string, unknown>;
				return {
					label: String(entry.name ?? entry.label ?? entry.key ?? "").trim(),
					url: String(entry.url ?? entry.value ?? "").trim(),
				};
			})
			.filter(item => item.label || item.url);
	}
	if (typeof raw === "object")
		return Object.entries(raw).map(([label, url]) => ({ label: label.trim(), url: String(url ?? "").trim() }));
	if (typeof raw === "string") {
		try {
			return parseSocialLinks(JSON.parse(raw.trim()));
		}
		catch {
			return [];
		}
	}
	return [];
}

export function serializeSocialLinks(items: SocialLinkItem[]): Record<string, string> | undefined {
	const entries = items
		.map(i => [i.label.trim(), i.url.trim()] as const)
		.filter(([label, url]) => label && url);
	return entries.length ? Object.fromEntries(entries) : undefined;
}

export function normalizeWebsiteUrl(value: string): string {
	const trimmed = value.trim();
	if (!trimmed || /^https?:\/\//i.test(trimmed))
		return trimmed;
	return `https://${trimmed}`;
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
		map_latitude: normalizeMapCoordinate(values.map_latitude),
		map_longitude: normalizeMapCoordinate(values.map_longitude),

		phone: values.phone.map(x => x.trim()).filter(Boolean),
		mobile: values.mobile.map(x => x.trim()).filter(Boolean),
		fax: values.fax.map(x => x.trim()).filter(Boolean),
		email: values.email.map(x => x.trim()).filter(Boolean),

		website: normalizeWebsiteUrl(values.website) || null,
		working_hours: values.working_hours.trim() || null,
		social_links: serializeSocialLinks(values.social_links),
	};
}
