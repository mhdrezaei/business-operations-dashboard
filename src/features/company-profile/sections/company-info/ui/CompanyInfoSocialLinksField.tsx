import { RHFProText } from "#src/shared/ui/rhf-pro/index.js";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Form } from "antd";
import { useFieldArray, useFormContext } from "react-hook-form";

interface Props {
	disabled?: boolean
}

export default function CompanyInfoSocialLinksField({ disabled = false }: Props) {
	const { control } = useFormContext();
	const { fields, append, remove } = useFieldArray({ control, name: "social_links" });

	return (
		<div className="company-social-links">
			{fields.map((field, idx) => (
				<div key={field.id} className="company-social-links__row">
					<RHFProText name={`social_links.${idx}.label`} label="عنوان" inputProps={{ disabled }} />
					<RHFProText name={`social_links.${idx}.url`} label="لینک" inputProps={{ disabled }} />
					<Form.Item className="company-social-links__delete">
						<Button danger icon={<DeleteOutlined />} disabled={disabled} onClick={() => remove(idx)}>
							حذف
						</Button>
					</Form.Item>
				</div>
			))}

			<div className="company-social-links__actions">
				<Button type="dashed" icon={<PlusOutlined />} disabled={disabled} onClick={() => append({ label: "", url: "" })}>
					افزودن شبکه اجتماعی
				</Button>
			</div>
		</div>
	);
}
