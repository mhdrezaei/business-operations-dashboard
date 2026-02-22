import { RHFProText } from "#src/shared/ui/rhf-pro/index.js";
import React from "react";

export default function CompanyInfoMapField({ disabled }: { disabled: boolean }) {
	return (
		<div>
			<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
				<RHFProText name="map_latitude" label="Latitude" inputProps={{ disabled }} />
				<RHFProText name="map_longitude" label="Longitude" inputProps={{ disabled }} />
			</div>

			<div
				style={{
					marginTop: 12,
					height: 240,
					borderRadius: 12,
					border: "1px solid rgba(255,255,255,0.08)",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					opacity: 0.75,
				}}
				onClick={() => {

					// setValue("map_latitude", "35.7"); setValue("map_longitude","51.4");
				}}
			>
				(کامپوننت نقشه پروژه اینجا)
			</div>
		</div>
	);
}
