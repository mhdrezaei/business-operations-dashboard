import { RHFProText } from "#src/shared/ui/rhf-pro/index.js";
import { Button } from "antd";
import { useFieldArray, useFormContext } from "react-hook-form";

export default function CompanyInfoSocialLinksField() {
	const { control } = useFormContext();
	const { fields, append, remove } = useFieldArray({ control, name: "social_links" });

	return (
		<div>
			<div className="mb-2 opacity-90">شبکه‌های اجتماعی</div>

			{fields.map((f, idx) => (
				<div key={f.id} className="grid grid-cols-[1fr_2fr_auto] gap-3 mb-3 items-center">
					<RHFProText name={`social_links.${idx}.label`} label="عنوان" />
					<RHFProText name={`social_links.${idx}.url`} label="لینک" />
					<Button danger type="text" onClick={() => remove(idx)}>
						حذف
					</Button>
				</div>
			))}

			<div className="flex justify-end">
				<Button type="dashed" onClick={() => append({ label: "", url: "" })}>
					افزودن شبکه اجتماعی
				</Button>
			</div>
		</div>
	);
}
