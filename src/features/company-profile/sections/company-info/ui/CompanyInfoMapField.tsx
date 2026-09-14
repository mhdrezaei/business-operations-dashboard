import type { CompanyMapSearchResult } from "../api/company-map.service";
import { usePreferences } from "#src/hooks";
import { RHFProText } from "#src/shared/ui/rhf-pro/index.js";
import { EnvironmentOutlined, SearchOutlined } from "@ant-design/icons";
import { Empty, Input, Spin, theme } from "antd";
import L from "leaflet";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import {
	DARK_MAP_TILE_URL,
	LIGHT_MAP_TILE_URL,
	reverseCompanyMapLocation,
	searchCompanyMapAddress,
} from "../api/company-map.service";
import { MAP_COORDINATE_DECIMAL_PLACES } from "../model/company-map-coordinate";
import "leaflet/dist/leaflet.css";
import "./company-info-map-field.css";

interface Props {
	disabled?: boolean
}

export default function CompanyInfoMapField({ disabled = false }: Props) {
	const { isDark } = usePreferences();
	const { token } = theme.useToken();
	const { control, register, setValue } = useFormContext();
	const latitude = useWatch({ control, name: "map_latitude" });
	const longitude = useWatch({ control, name: "map_longitude" });
	const mapElementRef = useRef<HTMLDivElement>(null);
	const mapRef = useRef<L.Map | null>(null);
	const markerRef = useRef<L.Marker | null>(null);
	const tileLayerRef = useRef<L.TileLayer | null>(null);
	const reverseRequestRef = useRef<AbortController | null>(null);
	const mapErrorTimerRef = useRef<number | null>(null);
	const skipNextSearchRef = useRef(false);
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<CompanyMapSearchResult[]>([]);
	const [isSearching, setIsSearching] = useState(false);
	const [searchError, setSearchError] = useState("");
	const [isResultsOpen, setIsResultsOpen] = useState(false);
	const [mapError, setMapError] = useState("");

	const parsedPosition = useMemo<[number, number] | null>(() => {
		const lat = Number.parseFloat(String(latitude ?? ""));
		const lng = Number.parseFloat(String(longitude ?? ""));
		return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null;
	}, [latitude, longitude]);

	const markerIcon = useMemo(() => L.divIcon({
		className: "",
		html: "<span class=\"company-map-pin\"></span>",
		iconAnchor: [15, 30],
		iconSize: [30, 30],
	}), []);

	const updateFormPosition = useCallback((lat: number, lng: number) => {
		setValue("map_latitude", lat.toFixed(MAP_COORDINATE_DECIMAL_PLACES), { shouldDirty: true, shouldTouch: true });
		setValue("map_longitude", lng.toFixed(MAP_COORDINATE_DECIMAL_PLACES), { shouldDirty: true, shouldTouch: true });
	}, [setValue]);
	const updateFormAddress = useCallback((address: string) => {
		setValue("map_address", address, { shouldDirty: true, shouldTouch: true });
	}, [setValue]);
	const clearMapError = useCallback(() => {
		if (mapErrorTimerRef.current !== null) {
			window.clearTimeout(mapErrorTimerRef.current);
			mapErrorTimerRef.current = null;
		}
		setMapError("");
	}, []);
	const scheduleMapError = useCallback(() => {
		if (mapErrorTimerRef.current !== null)
			window.clearTimeout(mapErrorTimerRef.current);

		mapErrorTimerRef.current = window.setTimeout(() => {
			setMapError("سرویس نقشه در دسترس نیست. اتصال شبکه را بررسی کنید.");
			mapErrorTimerRef.current = null;
		}, 700);
	}, []);

	const setMarkerPosition = useCallback((lat: number, lng: number, pan = false) => {
		const map = mapRef.current;
		if (!map)
			return;

		if (!markerRef.current) {
			markerRef.current = L.marker([lat, lng], { draggable: !disabled, icon: markerIcon }).addTo(map);
			markerRef.current.on("dragend", () => {
				const position = markerRef.current?.getLatLng();
				if (position)
					updateFormPosition(position.lat, position.lng);
			});
		}
		else {
			markerRef.current.setLatLng([lat, lng]);
		}

		if (pan)
			map.setView([lat, lng], Math.max(map.getZoom(), 16), { animate: true });
	}, [disabled, markerIcon, updateFormPosition]);

	useEffect(() => {
		if (!mapElementRef.current || mapRef.current)
			return;

		const initialPosition = parsedPosition ?? [35.6892, 51.389] as [number, number];
		const map = L.map(mapElementRef.current, { center: initialPosition, zoom: parsedPosition ? 16 : 11 });
		mapRef.current = map;
		tileLayerRef.current = L.tileLayer(isDark ? DARK_MAP_TILE_URL : LIGHT_MAP_TILE_URL, {
			attribution: "",
			maxZoom: 19,
		})
			.on("tileload", clearMapError)
			.on("tileerror", scheduleMapError)
			.addTo(map);

		map.on("click", async (event: L.LeafletMouseEvent) => {
			if (disabled)
				return;

			const { lat, lng } = event.latlng;
			updateFormPosition(lat, lng);
			setMarkerPosition(lat, lng);
			reverseRequestRef.current?.abort();
			const controller = new AbortController();
			reverseRequestRef.current = controller;
			try {
				const result = await reverseCompanyMapLocation(lat, lng, controller.signal);
				if (result.display_name) {
					skipNextSearchRef.current = true;
					setQuery(result.display_name);
					updateFormAddress(result.display_name);
					setIsSearching(false);
					setIsResultsOpen(false);
				}
			}
			catch (error) {
				if (!(error instanceof DOMException && error.name === "AbortError"))
					setQuery("");
			}
		});

		if (parsedPosition)
			setMarkerPosition(parsedPosition[0], parsedPosition[1]);

		const invalidateSize = window.setTimeout(() => map.invalidateSize(), 0);
		return () => {
			window.clearTimeout(invalidateSize);
			if (mapErrorTimerRef.current !== null)
				window.clearTimeout(mapErrorTimerRef.current);
			reverseRequestRef.current?.abort();
			map.remove();
			mapRef.current = null;
			markerRef.current = null;
			tileLayerRef.current = null;
		};
		// Map initialization must only run once for this mounted field.
	}, []);

	useEffect(() => {
		if (parsedPosition)
			setMarkerPosition(parsedPosition[0], parsedPosition[1]);
	}, [parsedPosition, setMarkerPosition]);

	useEffect(() => {
		const map = mapRef.current;
		if (!map)
			return;

		tileLayerRef.current?.removeFrom(map);
		tileLayerRef.current = L.tileLayer(isDark ? DARK_MAP_TILE_URL : LIGHT_MAP_TILE_URL, {
			attribution: "",
			maxZoom: 19,
		})
			.on("tileload", clearMapError)
			.on("tileerror", scheduleMapError)
			.addTo(map);
	}, [clearMapError, isDark, scheduleMapError]);

	useEffect(() => {
		const trimmedQuery = query.trim();
		if (skipNextSearchRef.current) {
			skipNextSearchRef.current = false;
			return;
		}

		if (disabled || trimmedQuery.length < 2) {
			return;
		}

		const controller = new AbortController();
		const timer = window.setTimeout(async () => {
			setIsSearching(true);
			setSearchError("");
			try {
				const nextResults = await searchCompanyMapAddress(trimmedQuery, controller.signal);
				setResults(nextResults);
				setIsResultsOpen(true);
			}
			catch (error) {
				if (!(error instanceof DOMException && error.name === "AbortError")) {
					setResults([]);
					setSearchError("جستجو انجام نشد؛ دوباره تلاش کنید.");
				}
			}
			finally {
				if (!controller.signal.aborted)
					setIsSearching(false);
			}
		}, 450);

		return () => {
			window.clearTimeout(timer);
			controller.abort();
		};
	}, [disabled, query]);

	const selectResult = (result: CompanyMapSearchResult) => {
		const lat = Number.parseFloat(result.lat);
		const lng = Number.parseFloat(result.lon);
		if (!Number.isFinite(lat) || !Number.isFinite(lng))
			return;

		skipNextSearchRef.current = true;
		setQuery(result.display_name);
		setIsSearching(false);
		setIsResultsOpen(false);
		updateFormPosition(lat, lng);
		updateFormAddress(result.display_name);
		setMarkerPosition(lat, lng, true);
	};

	return (
		<div className={`company-info-map ${isDark ? "company-info-map--dark" : ""}`}>
			<input type="hidden" {...register("map_latitude")} />
			<input type="hidden" {...register("map_longitude")} />

			<div className="relative mt-3">
				<Input
					allowClear
					disabled={disabled}
					prefix={<SearchOutlined className="text-[#2867f0]" />}
					placeholder="جستجوی شهر، خیابان یا نشانی..."
					size="large"
					value={query}
					onChange={(event) => {
						const nextQuery = event.target.value;
						setQuery(nextQuery);
						setResults([]);
						setSearchError("");
						setIsSearching(nextQuery.trim().length >= 2);
						setIsResultsOpen(nextQuery.trim().length >= 2);
					}}
					onFocus={() => setIsResultsOpen(true)}
				/>

				{isResultsOpen && query.trim().length >= 2 && (
					<div
						className="absolute inset-x-0 top-[48px] z-[1001] max-h-64 overflow-y-auto rounded-xl border p-2 shadow-2xl"
						style={{ backgroundColor: token.colorBgElevated, borderColor: token.colorBorderSecondary, color: token.colorText }}
					>
						{isSearching && <div className="flex min-h-20 items-center justify-center"><Spin size="small" /></div>}
						{!isSearching && searchError && <div className="px-3 py-4 text-center text-sm text-red-500">{searchError}</div>}
						{!isSearching && !searchError && results.length === 0 && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="نتیجه‌ای پیدا نشد" />}
						{!isSearching && results.map(result => (
							<button
								key={result.place_id}
								type="button"
								className="flex w-full cursor-pointer items-start gap-2 rounded-lg border-0 bg-transparent px-3 py-2 text-right text-sm text-colorText transition-colors hover:bg-colorFillSecondary focus-visible:bg-colorFillSecondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
								onClick={() => selectResult(result)}
							>
								<EnvironmentOutlined className="mt-1 shrink-0 text-primary" />
								<span>{result.display_name}</span>
							</button>
						))}
					</div>
				)}

				<div
					ref={mapElementRef}
					className={`mt-3 h-[320px] overflow-hidden rounded-xl border border-dashed border-[rgba(44,103,240,0.38)] ${disabled ? "cursor-default" : "cursor-crosshair"}`}
					aria-label="نقشه انتخاب موقعیت شرکت"
					role="application"
				/>
				{mapError && (
					<div className="absolute inset-x-3 top-16 z-[500] flex items-center justify-between gap-3 rounded-lg border border-red-400/30 bg-red-950/85 px-3 py-2 text-xs text-white shadow-lg backdrop-blur-sm">
						<span>{mapError}</span>
						<button
							type="button"
							className="shrink-0 rounded-md border border-white/30 px-2 py-1 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
							onClick={() => {
								clearMapError();
								tileLayerRef.current?.redraw();
							}}
						>
							تلاش مجدد
						</button>
					</div>
				)}
				{!disabled && (
					<div className="pointer-events-none absolute bottom-3 start-1/2 z-[500] -translate-x-1/2 whitespace-nowrap rounded-lg bg-[rgba(15,23,42,0.82)] px-3 py-1.5 text-xs text-white backdrop-blur-sm">
						برای انتخاب موقعیت روی نقشه کلیک کنید
					</div>
				)}
			</div>

			<div className="mt-4 grid grid-cols-1 gap-x-4 md:grid-cols-2">
				<RHFProText
					name="postal_code"
					label="کد پستی"
					inputProps={{ placeholder: "کد پستی", disabled }}
				/>
				<RHFProText
					name="map_address"
					label="آدرس روی نقشه"
					inputProps={{ placeholder: "آدرس روی نقشه", disabled }}
				/>
			</div>
		</div>
	);
}
