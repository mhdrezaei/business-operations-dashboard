import { createContext, createElement } from "react";

import { CodeLogin, ForgotPassword, PasswordLogin } from "./components";

export const FORM_COMPONENT_MAP = {
	login: createElement(PasswordLogin),
	forgotPassword: createElement(ForgotPassword),
	codeLogin: createElement(CodeLogin),
};

export type FormComponentMapType = keyof typeof FORM_COMPONENT_MAP;

export const FormModeContext = createContext<{
	formMode: FormComponentMapType
	setFormMode: React.Dispatch<React.SetStateAction<FormComponentMapType>>
}>({
	formMode: "login",
	setFormMode: () => { },
});
