export interface ServiceDto { id: number, title: string, code: string }

export async function listServices(): Promise<ServiceDto[]> {
	return [];
}
