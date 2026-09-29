import type { SectionTone } from "./section-tone";
import { createContext } from "react";

export const SectionToneContext = createContext<SectionTone | null>(null);
