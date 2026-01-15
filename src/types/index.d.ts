/**
 * قالب داده بازگشتي API
 * data: داده بازگشتي API
 */
interface ApiResponse<T> {
	code: number
	result: T
	message: string
	success: boolean
}

/**
 * قالب داده بازگشتي API به صورت آرايه
 * list: داده بازگشتي API
 */
interface ApiListResponse<T> extends ApiResponse<T> {
	result: {
		list: T[]
		total: number
		current: number
	}
}

/**
 * پارامترهاي درخواست دريافت جدول
 */
interface ApiTableRequest extends Record<string, any> {
	cqs?: string
	pageSize?: number
	current?: number
}

type Recordable<T = any> = Record<string, T>;
