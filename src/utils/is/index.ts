/**
 * بررسي مي کند آيا مقدار از نوع تابع است
 * Determines whether the given value is of the function type
 *
 * @param value مقدار مورد بررسي / The value to be checked
 * @returns اگر مقدار تابع باشد true؛ در غير اين صورت false / Returns true if the given value is a function type, otherwise returns false
 */
export function isFunction(value: unknown) {
	return typeof value === "function";
}

/**
 * بررسي مي کند آيا مقدار يک عدد متناهي است
 * Determines whether the given value is a finite number
 *
 * @param value مقدار مورد بررسي / The value to be checked
 * @returns اگر مقدار عدد متناهي باشد true؛ در غير اين صورت false / Returns true if the given value is a finite number, otherwise returns false
 */
export function isNumber(value: unknown) {
	return typeof value === "number" && Number.isFinite(value);
}

/**
 * بررسي مي کند آيا مقدار از نوع رشته است
 * Determines whether a value is of the string type
 *
 * @param value مقدار مورد بررسي / The value to be checked
 * @returns مقدار بولي براي نوع رشته / Returns a boolean value indicating whether the value is of the string type
 */
export function isString(value: unknown) {
	return typeof value === "string";
}

/**
 * بررسي مي کند آيا مقدار بولي است
 * Determines whether the given value is a boolean value
 *
 * @param value مقدار مورد بررسي / The value to be checked
 * @returns اگر مقدار بولي باشد true؛ در غير اين صورت false / Returns true if the given value is a boolean value, otherwise returns false
 */
export function isBoolean(value: unknown) {
	return typeof value === "boolean";
}

/**
 * بررسي مي کند آيا مقدار از نوع شيء است (به جز null)
 * Determines whether a value is of the object type (excluding null)
 *
 * @param value مقدار مورد بررسي / The value to be checked
 * @returns مقدار بولي براي نوع شيء / Returns a boolean value indicating whether the value is of the object type
 */
export function isObject(value: unknown) {
	return typeof value === "object" && value !== null;
}

/**
 * بررسي مي کند آيا مقدار null است
 * Determines whether a value is null
 *
 * @param value مقدار مورد بررسي / The value to be checked
 * @returns اگر مقدار null باشد true؛ در غير اين صورت false / Returns true if the value is null, otherwise returns false
 */
export function isNull(value: unknown) {
	return value === null;
}

/**
 * بررسي مي کند آيا مقدار undefined است
 * Determines whether a value is undefined
 *
 * @param value مقدار مورد بررسي / The value to be checked
 * @returns اگر مقدار undefined باشد true؛ در غير اين صورت false / Returns true if the value is undefined, otherwise returns false
 */
export function isUndefined(value: unknown) {
	return value === undefined;
}
