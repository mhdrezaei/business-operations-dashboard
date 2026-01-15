import { GlobalSpin, Scrollbar } from "#src/components";
import { useLayoutContentStyle } from "#src/hooks";
import { LayoutFooter } from "#src/layout";
import { CSS_VARIABLE_LAYOUT_CONTENT_HEIGHT, ELEMENT_ID_MAIN_CONTENT } from "#src/layout/constants";
import { useAccessStore, usePreferencesStore, useTabsStore } from "#src/store";

import { theme } from "antd";
import KeepAlive, { useKeepAliveRef } from "keepalive-for-react";
import { useEffect, useMemo } from "react";

import { useLocation, useOutlet } from "react-router";

export interface LayoutContentProps { }

export default function LayoutContent() {
	const {
		token: { colorBgLayout },
	} = theme.useToken();
	const { pathname, search } = useLocation();
	const outlet = useOutlet();
	const { contentElement } = useLayoutContentStyle();

	const aliveRef = useKeepAliveRef();
	const isRefresh = useTabsStore(state => state.isRefresh);
	const openTabs = useTabsStore(state => state.openTabs);
	const tabbarEnable = usePreferencesStore(state => state.tabbarEnable);
	const flatRouteList = useAccessStore(state => state.flatRouteList);
	const transitionName = usePreferencesStore(state => state.transitionName);
	const transitionEnable = usePreferencesStore(state => state.transitionEnable);
	const enableFooter = usePreferencesStore(state => state.enableFooter);
	const fixedFooter = usePreferencesStore(state => state.fixedFooter);

	/**
	 * to distinguish different pages to cache
	 */
	const cacheKey = useMemo(() => {
		return pathname + search;
	}, [pathname, search]);

	/**
	 * هنگام استفاده از بستن تب فعلي/راست/چپ/ساير/همه، بايد کش اين تب پاک شود
	 */
	useEffect(() => {
		const cacheNodes = aliveRef.current?.getCacheNodes?.();
		cacheNodes?.forEach((node) => {
			if (!openTabs.has(node.cacheKey)) {
				aliveRef.current?.destroy(node.cacheKey);
			}
		});
	}, [openTabs]);

	/**
	 * اگر چند تب غيرفعال شد، همه صفحه هاي کش شده پاک شود
	 */
	useEffect(() => {
		if (!tabbarEnable) {
			const cacheNodes = aliveRef.current?.getCacheNodes?.();
			cacheNodes?.forEach((node) => {
				/* شامل صفحه فعلي نمي شود */
				if (node.cacheKey !== cacheKey) {
					aliveRef.current?.destroy(node.cacheKey);
				}
			});
		}
	}, [tabbarEnable]);

	/* بازنشاني KeepAlive */
	useEffect(() => {
		/* فقط هنگام فعال بودن نوار تب اثر دارد */
		if (tabbarEnable && isRefresh) {
			aliveRef.current?.refresh();
		}
	}, [isRefresh]);

	/* اگر keepAlive = false باشد، صفحه کش نمي شود */
	const keepAliveExclude = useMemo(() => {
		/**
		 * اگر چند تب فعال نباشد، KeepAlive لازم نيست
		 * براي حفظ انيميشن تغيير صفحه، همه مسيرها را در exclude قرار بده
		 */
		if (!tabbarEnable) {
			return Object.keys(flatRouteList);
		}
		return Object.entries(flatRouteList).reduce<string[]>((acc, [key, value]) => {
			if (value.handle.keepAlive === false) {
				acc.push(key);
			}
			return acc;
		}, []);
	}, [flatRouteList, tabbarEnable]);

	return (
		<main
			id={ELEMENT_ID_MAIN_CONTENT}
			ref={contentElement}
			className="relative overflow-y-auto overflow-x-hidden flex-grow mx-4 p-4"
			style={
				{
					backgroundColor: colorBgLayout,
				}
			}
		>
			<Scrollbar>
				<GlobalSpin>
					<div
						className="flex flex-col h-full"
					>
						<div
							style={{
								height: `var(${CSS_VARIABLE_LAYOUT_CONTENT_HEIGHT})`,
							}}
						>
							<KeepAlive
								max={20}
								transition
								duration={300}
								cacheNodeClassName={transitionEnable ? `keepalive-${transitionName}` : undefined}
								exclude={keepAliveExclude}
								activeCacheKey={cacheKey}
								aliveRef={aliveRef}
							>
								{outlet}
							</KeepAlive>
						</div>
						{enableFooter && !fixedFooter ? <LayoutFooter /> : null}
					</div>
				</GlobalSpin>
			</Scrollbar>

		</main>
	);
}
