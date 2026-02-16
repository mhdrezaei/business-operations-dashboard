import { RHFProText } from "#src/shared/ui/rhf-pro/index.js";
import { Button } from "antd";
import { useFieldArray, useFormContext } from "react-hook-form";

export default function CompanyInfoSocialLinksField({ disabled }: { disabled: boolean }) {
	const { control } = useFormContext();
	const { fields, append, remove } = useFieldArray({ control, name: "social_links" });

	return (
		<div>
			<div style={{ marginBottom: 8, opacity: 0.9 }}>شبکه‌های اجتماعی</div>

			{fields.map((f, idx) => (
				<div key={f.id} style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto", gap: 12, marginBottom: 12, alignItems: "center" }}>
					<RHFProText name={`social_links.${idx}.label`} label="عنوان" inputProps={{ disabled }} />
					<RHFProText name={`social_links.${idx}.url`} label="لینک" inputProps={{ disabled }} />
					<Button danger type="text" disabled={disabled} onClick={() => remove(idx)}>
						حذف
					</Button>
				</div>
			))}

			<div style={{ display: "flex", justifyContent: "flex-end" }}>
				<Button type="dashed" disabled={disabled} onClick={() => append({ label: "", url: "" })}>
					افزودن شبکه اجتماعی
				</Button>
			</div>
		</div>
	);
}
