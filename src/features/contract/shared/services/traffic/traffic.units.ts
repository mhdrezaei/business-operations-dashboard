const TRAFFIC_DEFAULT_UNIT_BY_COMPANY_TYPE: Record<string, "GB/month" | "Mbps"> = {
	CP: "GB/month",
	PREMIUM: "GB/month",
	IXP: "Mbps",
	TCI: "Mbps",
};

export function getDefaultTrafficUnit(companyType: unknown) {
	return TRAFFIC_DEFAULT_UNIT_BY_COMPANY_TYPE[String(companyType ?? "").trim().toUpperCase()];
}

export function hasTrafficUnit(companyType: unknown) {
	return getDefaultTrafficUnit(companyType) != null;
}
