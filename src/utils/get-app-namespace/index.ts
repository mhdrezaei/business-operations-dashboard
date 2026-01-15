/**
 * Get application namespace with suffix
 * دريافت نام فضاي برنامه با پسوند
 * @param {string} name - The suffix name to append / نام پسوندي که افزوده مي شود
 * @returns {string} Format: `{namespace}-{version}-{env}-{name}` / قالب: `{نام فضا}-{نسخه}-{محیط}-{نام}`
 * @example
 * // For Zustand store
 * const storeKey = getAppNamespace('userStore');
 * // Output: "myapp-1.0.0-prod-userStore"
 */
export function getAppNamespace(name: string): string {
	const env = import.meta.env.PROD ? "prod" : "dev";
	const appVersion = __APP_INFO__.pkg.version;
	const appNamespace = import.meta.env.VITE_APP_NAMESPACE;

	if (!appNamespace) {
		throw new Error("VITE_APP_NAMESPACE is not defined in environment variables / VITE_APP_NAMESPACE در متغيرهاي محيطي تعريف نشده است");
	}

	const namespace = `${appNamespace}-${appVersion || "unknown"}-${env}`;
	return `${namespace}-${name}`;
}
