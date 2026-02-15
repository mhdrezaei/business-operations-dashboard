import React, { createContext, useContext, useMemo, useState } from "react";

interface CompanyProfileCtx {
	serviceId: number | null
	setServiceId: (id: number | null) => void

	companyId: number | null
	setCompanyId: (id: number | null) => void
}

const Ctx = createContext<CompanyProfileCtx | null>(null);

export function CompanyProfileProvider({ children }: { children: React.ReactNode }) {
	const [serviceId, setServiceId] = useState<number | null>(null);
	const [companyId, setCompanyId] = useState<number | null>(null);

	const value = useMemo(
		() => ({ serviceId, setServiceId, companyId, setCompanyId }),
		[serviceId, companyId],
	);

	return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCompanyProfileContext() {
	const ctx = useContext(Ctx);
	if (!ctx)
		throw new Error("useCompanyProfileContext must be used inside CompanyProfileProvider");
	return ctx;
}
