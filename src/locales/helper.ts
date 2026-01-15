/**
 * Generic language module mapping type, representing nestable object structure
 */
interface LanguageModule<T> {
	[key: string]: T | any
}

/**
 * Parameter type for language files, used to describe the collection of imported language files
 */
type LanguageFileMap = Record<string, LanguageModule<LanguageFileMap>>;

export function getDeDeLang() {
	const langFiles = import.meta.glob<LanguageFileMap>("./de-DE/**/*.json", {
		import: "default",
		eager: true,
	});
	const result = organizeLanguageFiles(langFiles);
	return result;
}

export function getEnUsLang() {
	const langFiles = import.meta.glob<LanguageFileMap>("./en-US/**/*.json", {
		import: "default",
		eager: true,
	});
	const result = organizeLanguageFiles(langFiles);
	return result;
}

export function getFaIrLang() {
	const langFiles = import.meta.glob<LanguageFileMap>("./fa-IR/**/*.json", {
		import: "default",
		eager: true,
	});
	const result = organizeLanguageFiles(langFiles);
	return result;
}

export function organizeLanguageFiles(files: LanguageFileMap) {
	const result: LanguageModule<LanguageFileMap> = {};

	for (const key in files) {
		const data = files[key];
		const fileArr = key?.split("/");
		const fileName = fileArr[fileArr?.length - 1];
		if (!fileName)
			continue;
		const name = fileName.split(".json")[0];
		if (name)
			result[name] = data;
	}

	return result;
}
