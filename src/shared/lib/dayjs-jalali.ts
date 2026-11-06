import type {} from "jalaliday/dayjs"; // types only: `calendar()` typing; the plugin itself is registered by antd-jalali
import dayjs from "dayjs";
// antd-jalali registers its own jalaliday plugin on dayjs. Extending the project's jalaliday copy as well patches
// dayjs parsing twice and shifts every typed/picked Jalali date by +621 years on top of the conversion.
import "antd-jalali";

dayjs.calendar("jalali");

export { dayjs };
export type { Dayjs } from "dayjs";
