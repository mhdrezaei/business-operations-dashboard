import type { ContractApprovalHistorySubjectDto, ContractServicePath } from "../../api/contracts.api";
import { describe, expect, it } from "vitest";
import { ContractApprovalPolicy } from "./contract-approval-policy";

describe("contractApprovalPolicy - isUnofficialBlocked", () => {
	it("returns false when contract is official or isOfficial is unspecified", () => {
		expect(new ContractApprovalPolicy({ service: "sms/client", isOfficial: true }).isUnofficialBlocked).toBe(false);
		expect(new ContractApprovalPolicy({ service: "sms/client", isOfficial: null }).isUnofficialBlocked).toBe(false);
		expect(new ContractApprovalPolicy({ service: "sms/client", isOfficial: undefined }).isUnofficialBlocked).toBe(false);
		expect(new ContractApprovalPolicy({ service: "traffic", companyType: "IXP", isOfficial: true }).isUnofficialBlocked).toBe(false);
	});

	it("blocks unofficial contracts for sms/client service", () => {
		const policy = new ContractApprovalPolicy({ service: "sms/client", isOfficial: false });
		expect(policy.isUnofficialBlocked).toBe(true);
	});

	it("does not block unofficial contracts for sms/vendor service", () => {
		const policy = new ContractApprovalPolicy({ service: "sms/vendor", isOfficial: false });
		expect(policy.isUnofficialBlocked).toBe(false);
	});

	it("blocks unofficial contracts for traffic service with restricted company types", () => {
		const blockedTypes = ["IXP", "CP", "TCI", "PREMIUM", "ixp", "cp", "tci", "premium"];
		for (const companyType of blockedTypes) {
			const policy = new ContractApprovalPolicy({
				service: "traffic",
				companyType,
				isOfficial: false,
			});
			expect(policy.isUnofficialBlocked).toBe(true);
		}
	});

	it("allows unofficial contracts for traffic service with non-restricted company types", () => {
		const allowedTypes = ["OTHER", "DEDICATED", "HOSTING", null, undefined];
		for (const companyType of allowedTypes) {
			const policy = new ContractApprovalPolicy({
				service: "traffic",
				companyType,
				isOfficial: false,
			});
			expect(policy.isUnofficialBlocked).toBe(false);
		}
	});

	it("allows unofficial contracts for non-traffic and non-sms/client services", () => {
		const otherServices: ContractServicePath[] = ["openapi", "telecom-frame", "sales-agency/outbound", "psp"];
		for (const service of otherServices) {
			const policy = new ContractApprovalPolicy({
				service,
				companyType: "IXP",
				isOfficial: false,
			});
			expect(policy.isUnofficialBlocked).toBe(false);
		}
	});
});

describe("contractApprovalPolicy - getActionState", () => {
	const createSubject = (patch: Partial<ContractApprovalHistorySubjectDto> = {}): ContractApprovalHistorySubjectDto => ({
		id: 1,
		is_business_approved: false,
		is_signed: false,
		sign_approval_history: [],
		...patch,
	});

	it("disables action when item is locked by real signature (isRealSigned = true)", () => {
		const policy = new ContractApprovalPolicy({ service: "openapi", isOfficial: true });
		const state = policy.getActionState(createSubject({ is_business_approved: false }), "is_business_approved", true, true);

		expect(state).toEqual({
			disabled: true,
			reason: "این مورد با امضای واقعی قفل شده است.",
		});
	});

	it("disables action when unofficial contract approval is blocked", () => {
		const policy = new ContractApprovalPolicy({ service: "sms/client", isOfficial: false });
		const state = policy.getActionState(createSubject(), "is_business_approved", true, false);

		expect(state).toEqual({
			disabled: true,
			reason: "این قرارداد غیررسمی است و تأیید برای آن مجاز نیست.",
		});
	});

	it("disables action without a reason when target state is already applied", () => {
		const policy = new ContractApprovalPolicy({ service: "openapi", isOfficial: true });

		// already business approved
		const approvedSubject = createSubject({ is_business_approved: true });
		expect(policy.getActionState(approvedSubject, "is_business_approved", true, false)).toEqual({
			disabled: true,
		});

		// already business unapproved / false
		const unapprovedSubject = createSubject({ is_business_approved: false });
		expect(policy.getActionState(unapprovedSubject, "is_business_approved", false, false)).toEqual({
			disabled: true,
		});

		// already signed
		const signedSubject = createSubject({ is_signed: true, is_business_approved: true });
		expect(policy.getActionState(signedSubject, "is_signed", true, false)).toEqual({
			disabled: true,
		});
	});

	it("prevents contract signing (is_signed=true) if business approval is missing", () => {
		const policy = new ContractApprovalPolicy({ service: "openapi", isOfficial: true });

		const subjectsWithoutBusinessApproval = [
			createSubject({ is_business_approved: false }),
			createSubject({ is_business_approved: null as any }),
			createSubject({ is_business_approved: undefined }),
		];

		for (const subject of subjectsWithoutBusinessApproval) {
			const state = policy.getActionState(subject, "is_signed", true, false);
			expect(state).toEqual({
				disabled: true,
				reason: "ابتدا باید تأیید تجاری انجام شود.",
			});
		}
	});

	it("allows contract signing (is_signed=true) when business approval is present", () => {
		const policy = new ContractApprovalPolicy({ service: "openapi", isOfficial: true });
		const subject = createSubject({ is_business_approved: true, is_signed: false });

		const state = policy.getActionState(subject, "is_signed", true, false);
		expect(state).toEqual({ disabled: false });
	});

	it("prevents revoking business approval (is_business_approved=false) if contract is already signed", () => {
		const policy = new ContractApprovalPolicy({ service: "openapi", isOfficial: true });
		const subject = createSubject({ is_business_approved: true, is_signed: true });

		const state = policy.getActionState(subject, "is_business_approved", false, false);
		expect(state).toEqual({
			disabled: true,
			reason: "ابتدا باید تأیید اداره قراردادها لغو شود.",
		});
	});

	it("allows revoking business approval if contract is not signed", () => {
		const policy = new ContractApprovalPolicy({ service: "openapi", isOfficial: true });
		const subject = createSubject({ is_business_approved: true, is_signed: false });

		const state = policy.getActionState(subject, "is_business_approved", false, false);
		expect(state).toEqual({ disabled: false });
	});

	it("allows revoking contract signature (is_signed=false) when currently signed", () => {
		const policy = new ContractApprovalPolicy({ service: "openapi", isOfficial: true });
		const subject = createSubject({ is_business_approved: true, is_signed: true });

		const state = policy.getActionState(subject, "is_signed", false, false);
		expect(state).toEqual({ disabled: false });
	});

	it("allows business approval (is_business_approved=true) when eligible", () => {
		const policy = new ContractApprovalPolicy({ service: "openapi", isOfficial: true });
		const subject = createSubject({ is_business_approved: false, is_signed: false });

		const state = policy.getActionState(subject, "is_business_approved", true, false);
		expect(state).toEqual({ disabled: false });
	});
});
