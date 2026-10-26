import type {
	CompanyCopyEndpoint,
	CompanyCopySectionKey,
	CompanyDataSnapshot,
	CopyCompanyDataParams,
} from "../model/company-data-copy.types";
import {
	createBankAccount,
	deleteBankAccount,
	listBankAccounts,
} from "../../../api/bank-accounts.api";
import {
	createFinanceProfile,
	createInternalProfile,
	createLegalProfile,
	createPublicProfile,
	getFinanceProfile,
	getInternalProfile,
	getLegalProfile,
	getPublicProfile,
	updateFinanceProfile,
	updateInternalProfile,
	updateLegalProfile,
	updatePublicProfile,
} from "../../../api/company-profile.api";
import {
	createCompanyPerson,
	deleteCompanyPerson,
	listCompanyPeople,
} from "../../../api/key-people.api";
import {
	createShareholder,
	deleteShareholder,
	listShareholders,
} from "../../../api/shareholders.api";
import { parseSocialLinks, serializeSocialLinks } from "../../company-info/model/public/company-public.mappers";
import { COMPANY_COPY_SECTION_KEYS } from "../model/company-data-copy.types";

export async function getCompanyDataSnapshot(
	endpoint: CompanyCopyEndpoint,
	sections: readonly CompanyCopySectionKey[] = COMPANY_COPY_SECTION_KEYS,
): Promise<CompanyDataSnapshot> {
	const params = { company: endpoint.companyId, service: endpoint.serviceId };
	const includes = (section: CompanyCopySectionKey) => sections.includes(section);
	const [publicProfile, legal, finance, internal, people, bankAccounts, shareholders] = await Promise.all([
		includes("public") ? getPublicProfile(params) : Promise.resolve(null),
		includes("legal") ? getLegalProfile(params) : Promise.resolve(null),
		includes("finance") ? getFinanceProfile(params) : Promise.resolve(null),
		includes("internal") ? getInternalProfile(params) : Promise.resolve(null),
		includes("people") ? listCompanyPeople({ company: endpoint.companyId }) : Promise.resolve({ results: [] }),
		includes("bankAccounts") ? listBankAccounts({ company: endpoint.companyId }) : Promise.resolve({ results: [] }),
		includes("shareholders") ? listShareholders({ company: endpoint.companyId }) : Promise.resolve({ results: [] }),
	]);

	return {
		public: publicProfile,
		legal,
		finance,
		internal,
		people: people.results,
		bankAccounts: bankAccounts.results,
		shareholders: shareholders.results,
	};
}

export function getCompanyCopySectionCount(snapshot: CompanyDataSnapshot | undefined, section: CompanyCopySectionKey) {
	if (!snapshot)
		return 0;

	const value = snapshot[section];
	return Array.isArray(value) ? value.length : value ? 1 : 0;
}

export function companyCopySectionHasData(snapshot: CompanyDataSnapshot | undefined, section: CompanyCopySectionKey) {
	return getCompanyCopySectionCount(snapshot, section) > 0;
}

async function copyPublic(source: CompanyDataSnapshot, destination: CompanyDataSnapshot, endpoint: CompanyCopyEndpoint) {
	if (!source.public)
		return;

	const payload = {
		service: endpoint.serviceId,
		company: endpoint.companyId,
		legal_name: source.public.legal_name,
		brand_name: source.public.brand_name,
		legal_address: source.public.legal_address,
		postal_code: source.public.postal_code,
		map_address: source.public.map_address,
		map_latitude: source.public.map_latitude,
		map_longitude: source.public.map_longitude,
		phone: source.public.phone,
		mobile: source.public.mobile,
		fax: source.public.fax,
		email: source.public.email,
		website: source.public.website,
		working_hours: source.public.working_hours,
		social_links: serializeSocialLinks(parseSocialLinks(source.public.social_links)),
	};

	if (destination.public)
		await updatePublicProfile(destination.public.id, payload);
	else
		await createPublicProfile(payload);
}

async function copyLegal(source: CompanyDataSnapshot, destination: CompanyDataSnapshot, endpoint: CompanyCopyEndpoint) {
	if (!source.legal)
		return;

	const payload = {
		service: endpoint.serviceId,
		company: endpoint.companyId,
		national_id: source.legal.national_id,
		tax_national_id: source.legal.tax_national_id,
		registration_number: source.legal.registration_number,
		tax_registration_number: source.legal.tax_registration_number,
		registration_place: source.legal.registration_place,
		registration_date: source.legal.registration_date,
		official_gazette_number: source.legal.official_gazette_number,
		official_gazette_date: source.legal.official_gazette_date,
		legal_person_type: source.legal.legal_person_type,
		branch_code: source.legal.branch_code,
	};

	if (destination.legal)
		await updateLegalProfile(destination.legal.id, payload);
	else
		await createLegalProfile(payload);
}

