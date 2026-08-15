import type { GlobalToken } from "antd";

export type ContractSectionTone = "primary" | "purple" | "gold" | "blue" | "geekblue" | "traffic" | "addenda";

const CONTRACT_SECTION_PURPLE = "#4f1665";
const CONTRACT_SECTION_ADDENDA = "#315426";

export function getContractSectionToneColors(token: GlobalToken, tone: ContractSectionTone) {
	switch (tone) {
		case "addenda":
			return { background: CONTRACT_SECTION_ADDENDA, text: token.colorTextLightSolid };
		case "traffic":
			return { background: token.geekblue8, text: token.colorTextLightSolid };
		case "purple":
			return { background: CONTRACT_SECTION_PURPLE, text: token.colorTextLightSolid };
		case "gold":
			return { background: token.colorWarningBgHover, text: token.colorText };
		case "geekblue":
			return { background: token.colorInfoBgHover, text: token.colorText };
		case "blue":
		case "primary":
		default:
			return { background: token.colorPrimaryBgHover, text: token.colorText };
	}
}
