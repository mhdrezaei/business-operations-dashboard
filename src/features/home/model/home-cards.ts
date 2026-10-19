import type { DomainPermissionAction } from "#src/api/user/types";

export type HomeTone = "primary" | "cyan" | "purple" | "green";

export interface HomeLinkDef {
	path: string
	/** i18n key under `home.links`. */
	labelKey: string
	icon: HomeLinkIcon
	domain: string
	action: DomainPermissionAction
	/** Visible when the user has the permission on at least one of these services. */
	serviceCodes?: string[]
}

export type HomeLinkIcon = "add" | "edit" | "list" | "table" | "template" | "report" | "unregistered" | "company" | "traffic" | "invoice";

export interface HomeCardDef {
	key: "contracts" | "companies" | "performance" | "predictions"
	tone: HomeTone
	links: HomeLinkDef[]
}

/** Same destinations (and the same access rules) as the route handles in `router/routes/modules`. */
export const HOME_CARDS: HomeCardDef[] = [
	{
		key: "contracts",
		tone: "primary",
		links: [
			{ path: "/contracts/new", labelKey: "newContract", icon: "add", domain: "contracts", action: "create" },
			{ path: "/contracts/list", labelKey: "contractsList", icon: "list", domain: "contracts", action: "view" },
			{ path: "/contracts/edit", labelKey: "editContracts", icon: "edit", domain: "contracts", action: "update" },
			{ path: "/contracts/template", labelKey: "contractTemplates", icon: "template", domain: "contracts", action: "view" },
			{ path: "/contracts/sign-flows", labelKey: "signFlows", icon: "list", domain: "contracts", action: "view" },
		],
	},
	{
		key: "performance",
		tone: "green",
		links: [
			{ path: "/performances/new", labelKey: "newPerformance", icon: "add", domain: "performances", action: "create" },
			{ path: "/performances/report", labelKey: "performanceReport", icon: "report", domain: "performances", action: "view" },
			{ path: "/performances/edit", labelKey: "editPerformances", icon: "edit", domain: "performances", action: "view" },
			{ path: "/performances/unregistered", labelKey: "unregisteredPerformances", icon: "unregistered", domain: "performances", action: "view" },
			{ path: "/performances/sms-gateway/traffic-report", labelKey: "smsGatewayTrafficReport", icon: "traffic", domain: "performances", action: "view", serviceCodes: ["sms", "sms_commission"] },
			{ path: "/performances/sms-gateway/operator-invoices", labelKey: "smsGatewayOperatorInvoices", icon: "invoice", domain: "performances", action: "view", serviceCodes: ["sms"] },
		],
	},
	{
		key: "companies",
		tone: "cyan",
		links: [
			{ path: "/company/management", labelKey: "companies", icon: "company", domain: "company_profile", action: "view" },
		],
	},
	{
		key: "predictions",
		tone: "purple",
		links: [
			{ path: "/predictions/new", labelKey: "newPrediction", icon: "add", domain: "predictions", action: "create" },
			{ path: "/predictions/list", labelKey: "predictionsList", icon: "table", domain: "predictions", action: "view" },
			{ path: "/performances/report/predictions-summary", labelKey: "predictionsSummaryReport", icon: "report", domain: "performances", action: "view" },
		],
	},
];
