import dayjs from "dayjs";
import jalaliday from "jalaliday/dayjs";

// فعال کردن jalali/gregory multi-calendar
dayjs.extend(jalaliday);

// اگر می‌خوای همه instanceها پیش‌فرض شمسی باشن:
dayjs.calendar("jalali"); // optional :contentReference[oaicite:3]{index=3}

export { dayjs };
export type { Dayjs } from "dayjs";
