import React, { createContext, useContext, useMemo } from "react";
// 🔴 ایمپورت توابع از فایل registry.js که خودتان قبلاً ساخته بودید
import { getVariables, GROUP_LABELS } from "./registry";

// ۱. تعریف دقیق Props هایی که پروایدر از بیرون می‌گیرد
export interface VariableRegistryProviderProps {
	kind?: string
	documentKind?: string
	financialVariables?: any[]
	financialTree?: any[]
	financialLoading?: boolean
	financialError?: string | null
	financialSupported?: boolean
	financialUnsupportedReason?: string | null
	financialPendingSelection?: boolean
	financialMissingVariant?: boolean
	financialMissingCompanyType?: boolean
	children: React.ReactNode
}

// ۲. تعریف ساختار دیتایی که کانتکست به سایدبار و ادیتور پاس می‌دهد
export interface VariableRegistryContextType {
	getVariable: (key: string) => any
	staticGroups: any[]
	financialTree: any[]
	financialLoading: boolean
	financialError: string | null
	financialSupported: boolean
	financialUnsupportedReason: string | null
	financialPendingSelection: boolean
	financialMissingVariant: boolean
	financialMissingCompanyType: boolean
}

const VariableRegistryContext = createContext<VariableRegistryContextType | null>(null);

export function useVariableRegistry() {
	const context = useContext(VariableRegistryContext);
	if (!context) {
		// Fallback امن در صورتی که کامپوننتی بیرون از Provider صدا زده شود
		return {
			getVariable: () => null,
			staticGroups: [],
			financialTree: [],
			financialLoading: false,
			financialError: null,
			financialSupported: true,
			financialUnsupportedReason: null,
			financialPendingSelection: false,
			financialMissingVariant: false,
			financialMissingCompanyType: false,
		};
	}
	return context;
}

export const VariableRegistryProvider: React.FC<VariableRegistryProviderProps> = ({
	kind,
	documentKind,
	financialVariables = [],
	financialTree = [],
	financialLoading = false,
	financialError = null,
	financialSupported = true,
	financialUnsupportedReason = null,
	financialPendingSelection = false,
	financialMissingVariant = false,
	financialMissingCompanyType = false,
	children,
}) => {
	const value = useMemo(() => {
		// خواندن متغیرها از فایل رجیستری استاتیک شما بر اساس kind
		const staticVars = getVariables({ kind, documentKind });
		const allVars = [...staticVars, ...financialVariables];
		const byKey = new Map(allVars.map(v => [v.key, v]));

		// گروه‌بندی متغیرها دقیقاً مطابق منطق قبلی خودتان
		const groups = new Map();
		for (const variable of staticVars) {
			if (variable.hiddenFromPicker)
				continue;
			if (!groups.has(variable.group))
				groups.set(variable.group, []);
			groups.get(variable.group).push(variable);
		}

		return {
			getVariable: (key: string) => byKey.get(key) || null,
			staticGroups: [...groups.entries()].map(([group, variables]) => ({
				group,
				label: GROUP_LABELS[group as keyof typeof GROUP_LABELS] || group,
				variables,
			})),
			financialTree,
			financialLoading,
			financialError,
			financialSupported,
			financialUnsupportedReason,
			financialPendingSelection,
			financialMissingVariant,
			financialMissingCompanyType,
		};
	}, [
		kind,
		documentKind,
		financialVariables,
		financialTree,
		financialLoading,
		financialError,
		financialSupported,
		financialUnsupportedReason,
		financialPendingSelection,
		financialMissingVariant,
		financialMissingCompanyType,
	]);

	return (
		<VariableRegistryContext.Provider value={value}>
			{children}
		</VariableRegistryContext.Provider>
	);
};
