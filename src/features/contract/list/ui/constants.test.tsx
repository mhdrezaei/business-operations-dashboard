import type { ContractListItemType } from "../model/contracts.list.types";
import type { GetContractColumnsArgs } from "./constants";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getContractColumns } from "./constants";

describe("getContractColumns", () => {
	const t = ((key: string, defaultVal?: string) => defaultVal || key) as any;

	const createDefaultArgs = (overrides?: Partial<GetContractColumnsArgs>): GetContractColumnsArgs => ({
		t,
		selectedServiceId: null,
		setSelectedServiceId: vi.fn(),
		isTrafficService: false,
		isCompanyTypeService: false,
		isSmsService: false,
		selectedSmsParty: null,
		setSelectedSmsParty: vi.fn(),
		showCompanyTypeColumn: false,
		selectedTrafficCompanyType: null,
		setSelectedTrafficCompanyType: vi.fn(),
		permittedTrafficCompanyTypeOptions: [
			{ key: "OPERATOR", value: "اپراتور" },
			{ key: "CP", value: "تأمین‌کننده محتوا" },
		],
		serviceOptions: [
			{ label: "سرویس پیامک", value: 10 },
			{ label: "سرویس ترافیک", value: 20 },
		],
		companyOptions: [
			{ label: "شرکت اول", value: 101 },
			{ label: "شرکت دوم", value: 102 },
		],
		isCompanyDisabled: false,
		companyPlaceholder: "انتخاب شرکت",
		onServiceFilterChange: vi.fn(),
		...overrides,
	});

	const mockRecord: ContractListItemType = {
		id: 1,
		contract_number: "CTR-1405-001",
		service_id: 10,
		service_name: "سرویس پیامک",
		company_id: 101,
		company_name: "شرکت اول",
		company_type: "operator",
		is_official: true,
		is_business_approved: true,
		is_signed: true,
		real_signed_at: "2026-03-21T10:00:00Z",
		addenda_count: 3,
		business_approved_addenda_count: 2,
		signed_addenda_count: 1,
		real_signed_addenda_count: 1,
		start_date: "2026-03-21",
		end_date: "2027-03-20",
		start_jy: 1405,
		start_jm: 1,
		end_jy: 1405,
		end_jm: 12,
		created_by_user: { first_name: "رضا", last_name: "محمدی" },
		updated_by_user: { first_name: "علی", last_name: "کریمی" },
	};

	it("returns core columns list with proper configs", () => {
		const args = createDefaultArgs();
		const columns = getContractColumns(args);

		expect(columns).toBeDefined();
		expect(columns.length).toBeGreaterThanOrEqual(15);

		const dataIndexes = columns.map(c => c.dataIndex);
		expect(dataIndexes).toContain("id");
		expect(dataIndexes).toContain("contract_number");
		expect(dataIndexes).toContain("service_name");
		expect(dataIndexes).toContain("service_id");
		expect(dataIndexes).toContain("company_type");
		expect(dataIndexes).toContain("company_name");
		expect(dataIndexes).toContain("company_id");
		expect(dataIndexes).toContain("is_official");
		expect(dataIndexes).toContain("is_business_approved");
		expect(dataIndexes).toContain("is_signed");
		expect(dataIndexes).toContain("addenda_count");
	});

	it("correctly renders contract number and service name", () => {
		const args = createDefaultArgs();
		const columns = getContractColumns(args);

		const contractNumCol = columns.find(c => c.dataIndex === "contract_number");
		const { container: numContainer } = render(
			<>{(contractNumCol?.render as any)(null, mockRecord)}</>,
		);
		expect(numContainer.textContent).toContain("CTR-۱۴۰۵-۰۰۱");

		const serviceNameCol = columns.find(c => c.dataIndex === "service_name");
		const { container: serviceContainer } = render(
			<>{(serviceNameCol?.render as any)(null, mockRecord)}</>,
		);
		expect(serviceContainer.textContent).toBe("سرویس پیامک");
	});

	it("hides company_type column when showCompanyTypeColumn is false", () => {
		const args = createDefaultArgs({ showCompanyTypeColumn: false });
		const columns = getContractColumns(args);
		const companyTypeCol = columns.find(c => c.dataIndex === "company_type");

		expect(companyTypeCol?.hideInTable).toBe(true);
	});

	it("shows company_type column and correctly translates label when showCompanyTypeColumn is true", () => {
		const args = createDefaultArgs({ showCompanyTypeColumn: true });
		const columns = getContractColumns(args);
		const companyTypeCol = columns.find(c => c.dataIndex === "company_type");

		expect(companyTypeCol?.hideInTable).toBe(false);

		const { container } = render(
			<>{(companyTypeCol?.render as any)(null, mockRecord)}</>,
		);
		expect(container.textContent).toBe("اپراتور");
	});

	it("renders SMS vendor company name replacement when company is SMS vendor", () => {
		const args = createDefaultArgs();
		const columns = getContractColumns(args);
		const companyNameCol = columns.find(c => c.dataIndex === "company_name");

		const vendorRecord: ContractListItemType = {
			...mockRecord,
			company_name: "SMS_VENDOR",
		};

		const { container } = render(
			<>{(companyNameCol?.render as any)(null, vendorRecord)}</>,
		);
		expect(container.textContent).toBe("contract.list.smsVendorCompany");
	});

	it("renders official and unofficial status tags correctly", () => {
		const args = createDefaultArgs();
		const columns = getContractColumns(args);
		const officialCol = columns.find(c => c.dataIndex === "is_official");

		const { container: officialTag } = render(
			<>{(officialCol?.render as any)(null, mockRecord)}</>,
		);
		expect(officialTag.textContent).toBe("contract.createPanel.official");

		const { container: unofficialTag } = render(
			<>{(officialCol?.render as any)(null, { ...mockRecord, is_official: false })}</>,
		);
		expect(unofficialTag.textContent).toBe("contract.createPanel.unofficial");
	});

	it("renders dash for approval columns when contract is unofficial", () => {
		const args = createDefaultArgs();
		const columns = getContractColumns(args);
		const businessCol = columns.find(c => c.dataIndex === "is_business_approved");
		const signedCol = columns.find(c => c.dataIndex === "is_signed");

		const unofficialRecord = { ...mockRecord, is_official: false };

		const { container: bContainer } = render(
			<>{(businessCol?.render as any)(null, unofficialRecord)}</>,
		);
		expect(bContainer.textContent).toBe("-");

		const { container: sContainer } = render(
			<>{(signedCol?.render as any)(null, unofficialRecord)}</>,
		);
		expect(sContainer.textContent).toBe("-");
	});

	it("renders counts with Tag components", () => {
		const args = createDefaultArgs();
		const columns = getContractColumns(args);
		const addendaCountCol = columns.find(c => c.dataIndex === "addenda_count");

		const { container } = render(
			<>{(addendaCountCol?.render as any)(null, mockRecord)}</>,
		);
		expect(container.querySelector(".ant-tag")).toBeInTheDocument();
		expect(container.textContent).toBe("3");
	});

	it("calls setSelectedServiceId and onServiceFilterChange when service filter changes", () => {
		const setSelectedServiceId = vi.fn();
		const setSelectedTrafficCompanyType = vi.fn();
		const onServiceFilterChange = vi.fn();

		const args = createDefaultArgs({
			setSelectedServiceId,
			setSelectedTrafficCompanyType,
			onServiceFilterChange,
		});

		const columns = getContractColumns(args);
		const serviceIdCol = columns.find(c => c.dataIndex === "service_id");

		(serviceIdCol?.fieldProps as any).onChange("20");

		expect(setSelectedServiceId).toHaveBeenCalledWith(20);
		expect(setSelectedTrafficCompanyType).toHaveBeenCalledWith(null);
		expect(onServiceFilterChange).toHaveBeenCalled();
	});

	it("calls setSelectedSmsParty when sms_party filter changes", () => {
		const setSelectedSmsParty = vi.fn();
		const args = createDefaultArgs({ isSmsService: true, setSelectedSmsParty });

		const columns = getContractColumns(args);
		const smsPartyCol = columns.find(c => c.dataIndex === "sms_party");

		expect(smsPartyCol?.hideInSearch).toBe(false);
		(smsPartyCol?.fieldProps as any).onChange("vendor");

		expect(setSelectedSmsParty).toHaveBeenCalledWith("vendor");
	});
});
