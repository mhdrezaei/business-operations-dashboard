import type { TemplateFont } from "../../../../types";

/** Families the toolbar offers besides the uploaded fonts (used only if installed locally). */
const BUILT_IN_FONT_FAMILIES = ["Vazirmatn", "Tahoma", "B Nazanin"];

/** IranYekan "fanum" (shipped with the app, see src/styles/fonts.css): Persian glyphs for ASCII digits. */
const PERSIAN_DIGITS_SRC = "url('/fonts/woff/iranyekanwebregularfanum.woff') format('woff'), url('/fonts/ttf/iranyekanwebregularfanum.ttf') format('truetype')";

function face(family: string, src: string, extra = "") {
	return `
@font-face {
	font-family: '${family}';
	src: ${src};${extra}
}`;
}

/**
 * Names an uploaded font answers to: its family plus the plain name Word documents
 * and the toolbar use ("B Mitra_0" -> "B Mitra", "B-NAZANIN" -> "B Nazanin";
 * family names are case-insensitive).
 */
function familyNames(font: TemplateFont) {
	const family = font.family || font.name;
	const plain = family.replace(/_\d+$/, "").replace(/[-_\s]+/g, " ").trim();
	return plain && plain.toLowerCase() !== family.toLowerCase() ? [family, plain] : [family];
}

/** Whether an uploaded font already serves `fontName` (e.g. a Word font "B Mitra" is served by "B Mitra_0"). */
export function isUploadedFont(fonts: TemplateFont[], fontName: string) {
	const target = fontName.toLowerCase();
	return fonts.some(f => f.name?.toLowerCase() === target || familyNames(f).some(family => family.toLowerCase() === target));
}

/**
 * @font-face rules for the template fonts. Digits are shown, printed and captured
 * into the PDF in Persian while the stored text keeps ASCII digits (variables,
 * links, Word export stay untouched): Persian fonts (B Nazanin, B Mitra, ...) map
 * 0-9 to their Persian glyphs themselves; the built-in families get a digits-only
 * IranYekan face (declared last, so it wins for 0-9). Every face keeps the default
 * descriptors: browsers group faces by weight/style before unicode-range.
 */
export function fontFaceCss(fonts: TemplateFont[]) {
	const uploaded = fonts.flatMap(f => familyNames(f).map(family => ({ family, src: `url('${f.file_url}') format('${f.format || "truetype"}')` })));
	const taken = new Set(uploaded.map(u => u.family.toLowerCase()));
	// A family with an @font-face no longer falls back to the installed font of that name.
	const builtIn = BUILT_IN_FONT_FAMILIES.filter(family => !taken.has(family.toLowerCase()))
		.map(family => ({ family, src: `local('${family}')` }));
	return [
		...[...uploaded, ...builtIn].map(({ family, src }) => face(family, src)),
		...builtIn.map(({ family }) => face(family, PERSIAN_DIGITS_SRC, "\n\tunicode-range: U+0030-0039;")),
	].join("\n");
}
