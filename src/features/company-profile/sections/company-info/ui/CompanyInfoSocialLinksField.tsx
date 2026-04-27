import { RHFProText } from "#src/shared/ui/rhf-pro/index.js";
import { Button } from "antd";
import { useFieldArray, useFormContext } from "react-hook-form";

interface Props {
	disabled?: boolean
}

export default function CompanyInfoSocialLinksField({ disabled = false }: Props) {
	const { control } = useFormContext();
	const { fields, append, remove } = useFieldArray({ control, name: "social_links" });

	return (
		<div>
			<div className="mb-2 opacity-90">{"\u0634\u0628\u06A9\u0647\u200C\u0647\u0627\u06CC \u0627\u062C\u062A\u0645\u0627\u0639\u06CC"}</div>

			{fields.map((field, idx) => (
				<div key={field.id} className="grid grid-cols-[1fr_2fr_auto] gap-3 mb-3 items-center">
					<RHFProText name={`social_links.${idx}.label`} label={"\u0639\u0646\u0648\u0627\u0646"} inputProps={{ disabled }} />
					<RHFProText name={`social_links.${idx}.url`} label={"\u0644\u06CC\u0646\u06A9"} inputProps={{ disabled }} />
					<Button danger type="text" disabled={disabled} onClick={() => remove(idx)}>
						{"\u062D\u0630\u0641"}
					</Button>
				</div>
			))}

			<div className="flex justify-end">
				<Button type="dashed" disabled={disabled} onClick={() => append({ label: "", url: "" })}>
					{"\u0627\u0641\u0632\u0648\u062F\u0646 \u0634\u0628\u06A9\u0647 \u0627\u062C\u062A\u0645\u0627\u0639\u06CC"}
				</Button>
			</div>
		</div>
	);
}
