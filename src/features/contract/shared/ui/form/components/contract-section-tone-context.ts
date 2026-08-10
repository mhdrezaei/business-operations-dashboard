import type { ContractSectionTone } from "./contract-form-section-tone";
import { createContext } from "react";

export const ContractSectionToneContext = createContext<ContractSectionTone | null>(null);
