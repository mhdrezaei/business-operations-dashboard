import { isObject, message } from "#src/utils";

function extractFirstErrorMessage(value: unknown): string | null {
	if (typeof value === "string") {
		const text = value.trim();
		return text.length ? text : null;
	}

	if (Array.isArray(value)) {
		for (const item of value) {
			const msg = extractFirstErrorMessage(item);
			if (msg)
				return msg;
		}
		return null;
	}

	if (isObject(value)) {
		const obj = value as Record<string, unknown>;
		if (typeof obj.errorMsg === "string" && obj.errorMsg.trim())
			return obj.errorMsg.trim();
		if (typeof obj.message === "string" && obj.message.trim())
			return obj.message.trim();

		for (const key of Object.keys(obj)) {
			const msg = extractFirstErrorMessage(obj[key]);
			if (msg)
				return msg;
		}
	}

	return null;
}

/**
 * Handle error responses and display the most relevant server message.
 */
export async function handleErrorResponse(response: Response, suppressErrorNotification = false) {
	if (suppressErrorNotification)
		return response;

	try {
		const data = await response.json();
		const extracted = extractFirstErrorMessage(data);
		message.error(extracted || response.statusText);
	}
	catch (e) {
		console.error("Error parsing JSON:", e);
		message.error(response.statusText);
	}

	return response;
}
