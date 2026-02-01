export function findFirstError(errs: any, path: string[] = []): { message: string, path: string[] } | null {
	if (!errs)
		return null;
	if (errs.message)
		return { path, message: errs.message as string };

	for (const key of Object.keys(errs)) {
		const child = errs[key];
		const res = findFirstError(child, [...path, key]);
		console.warn(res, "aaaaaaaaaa");
		if (res)
			return res;
	}
	return null;
}
