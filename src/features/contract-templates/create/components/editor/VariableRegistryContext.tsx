import React, { createContext, useContext, useState } from "react";

export interface TemplateVariable {
	key: string
	label: string
}

interface VariableRegistryContextType {
	variables: TemplateVariable[]
	getVariable: (key: string) => TemplateVariable | undefined
	setVariables: (vars: TemplateVariable[]) => void
}

const VariableRegistryContext = createContext<VariableRegistryContextType | null>(null);

export function useVariableRegistry() {
	const context = useContext(VariableRegistryContext);
	if (!context)
		throw new Error("useVariableRegistry must be used within VariableRegistryProvider");
	return context;
}

export const VariableRegistryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	// این لیست در آینده توسط سایدبار و API پر می‌شود
	const [variables, setVariables] = useState<TemplateVariable[]>([]);

	const getVariable = (key: string) => variables.find(v => v.key === key);

	return (
		<VariableRegistryContext.Provider value={{ variables, getVariable, setVariables }}>
			{children}
		</VariableRegistryContext.Provider>
	);
};