async function copyFinance(source: CompanyDataSnapshot, destination: CompanyDataSnapshot, endpoint: CompanyCopyEndpoint) {
	if (!source.finance)
		return;

	const payload = {
		service: endpoint.serviceId,
		company: endpoint.companyId,
		contract_model: source.finance.contract_model,
		economic_code: source.finance.economic_code,
		tax_file_number: source.finance.tax_file_number,
		vat_status: source.finance.vat_status,
		tax_office: source.finance.tax_office,
		financial_commitment_cap: source.finance.financial_commitment_cap,
		settlement_term: source.finance.settlement_term,
	};

	if (destination.finance)
		await updateFinanceProfile(destination.finance.id, payload);
	else
		await createFinanceProfile(payload);
}

async function copyInternal(source: CompanyDataSnapshot, destination: CompanyDataSnapshot, endpoint: CompanyCopyEndpoint) {
	if (!source.internal)
		return;

	const payload = {
		service: endpoint.serviceId,
		company: endpoint.companyId,
		internal_code: source.internal.internal_code,
		internal_note: source.internal.internal_note,
		info_verification_status: source.internal.info_verification_status,
	};

	if (destination.internal)
		await updateInternalProfile(destination.internal.id, payload);
	else
		await createInternalProfile(payload);
}

async function copyPeople(source: CompanyDataSnapshot, destination: CompanyDataSnapshot, endpoint: CompanyCopyEndpoint) {
	for (const person of destination.people)
		await deleteCompanyPerson(person.id);

	for (const person of source.people) {
		await createCompanyPerson({
			company: endpoint.companyId,
			service: endpoint.serviceId,
			role: person.role,
			full_name: person.full_name,
			national_id: person.national_id ?? "",
			title: person.title ?? "",
			gender: person.gender ?? null,
			phone: person.phone,
			email: person.email,
			is_signatory: person.is_signatory,
			official_gazette_number: person.official_gazette_number ?? null,
			official_gazette_date: person.official_gazette_date ?? null,
			contract_order: person.contract_order,
		});
	}
}

async function copyBankAccounts(source: CompanyDataSnapshot, destination: CompanyDataSnapshot, endpoint: CompanyCopyEndpoint) {
	for (const account of destination.bankAccounts)
		await deleteBankAccount(account.id);

	for (const account of source.bankAccounts) {
		await createBankAccount({
			company: endpoint.companyId,
			service: endpoint.serviceId,
			bank_name: account.bank_name,
			account_number: account.account_number,
			iban: account.iban,
			card_number: account.card_number,
			account_holder_name: account.account_holder_name,
			contract_order: account.contract_order ?? null,
		});
	}
}

async function copyShareholders(source: CompanyDataSnapshot, destination: CompanyDataSnapshot, endpoint: CompanyCopyEndpoint) {
	for (const shareholder of destination.shareholders)
		await deleteShareholder(shareholder.id);

	for (const shareholder of source.shareholders) {
		await createShareholder({
			company: endpoint.companyId,
			service: endpoint.serviceId,
			full_name: shareholder.full_name,
			national_id: shareholder.national_id,
			ownership_percent: shareholder.ownership_percent,
			note: shareholder.note,
		});
	}
}

async function copySection(
	section: CompanyCopySectionKey,
	source: CompanyDataSnapshot,
	destination: CompanyDataSnapshot,
	endpoint: CompanyCopyEndpoint,
) {
	switch (section) {
		case "public":
			return copyPublic(source, destination, endpoint);
		case "legal":
			return copyLegal(source, destination, endpoint);
		case "finance":
			return copyFinance(source, destination, endpoint);
		case "internal":
			return copyInternal(source, destination, endpoint);
		case "people":
			return copyPeople(source, destination, endpoint);
		case "bankAccounts":
			return copyBankAccounts(source, destination, endpoint);
		case "shareholders":
			return copyShareholders(source, destination, endpoint);
	}
}

export async function copyCompanyData({ source, destination, sections }: CopyCompanyDataParams) {
	const [sourceSnapshot, destinationSnapshot] = await Promise.all([
		getCompanyDataSnapshot(source, sections),
		getCompanyDataSnapshot(destination, sections),
	]);

	const copiedSections: CompanyCopySectionKey[] = [];
	for (const section of sections) {
		if (!companyCopySectionHasData(sourceSnapshot, section))
			continue;

		await copySection(section, sourceSnapshot, destinationSnapshot, destination);
		copiedSections.push(section);
	}

	return copiedSections;
}
