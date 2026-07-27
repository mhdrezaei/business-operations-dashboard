import React from "react";
import { FormProvider, useForm } from "react-hook-form";
import TemplateCreateEditor from "./components/TemplateCreateEditor";
import TemplateCreateForm from "./components/TemplateCreateForm";
import TemplateCreateHeader from "./components/TemplateCreateHeader";
import TemplateCreateSidebar from "./components/TemplateCreateSidebar";

interface TemplateCreateLayoutProps {
	onClose: () => void
}

// تعریف تایپ مقادیر فرم
export interface TemplateFormValues {
	name: string
	service_id: number | null
	document_kind: string | null
	company_type: string | null
}

export default function TemplateCreateLayout({ onClose }: TemplateCreateLayoutProps) {
	// مقداردهی اولیه React Hook Form
	const methods = useForm<TemplateFormValues>({
		defaultValues: {
			name: "",
			service_id: null,
			document_kind: null,
			company_type: null,
		},
		mode: "onChange",
	});

	return (
		<FormProvider {...methods}>
			<div className="flex flex-col h-screen w-full overflow-hidden bg-transparent">
				<TemplateCreateHeader onClose={onClose} />

				<div className="flex flex-col flex-1 p-4 gap-4 overflow-hidden">
					<TemplateCreateForm />

					<div className="flex flex-1 gap-4 overflow-hidden">
						<div className="w-80 flex-shrink-0 h-full">
							<TemplateCreateSidebar />
						</div>
						<div className="flex-1 h-full overflow-hidden">
							<TemplateCreateEditor />
						</div>
					</div>
				</div>
			</div>
		</FormProvider>
	);
}
