import { RHFProText } from "#src/shared/ui/rhf-pro/index.js";
import React from "react";

export default function CompanyInfoMapField() {
	return (
		<div>
			<div className="grid grid-cols-2 gap-4">
				<RHFProText name="map_latitude" label="Latitude" />
				<RHFProText name="map_longitude" label="Longitude" />
			</div>

			<div
				className="mt-3 flex h-[240px] items-center justify-center rounded-xl border border-[rgba(255,255,255,0.08)] opacity-75"
				onClick={() => {
					// setValue("map_latitude", "35.7"); setValue("map_longitude","51.4");
				}}
			>
				(کامپوننت نقشه پروژه اینجا)
			</div>
		</div>
	);
}
