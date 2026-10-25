import { extractFirstErrorMessage } from "#src/utils/request/error-response";

export async function getRequestErrorMessage(error: unknown, fallback: string) {
	const response = (error as { response?: Response })?.response;
	if (!response)
		return error instanceof Error && error.message.trim() ? error.message : fallback;
	try {
		return extractFirstErrorMessage(await response.clone().json()) ?? fallback;
	}
	catch {
		return fallback;
	}
}
