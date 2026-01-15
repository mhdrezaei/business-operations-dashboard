import { system } from "#/src/router/extra-info";

import { defineFakeRoute } from "vite-plugin-fake-server/client";
import { resultSuccess } from "./utils";

const systemMenu = [
	// مدیریت سیستم
	{
		id: system,
		menuType: 0, // نوع منو (۰ منو، ۱ iframe، ۲ لینک خارجی، ۳ دکمه)
		name: "common.menu.system",
	},
	{
		parentId: system,
		id: system + 1,
		menuType: 0,
		name: "common.menu.user",
	},
	{
		parentId: system,
		id: system + 2,
		menuType: 0,
		name: "common.menu.role",
	},
	{
		parentId: system,
		id: system + 3,
		menuType: 0,
		name: "common.menu.menu",
	},
	{
		parentId: system,
		id: system + 4,
		menuType: 0,
		name: "common.menu.dept",
	},
	{
		parentId: system + 4,
		id: system + 4 + 1,
		menuType: 3,
		name: "common.add",
	},
	{
		parentId: system + 4,
		id: system + 4 + 2,
		menuType: 3,
		name: "common.edit",
	},
	{
		parentId: system + 4,
		id: system + 4 + 3,
		menuType: 3,
		name: "common.delete",
	},
];

