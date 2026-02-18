// این فایل را به API واقعی پروژه‌ات وصل کن
export interface ServiceDto { id: number, title: string, code: string }

export async function listServices(): Promise<ServiceDto[]> {
	// TODO: از api واقعی پروژه import/re-export کن
	// مثال:
	// return request.get("contracts/services/").json<ServiceDto[]>();
	return [];
}
