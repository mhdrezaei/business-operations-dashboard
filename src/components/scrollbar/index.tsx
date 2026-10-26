import type { CSSProperties, HTMLAttributes, ReactNode, UIEventHandler } from "react";
import type { Props as SimplebarProps } from "simplebar-react";
import { cn } from "#src/utils/cn";
import { forwardRef, useMemo } from "react";
import SimpleBar from "simplebar-react";

export type ScrollbarVariant = "default" | "thin" | "hidden";
export type ScrollbarDirection = "vertical" | "horizontal" | "both";
export type ScrollbarMode = "simplebar" | "native";

export interface ScrollbarProps extends Omit<SimplebarProps, "direction" | "onScroll"> {
	children?: ReactNode
	/**
	 * حداکثر ارتفاع کانتینر اسکرول
	 * @example maxHeight={400} یا maxHeight="calc(100vh - 200px)"
	 */
	maxHeight?: number | string
	/**
	 * حداقل ارتفاع کانتینر اسکرول
	 */
	minHeight?: number | string
	/**
	 * ارتفاع مشخص کانتینر اسکرول
	 */
	height?: number | string
	/**
	 * حداکثر عرض کانتینر اسکرول
	 */
	maxWidth?: number | string
	/**
	 * عرض مشخص کانتینر اسکرول
	 */
	width?: number | string
	/**
	 * نوع استایل اسکرول‌بار:
	 * - `default`: اسکرول‌بار استاندارد و ظریف هماهنگ با تم
	 * - `thin`: اسکرول‌بار باریک
	 * - `hidden`: مخفی کردن نمایش اسکرول‌بار با حفظ قابلیت اسکرول
	 * @default "default"
	 */
	variant?: ScrollbarVariant
	/**
	 * جهت اسکرول:
	 * - `vertical`: فقط عمودی
	 * - `horizontal`: فقط افقی
	 * - `both`: هر دو جهت
	 * @default "both"
	 */
	direction?: ScrollbarDirection
	/**
	 * حالت پیاده‌سازی اسکرول:
	 * - `simplebar`: اسکرول مجازی یکنواخت در تمام مرورگرها (پیش‌فرض)
	 * - `native`: اسکرول محلی مرورگر با استایل سفارشی هماهنگ با تم (مناسب برای جداول و لایه‌های خاص)
	 * @default "simplebar"
	 */
	mode?: ScrollbarMode
	/**
	 * کلاس CSS برای محتوای داخلی
	 */
	contentClassName?: string
	/**
	 * استایل CSS برای محتوای داخلی
	 */
	contentStyle?: CSSProperties
	/**
	 * هندلر رویداد اسکرول
	 */
	onScroll?: UIEventHandler<HTMLElement>
}

/**
 * کامپوننت شخصی‌سازی‌شده مرکزی برای اسکرول هماهنگ با لایت‌مد و دارک‌مد
 */
export const Scrollbar = forwardRef<HTMLElement, ScrollbarProps>((props, ref) => {
	const {
		children,
		className,
		style,
		contentClassName,
		contentStyle,
		maxHeight,
		minHeight,
		height,
		maxWidth,
		width,
		variant = "default",
		direction = "both",
		mode = "simplebar",
		autoHide = true,
		clickOnTrack = false,
		scrollableNodeProps,
		onScroll,
		...other
	} = props;

	const containerStyle = useMemo<CSSProperties>(() => {
		return {
			...(maxHeight !== undefined && { maxHeight: typeof maxHeight === "number" ? `${maxHeight}px` : maxHeight }),
			...(minHeight !== undefined && { minHeight: typeof minHeight === "number" ? `${minHeight}px` : minHeight }),
			...(height !== undefined && { height: typeof height === "number" ? `${height}px` : height }),
			...(maxWidth !== undefined && { maxWidth: typeof maxWidth === "number" ? `${maxWidth}px` : maxWidth }),
			...(width !== undefined && { width: typeof width === "number" ? `${width}px` : width }),
			...style,
		};
	}, [maxHeight, minHeight, height, maxWidth, width, style]);

	const overflowClass = useMemo(() => {
		switch (direction) {
			case "vertical":
				return "overflow-y-auto overflow-x-hidden";
			case "horizontal":
				return "overflow-x-auto overflow-y-hidden";
			case "both":
			default:
				return "overflow-auto";
		}
	}, [direction]);

	const variantClass = useMemo(() => {
		switch (variant) {
			case "thin":
				return "custom-scrollbar-thin simplebar-thin";
			case "hidden":
				return "custom-scrollbar-hidden";
			case "default":
			default:
				return "custom-scrollbar";
		}
	}, [variant]);

	if (mode === "native") {
		return (
			<div
				ref={ref as React.Ref<HTMLDivElement>}
				className={cn("h-full", overflowClass, variantClass, className)}
				style={containerStyle}
				onScroll={onScroll}
				{...(other as HTMLAttributes<HTMLDivElement>)}
			>
				{contentClassName || contentStyle ? (
					<div className={contentClassName} style={contentStyle}>
						{children}
					</div>
				) : (
					children
				)}
			</div>
		);
	}

	return (
		<SimpleBar
			autoHide={autoHide}
			clickOnTrack={clickOnTrack}
			scrollableNodeProps={{
				ref,
				onScroll,
				...scrollableNodeProps,
			}}
			className={cn("h-full", variantClass, className)}
			style={containerStyle}
			{...other}
		>
			{contentClassName || contentStyle ? (
				<div className={contentClassName} style={contentStyle}>
					{children}
				</div>
			) : (
				children
			)}
		</SimpleBar>
	);
});

Scrollbar.displayName = "Scrollbar";
