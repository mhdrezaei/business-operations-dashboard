import { clsx } from "clsx";

interface Props {
	style?: React.CSSProperties
	className?: string
	children: React.ReactNode
}

export function BasicContent(props: Props) {
	const { children, className, style } = props;

	return (
		<div
			id="basic-content"
			/**
			 * 1. اگر ارتفاع children زياد است و p-4 تنظيم شده، ديگر h-full نگذاريد تا padding-bottom پايين حذف نشود.
			 * لطفا src/pages/about/index.tsx را ببينيد
			 *
			 * 2. اگر مي خواهيد ارتفاع children کمتر يا برابر basic-content باشد از h-full استفاده کنيد
			 * لطفا src/pages/system/role/index.tsx را ببينيد
			 */
			className={clsx("p-4 px-2 overflow-y-hidden box-border", className)}
			style={{ ...style }}
		>
			{
				children
			}
		</div>
	);
}
