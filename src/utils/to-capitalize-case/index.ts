/**
 * @fa تبديل حرف اول رشته به حروف بزرگ
 * @en Convert the first letter of a string to uppercase
 *
 * @example
 * ```ts
 * console.log(toCapitalizeCase('hello')); // Hello
 * ```
 */
export function toCapitalizeCase(string: string) {
	return string.charAt(0).toUpperCase() + string.slice(1);
}
