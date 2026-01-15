import type { MenuItemType } from "./types";

import { isString } from "#src/utils";
import { cloneElement, isValidElement } from "react";

/**
 * تبديل همه label هاي درخت منو به متن ترجمه
 * @param menus آرايه منوي اصلي
 * @param t تابع Translation
 * @returns آرايه منو بعد از ترجمه
 */
export function translateMenus(menus: MenuItemType[], t: (key: string) => string): MenuItemType[] {
	return menus.map((menu) => {
		let translatedLabel: React.ReactNode = menu.label;
		if (isValidElement(menu.label)) {
			translatedLabel = cloneElement(menu.label, {}, t(menu.label.props.children));
		}
		if (isString(menu.label)) {
			translatedLabel = t(menu.label);
		}
		const translatedMenu = {
			...menu,
			label: translatedLabel,
		};

		if (menu.children && menu.children.length > 0) {
			translatedMenu.children = translateMenus(menu.children, t);
		}

		return translatedMenu;
	});
}

/**
 * يافتن منو بر اساس مسير
 *
 * @param list فهرست منو
 * @param path مسير منو
 * @returns شيء منو در صورت يافتن، در غير اين صورت null
 */
export function findMenuByPath(
	list: MenuItemType[],
	path?: string,
): MenuItemType | null {
	for (const menu of list) {
		if (menu.key === path) {
			return menu;
		}
		const findMenu = menu.children && findMenuByPath(menu.children, path);
		if (findMenu) {
			return findMenu;
		}
	}
	return null;
}

/**
 * يافتن منوي ريشه بر اساس مسير
 *
 * @param menus فهرست منو
 * @param path مسير منو، اختياري
 * @returns شيء شامل منوي يافته شده، منوي ريشه و مسير ريشه
 */
export function findRootMenuByPath(menus: MenuItemType[], path?: string): {
	findMenu: MenuItemType | null
	rootMenu: MenuItemType | null
	rootMenuPath: string | null
} {
	// مقدار دهي اوليه
	let findMenu: MenuItemType | null = null;
	let rootMenu: MenuItemType | null = null;
	let rootMenuPath: string | null = null;

	// اگر مسير داده نشده باشد، مقدارهاي پيش فرض برگردان
	if (!path) {
		return {
			findMenu: null,
			rootMenu: null,
			rootMenuPath: null,
		};
	}

	// تابع جستجوي بازگشتي
	const find = (
		list: MenuItemType[],
		targetPath: string,
		parents: MenuItemType[] = [],
	): boolean => {
		for (const menu of list) {
			// اگر منوي هدف پيدا شد
			if (menu.key === targetPath) {
				findMenu = menu;
				// اگر والد وجود ندارد، منوي فعلي همان ريشه است
				if (parents.length === 0) {
					rootMenu = menu;
					rootMenuPath = menu.key;
				}
				else {
					// گرفتن اولين والد به عنوان ريشه
					rootMenu = parents[0];
					rootMenuPath = parents[0].key;
				}
				return true;
			}

			// اگر فرزند دارد، بازگشتي ادامه بده
			if (menu.children && menu.children.length > 0) {
				// افزودن منوي فعلي به والدها و ادامه جستجو
				const found = find(menu.children, targetPath, [...parents, menu]);
				if (found) {
					return true;
				}
			}
		}
		return false;
	};

	// شروع جستجو
	find(menus, path);

	return {
		findMenu,
		rootMenu,
		rootMenuPath,
	};
}

/**
 * يافتن اولين آيتم در عميق ترين سطح زير اولين فرزند
 *
 * @param splitSideNavItems فهرست منو
 * @returns اولين آيتم در عميق ترين سطح
 */
export function findDeepestFirstItem(splitSideNavItems: MenuItemType[]): MenuItemType | null {
	// اگر فهرست خالي است، null برگردان
	if (!splitSideNavItems || splitSideNavItems.length === 0) {
		return null;
	}

	// گرفتن اولين آيتم منو
	const firstItem = splitSideNavItems[0];

	// اگر فرزند دارد، بازگشتي ادامه بده
	if (firstItem.children && firstItem.children.length > 0) {
		return findDeepestFirstItem(firstItem.children);
	}

	// اگر فرزندي نبود، به عميق ترين سطح رسيده ايم
	return firstItem;
}

/**
 * گرفتن تمام key ها و سطح آنها در منو
 *
 * @param menuItems1 آرايه آيتم هاي منو
 * @returns شيء که کليد آن key منو و مقدار آن سطح منو است
 */
export function getLevelKeys(menuItems1: MenuItemType[]) {
	const key: Record<string, number> = {};
	const func = (menuItems2: MenuItemType[], level = 1) => {
		menuItems2.forEach((item) => {
			if (item.key) {
				key[item.key] = level;
			}
			if (item.children) {
				func(item.children, level + 1);
			}
		});
	};
	func(menuItems1);
	return key;
};

/**
 * گرفتن کليد والد هر آيتم منو
 *
 * @param menuItems آرايه آيتم هاي منو
 * @returns شيء شامل آرايه کليدهاي والد براي هر کليد منو
 */
export function getParentKeys(menuItems: MenuItemType[]): Record<string, string[]> {
	const parentKeyMap: Record<string, string[]> = {};

	function traverse(items: MenuItemType[], parentKeys: string[] = []) {
		for (const item of items) {
			// ثبت آرايه کليدهاي والد براي key فعلي
			parentKeyMap[item.key] = [...parentKeys];

			// اگر فرزند وجود دارد، بازگشتي ادامه بده
			if (Array.isArray(item.children) && item.children.length) {
				traverse(item.children, [...parentKeys, item.key]);
			}
		}
	}

	traverse(menuItems);
	return parentKeyMap;
}
