export interface MenuItemType {
	parentId: string // شناسه منوي والد
	id: number // شناسه منو
	menuType: 0 | 1 | 2 | 3 // نوع منو (۰ منو، ۱ iframe، ۲ لينک خارجي، ۳ دکمه)
	name: string // نام منو
	path: string // مسير روت
	component: string // مسير کامپوننت
	order: number // ترتيب منو
	icon: string // آيکن منو
	currentActiveMenu: string // مسير فعال
	iframeLink: string // لينک iframe
	keepAlive: number // آيا صفحه کش شود
	externalLink: string // آدرس لينک خارجي
	hideInMenu: number // آيا در منو مخفي شود
	ignoreAccess: number // آيا مجوز ناديده گرفته شود
	status: 1 // وضعيت (۰ غيرفعال، ۱ فعال)
	createTime: number
	updateTime: number
}