export default defineFakeRoute([
	// مدیریت نقش
	{
		url: "/role-list",
		method: "get",
		response: ({ body }) => {
			let list = [
				{
					createTime: 1729752330782, // مهر زمان (میلی‌ثانیه ms)
					updateTime: 1729752330782,
					id: 1,
					name: "مدیر ارشد",
					code: "admin",
					status: 1, // وضعیت: ۱ فعال، ۰ غیرفعال
					remark: "مدیر ارشد دارای بالاترین سطح دسترسی است",
				},
				{
					createTime: 1729752330782,
					updateTime: 1729752330782,
					id: 2,
					name: "نقش عادی",
					code: "common",
					status: 1,
					remark: "نقش عادی دارای بخشی از دسترسی‌ها است",
				},
			];
			// list = Array.from({ length: 10000 }).flatMap(() => list);
			list = list.filter(item =>
				item.name.includes(body?.name ?? "")
				&& String(item.status).includes(String(body?.status ?? ""))
				&& (!body?.code || item.code === body?.code),
			);
			return resultSuccess({
				list,
				total: list.length, // تعداد کل
				pageSize: 10, // تعداد آیتم در هر صفحه
				current: 1, // شماره صفحه فعلی
			});
		},
	},
	// مدیریت نقش - افزودن نقش
	{
		url: "/role-item",
		method: "post",
		response: ({ body }) => {
			return resultSuccess(body);
		},
	},
	// مدیریت نقش - ویرایش نقش
	{
		url: "/role-item",
		method: "put",
		response: ({ body }) => {
			return resultSuccess(body);
		},
	},
	// مدیریت نقش - حذف نقش
	{
		url: "/role-item",
		method: "delete",
		response: ({ body }) => {
			return resultSuccess(body);
		},
	},
	// مدیریت نقش - مجوزها - مجوز منو
	{
		url: "/role-menu",
		method: "get",
		response: () => {
			return resultSuccess(systemMenu);
		},
	},
	// مدیریت نقش - مجوزها - مجوز منو، یافتن منوی متناظر با شناسه نقش
	{
		url: "/menu-by-role-id",
		method: "get",
		response: ({ query }) => {
			if (query.id === "1") {
				return resultSuccess(systemMenu.map(item => item.id));
			}
			else if (query.id === "2") {
				return resultSuccess([]);
			}
			return resultSuccess([]);
		},
	},
	// مدیریت منو
	{
		url: "/menu-list",
		method: "get",
		response: () => {
			const menuList = [
				// مدیریت سیستم
				{
					parentId: "", // شناسه منوی والد
					id: system, // شناسه منو
					menuType: 0, // نوع منو (۰ منو، ۱ iframe، ۲ لینک خارجی، ۳ دکمه)
					name: "common.menu.system", // نام منو
					path: "/system", // مسیر روت
					component: "/system", // مسیر کامپوننت
					order: system, // ترتیب منو
					icon: "SettingOutlined", // آیکن منو
					currentActiveMenu: "", // مسیر فعال
					iframeLink: "", // لینک iframe
					keepAlive: true, // آیا صفحه کش شود
					externalLink: "", // آدرس لینک خارجی
					hideInMenu: false, // آیا در منو مخفی شود
					ignoreAccess: false, // آیا مجوز نادیده گرفته شود
					status: 1, // وضعیت (۰ غیرفعال، ۱ فعال)
					createTime: 1737023155965,
					updateTime: 1737023164653,
				},
				{
					parentId: system,
					id: system + 1,
					menuType: 0,
					name: "common.menu.user",
					path: "/system/user", // مسیر روت
					component: "/system/user", // مسیر کامپوننت
					order: undefined, // ترتیب منو
					icon: "UserOutlined", // آیکن منو
					currentActiveMenu: "", // مسیر فعال
					iframeLink: "", // لینک iframe
					keepAlive: true, // آیا صفحه کش شود
					externalLink: "", // آدرس لینک خارجی
					hideInMenu: false, // آیا در منو مخفی شود
					ignoreAccess: false, // آیا مجوز نادیده گرفته شود
					status: 1, // وضعیت (۰ غیرفعال، ۱ فعال)
					createTime: 1737023155965,
					updateTime: 1737023164653,
				},
				{
					parentId: system,
					id: system + 2,
					menuType: 0,
					name: "common.menu.role",
					path: "/system/role", // مسیر روت
					component: "/system/role", // مسیر کامپوننت
					order: undefined, // ترتیب منو
					icon: "TeamOutlined", // آیکن منو
					currentActiveMenu: "", // مسیر فعال
					iframeLink: "", // لینک iframe
					keepAlive: true, // آیا صفحه کش شود
					externalLink: "", // آدرس لینک خارجی
					hideInMenu: false, // آیا در منو مخفی شود
					ignoreAccess: false, // آیا مجوز نادیده گرفته شود
					status: 1, // وضعیت (۰ غیرفعال، ۱ فعال)
					createTime: 1737023155965,
					updateTime: 1737023164653,
				},
				{
					parentId: system,
					id: system + 3,
					menuType: 0,
					name: "common.menu.menu",
					path: "/system/menu", // مسیر روت
					component: "/system/menu", // مسیر کامپوننت
					order: undefined, // ترتیب منو
					icon: "MenuOutlined", // آیکن منو
					currentActiveMenu: "", // مسیر فعال
					iframeLink: "", // لینک iframe
					keepAlive: true, // آیا صفحه کش شود
					externalLink: "", // آدرس لینک خارجی
					hideInMenu: false, // آیا در منو مخفی شود
					ignoreAccess: false, // آیا مجوز نادیده گرفته شود
					status: 1, // وضعیت (۰ غیرفعال، ۱ فعال)
					createTime: 1737023155965,
					updateTime: 1737023164653,
				},
				{
					parentId: system,
					id: system + 4,
					menuType: 0,
					name: "common.menu.dept",
					path: "/system/dept", // مسیر روت
					component: "/system/dept", // مسیر کامپوننت
					order: undefined, // ترتیب منو
					icon: "ApartmentOutlined", // آیکن منو
					currentActiveMenu: "", // مسیر فعال
					iframeLink: "", // لینک iframe
					keepAlive: true, // آیا صفحه کش شود
					externalLink: "", // آدرس لینک خارجی
					hideInMenu: false, // آیا در منو مخفی شود
					ignoreAccess: false, // آیا مجوز نادیده گرفته شود
					status: 1, // وضعیت (۰ غیرفعال، ۱ فعال)
					createTime: 1737023155965,
					updateTime: 1737023164653,
				},
				{
					parentId: system + 4,
					id: system + 4 + 1,
					menuType: 3,
					name: "common.add",
					status: 1, // وضعیت (۰ غیرفعال، ۱ فعال)
					createTime: 1737023155965,
					updateTime: 1737023164653,
				},
				{
					parentId: system + 4,
					id: system + 4 + 2,
					menuType: 3,
					name: "common.edit",
					status: 1, // وضعیت (۰ غیرفعال، ۱ فعال)
					createTime: 1737023155965,
					updateTime: 1737023164653,
				},
				{
					parentId: system + 4,
					id: system + 4 + 3,
					menuType: 3,
					name: "common.delete",
					status: 1, // وضعیت (۰ غیرفعال، ۱ فعال)
					createTime: 1737023155965,
					updateTime: 1737023164653,
				},
			];
			return resultSuccess({
				list: menuList,
				total: menuList.length, // تعداد کل
				pageSize: 10, // تعداد آیتم در هر صفحه
				current: 1, // شماره صفحه فعلی
			});
		},
	},
	{
		url: "/menu-item",
		method: "post",
		response: () => {
			return resultSuccess({});
		},
	},
	{
		url: "/menu-item",
		method: "delete",
		response: () => {
			return resultSuccess({});
		},
	},
	{
		url: "/menu-item",
		method: "put",
		response: () => {
			return resultSuccess({});
		},
	},
]);
