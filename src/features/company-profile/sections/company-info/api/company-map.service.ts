const MAP_API_BASE_URL = (import.meta.env.VITE_MAP_API_BASE_URL ?? "https://map.tci.ir").replace(/\/$/, "");

export const LIGHT_MAP_TILE_URL = `${MAP_API_BASE_URL}/geoserver/gwc/service/wmts?layer=osm:osm&tilematrixset=EPSG:900913&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image/png8&TileMatrix=EPSG:900913:{z}&TileCol={x}&TileRow={y}`;
export const DARK_MAP_TILE_URL = `${MAP_API_BASE_URL}/geoserver/gwc/service/wmts?layer=osm:simple_dark&tilematrixset=EPSG:900913&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image/png8&TileMatrix=EPSG:900913:{z}&TileCol={x}&TileRow={y}`;

export interface CompanyMapSearchResult {
	place_id: number
	display_name: string
	lat: string
	lon: string
}

function createSearchUrl(path: string, params: Record<string, string>) {
	const url = new URL(`${MAP_API_BASE_URL}${path}`);
	Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
	return url;
}

export async function searchCompanyMapAddress(query: string, signal?: AbortSignal) {
	const response = await fetch(createSearchUrl("/search", {
		"format": "json",
		"addressdetails": "1",
		"q": query,
		"accept-language": "per",
		"polygon_geojson": "0",
		"limit": "10",
	}), { signal });

	if (!response.ok)
		throw new Error("خطا در جستجوی نشانی");

	return await response.json() as CompanyMapSearchResult[];
}

export async function reverseCompanyMapLocation(latitude: number, longitude: number, signal?: AbortSignal) {
	const response = await fetch(createSearchUrl("/search/reverse", {
		"lat": String(latitude),
		"lon": String(longitude),
		"accept-language": "per",
		"format": "json",
		"addressdetails": "1",
		"zoom": "18",
		"polygon_geojson": "0",
	}), { signal });

	if (!response.ok)
		throw new Error("خطا در دریافت نشانی موقعیت");

	return await response.json() as CompanyMapSearchResult;
}
