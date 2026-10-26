import type { PredictionShareSectionValue } from "./prediction.form.types";

const MANUAL_SHARES_ROOT = "serviceFields.manualShares";

interface TemplateOptions {
	getValues: (path: string) => unknown
	setValue: (path: string, value: unknown, options: { shouldDirty: boolean, shouldValidate: boolean }) => void
	/** Path of the section that was just switched to manual mode. */
	targetPath: string
	/** Maps a share section path to the path of its extra (SMS channel) percentages. */
	extraPathOf?: (sectionPath: string) => string
}

function isShareSection(value: unknown): value is PredictionShareSectionValue {
	return !!value && typeof value === "object" && "selectedCompanyIds" in value && "shares" in value;
}

function collectSectionPaths(value: unknown, path: string): string[] {
	if (isShareSection(value))
		return [path];
	if (!value || typeof value !== "object")
		return [];

	return Object.entries(value).flatMap(([key, child]) => collectSectionPaths(child, `${path}.${key}`));
}

function sumValues(values: unknown[]) {
	return values.reduce<number>((total, value) => total + Number(value ?? 0), 0);
}

export function getShareTotal(section: PredictionShareSectionValue) {
	return sumValues(section.selectedCompanyIds.map(companyId => section.shares[String(companyId)]));
}

function isCompleteExtra(extra: unknown) {
	if (!extra || typeof extra !== "object")
		return false;

	const values = Object.values(extra);
	return values.length > 0 && values.every(value => value != null) && sumValues(values) === 100;
}

/**
 * Like the old form: when a metric is switched to manual and is still empty, reuse the company
 * selection (and SMS channel percentages) of the first other manual metric that already totals 100.
 */
export function applyManualShareTemplate({ getValues, setValue, targetPath, extraPathOf }: TemplateOptions) {
	const target = getValues(targetPath);
	if (!isShareSection(target) || getShareTotal(target) > 0)
		return;

	for (const sourcePath of collectSectionPaths(getValues(MANUAL_SHARES_ROOT), MANUAL_SHARES_ROOT)) {
		const source = getValues(sourcePath);
		if (sourcePath === targetPath || !isShareSection(source) || source.mode !== "manual" || getShareTotal(source) !== 100)
			continue;

		const sourceExtra = extraPathOf ? getValues(extraPathOf(sourcePath)) : null;
		if (extraPathOf && !isCompleteExtra(sourceExtra))
			continue;

		setValue(targetPath, { ...source, selectedCompanyIds: [...source.selectedCompanyIds], shares: { ...source.shares } }, {
			shouldDirty: true,
			shouldValidate: false,
		});
		if (extraPathOf)
			setValue(extraPathOf(targetPath), { ...(sourceExtra as Record<string, unknown>) }, { shouldDirty: true, shouldValidate: false });
		return;
	}
}
