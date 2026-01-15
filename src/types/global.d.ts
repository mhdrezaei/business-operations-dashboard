import type { dependencies, devDependencies } from "#package.json";

import type { ThemeType } from "#src/store";
import type { GlobalToken } from "antd";

declare global {
	const __APP_INFO__: {
		pkg: {
			name: string
			version: string
			license: string
			author: string
			dependencies: typeof dependencies
			devDependencies: typeof devDependencies
		}
		lastBuildTime: string
	};

	/* Inspired by https://github.com/soybeanjs/soybean-admin/blob/v1.3.8/src/typings/global.d.ts */
	interface Window {
		/** ant design message instance */
		$message?: import("antd/es/message/interface").MessageInstance
		/** ant design modal instance */
		$modal?: Omit<import("antd/es/modal/confirm").ModalStaticFunctions, "warn">
		/** ant design notification instance */
		$notification?: import("antd/es/notification/interface").NotificationInstance
	}

	/**
	 * @description تقويت تم پيش فرض JSS
	 * @description Enhances the default theme for JSS
	 * @see https://github.com/cssinjs/jss/blob/master/docs/react-jss-ts.md#defining-a-global-default-theme
	 */
	namespace Jss {
		/**
		 * رابط تم شامل ويژگي ها و تشخيص هاي مربوط به تم
		 *
		 * @fa رابط تم شامل نوع تم، توکن هاي سراسري و تشخيص تيره يا روشن بودن است
		 * @en Theme interface, containing theme-related properties and dark/light theme checks
		 */
		export interface Theme {
			/**
			 * نوع تم فعلي برنامه
			 *
			 * @fa نوع تم فعلي برنامه مي تواند "dark" يا "light" يا رشته خالي باشد
			 * @en The current theme type of the application, which can be "dark", "light", or an empty string
			 */
			theme: ThemeType

			/**
			 * توکن هاي antd
			 *
			 * @fa توکن هاي استايل antd
			 * @en antd style token
			 */
			token: GlobalToken

			/**
			 * نشان مي دهد آيا تم فعلي تيره است
			 *
			 * @fa اگر تم فعلي "dark" باشد true است؛ در غير اين صورت false
			 * @en Indicates whether the current theme is dark. True if the theme is "dark", otherwise false.
			 */
			isDark: boolean

			/**
			 * نشان مي دهد آيا تم فعلي روشن است
			 *
			 * @fa اگر تم فعلي "light" باشد true است؛ در غير اين صورت false
			 * @en Indicates whether the current theme is light. True if the theme is "light", otherwise false.
			 */
			isLight: boolean
			/**
			 * پيشوند کلاس کامپوننت هاي ant design
			 *
			 * @fa پيشوند کلاس کامپوننت ها
			 * @en Component class name prefix
			 * @default "ant"
			 */
			prefixCls: string
		}
	}
}
