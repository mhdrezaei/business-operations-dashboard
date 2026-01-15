/**
 * نوع آيتم منو
 */
export interface MenuItemType {
	/**
	 * مسير منو، شناسه يکتاي item
	 */
	key: string
	/**
	 * عنوان آيتم منو
	 */
	label: React.ReactNode
	/**
	 * آيتم هاي زيرمنو
	 */
	children?: MenuItemType[]
	/**
	 * آيکن منو
	 */
	icon?: React.ReactNode
	/**
	 * آيا منو غيرفعال است
	 * @default false
	 */
	disabled?: boolean
}
