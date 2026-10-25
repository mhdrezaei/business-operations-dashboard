import { emptyPublicProfileValues, normalizeWebsiteUrl, parseSocialLinks, publicFormToPayload } from "./company-public.mappers";

describe("public profile social links", () => {
	it("parses object, array and JSON string shapes", () => {
		const expected = [{ label: "instagram", url: "https://i.com/x" }];
		expect(parseSocialLinks({ instagram: "https://i.com/x" })).toEqual(expected);
		expect(parseSocialLinks([{ name: "instagram", url: "https://i.com/x" }])).toEqual(expected);
		expect(parseSocialLinks(JSON.stringify({ instagram: "https://i.com/x" }))).toEqual(expected);
		expect(parseSocialLinks("not json")).toEqual([]);
		expect(parseSocialLinks(null)).toEqual([]);
	});

	it("sends an object keyed by name and omits it when empty", () => {
		const base = { ...emptyPublicProfileValues, service: 1, company: 2 };
		expect(publicFormToPayload({ ...base, social_links: [{ label: " a ", url: " u " }, { label: "b", url: "" }] }).social_links).toEqual({ a: "u" });
		expect(publicFormToPayload(base).social_links).toBeUndefined();
	});
});

describe("website normalisation", () => {
	it("prefixes https:// only when no scheme is present", () => {
		expect(normalizeWebsiteUrl(" example.com ")).toBe("https://example.com");
		expect(normalizeWebsiteUrl("HTTP://example.com")).toBe("HTTP://example.com");
		expect(normalizeWebsiteUrl("  ")).toBe("");
		expect(publicFormToPayload({ ...emptyPublicProfileValues, website: "example.com" }).website).toBe("https://example.com");
	});
});
