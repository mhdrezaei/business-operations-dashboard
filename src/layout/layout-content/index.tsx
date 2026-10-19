import { GlobalSpin, Scrollbar } from "#src/components";
import { useLayoutContentStyle } from "#src/hooks";
import { LayoutFooter } from "#src/layout";
import { ELEMENT_ID_MAIN_CONTENT } from "#src/layout/constants";
import { useAccessStore, usePreferencesStore, useTabsStore } from "#src/store";

import KeepAlive, { useKeepAliveRef } from "keepalive-for-react";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";

import { useLocation, useOutlet } from "react-router";

export default function LayoutContent() {
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
	const scrollableRef = useRef<HTMLElement>(null);

	/**
	 * to distinguish different pages to cache
	 */
	const cacheKey = useMemo(() => {
		return pathname + search;
	}, [pathname, search]);

	useLayoutEffect(() => {
		const scroller = scrollableRef.current;
		if (!scroller)
			return;

		scroller.scrollTop = 0;
		scroller.scrollLeft = 0;
	}, [cacheKey]);

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
			className="relative mx-3 flex-grow overflow-y-auto overflow-x-hidden rounded-md bg-transparent sm:mx-4 lg:mx-6"
		>
			<Scrollbar ref={scrollableRef}>
				<GlobalSpin>
					<div className="flex flex-col min-h-full">
						{/* The page transition slides cached pages sideways; clipping keeps that from showing a horizontal scrollbar. */}
						<div className="flex-1 overflow-x-clip">
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
