import { RHFProText } from "#src/shared/ui/rhf-pro/index.js";
import React from "react";

interface Props {
	disabled?: boolean
}

export default function CompanyInfoMapField({ disabled = false }: Props) {
	return (
		<div>
			<div className="grid grid-cols-2 gap-4">
				<RHFProText name="map_latitude" label="Latitude" inputProps={{ disabled }} />
				<RHFProText name="map_longitude" label="Longitude" inputProps={{ disabled }} />
			</div>

			<div
				className="mt-3 flex h-[240px] items-center justify-center rounded-xl border border-[rgba(255,255,255,0.08)] opacity-75"
				onClick={() => {
					if (disabled) {
						return "";
					}
					// setValue("map_latitude", "35.7"); setValue("map_longitude","51.4");
				}}
			>
				{"(\u06A9\u0627\u0645\u067E\u0648\u0646\u0646\u062A \u0646\u0642\u0634\u0647 \u067E\u0631\u0648\u0698\u0647 \u0627\u06CC\u0646\u062C\u0627)"}
			</div>
		</div>
	);
}
