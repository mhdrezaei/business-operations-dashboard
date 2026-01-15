import "ky";

/**
 * گسترش نوع `Options` در `ky`
 * با `ignoreLoading` مشخص مي شود آيا لودينگ ناديده گرفته شود
 */
declare module "ky" {
	interface Options {
		/**
		 * تنظيم ناديده گرفتن لودينگ سراسري
		 */
		ignoreLoading?: boolean
	}
	interface NormalizedOptions {
		/**
		 * تنظيم ناديده گرفتن لودينگ سراسري
		 */
		ignoreLoading?: boolean
	}
}
