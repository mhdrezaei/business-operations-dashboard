import type { ParamsType, ProTableProps } from "@ant-design/pro-components";

import type { TablePaginationConfig } from "antd";
import type { CSSProperties, ReactNode } from "react";

import ContractFilterSearchIcon from "#src/assets/svg/header/contract-filter-search.svg?react";
import TableHeaderIcon from "#src/assets/svg/header/table.svg?react";
import { footerHeight as layoutFooterHeight } from "#src/layout/constants";

import { usePreferencesStore } from "#src/store";
import { cn, isObject, isUndefined } from "#src/utils";
import { DownOutlined, LoadingOutlined, UpOutlined } from "@ant-design/icons";
import { ProTable } from "@ant-design/pro-components";
import { useSize } from "ahooks";
import { ConfigProvider, theme } from "antd";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { BASIC_TABLE_ROOT_CLASS_NAME } from "./constants";
import { useStyles } from "./styles";

export interface BasicTableProps<D, U, V> extends ProTableProps<D, U, V> {
	/**
	 * @description ارتفاع ناحيه محتوا به صورت تطبيقي؛ اگر scroll.y تنظيم شود، تطبيقي انجام نمي شود
	 * @default false
	 */
	adaptive?: boolean | {
		/** فاصله جدول تا پايين صفحه، پيش فرض `16` */
		offsetBottom?: number
	}
	autoSearchDebounceTime?: number
	/** عنوان هدر فیلتر؛ در صورت عدم تعیین از headerTitle ساخته می‌شود */
	filterTitle?: string
	/** توضیح کوتاه هدر فیلتر */
	filterSubtitle?: string
	/** نمایش سربرگ فیلتر؛ برای جدول‌های بدون جستجو قابل غیرفعال‌سازی است */
	showFilterHeading?: boolean
	/** عنوان هدر جدول؛ در صورت عدم تعیین از headerTitle استفاده می‌شود */
	tableTitle?: ReactNode
	/** توضیح کوتاه هدر جدول */
	tableSubtitle?: ReactNode
	/** آیکن هدر جدول */
	tableIcon?: ReactNode
}

export function BasicTable<
	DataType extends Record<string, any>,
	Params extends ParamsType = ParamsType,
	ValueType = "text",
>(
	props: BasicTableProps<DataType, Params, ValueType>,
) {
	const classes = useStyles();
	const { token } = theme.useToken();
	const antdContext = useContext(ConfigProvider.ConfigContext);
	const configuredCardRadius = antdContext.theme?.components?.Card?.borderRadiusLG;
	const filterRadius = typeof configuredCardRadius === "number" ? configuredCardRadius : token.borderRadiusLG;
	const { t } = useTranslation();
	const { adaptive } = props;
	const filterTitle = props.filterTitle ?? (typeof props.headerTitle === "string" ? `جستجوی ${props.headerTitle}` : "جستجو");
	const filterSubtitle = props.filterSubtitle ?? "برای جستجو و فیلتر، معیارهای موردنظر را انتخاب کنید.";
	const showFilterHeading = props.showFilterHeading ?? true;
	const tableTitle = props.tableTitle ?? props.headerTitle ?? "لیست موارد";
	const tableSubtitle = props.tableSubtitle ?? "موارد ثبت‌شده را مشاهده و مدیریت کنید.";
	const tableIcon = props.tableIcon ?? <TableHeaderIcon />;
	const tableHeader = (
		<div className="basic-table-toolbar-heading">
			<span className="basic-table-toolbar-heading__icon" aria-hidden="true">{tableIcon}</span>
			<span className="basic-table-toolbar-heading__copy">
				<span className="basic-table-toolbar-heading__title">{tableTitle}</span>
				<span className="basic-table-toolbar-heading__subtitle">{tableSubtitle}</span>
			</span>
		</div>
	);
	const [filterCollapsed, setFilterCollapsed] = useState(false);
	const autoSearchDebounceTime = Math.max(0, props.autoSearchDebounceTime ?? 0);
	const tableWrapperRef = useRef<HTMLDivElement>(null);
	const size = useSize(tableWrapperRef);
	const {
		enableFooter,
		fixedFooter,
	} = usePreferencesStore();
	/**
	 * @description چرا در جدول پويا scrollY را initial تنظيم مي کنيم
	 * @see https://gist.github.com/condorheroblog/557c18c61084a1296b716bcb1203315e
	 */
	const [scrollY, setScrollY] = useState<number | string | undefined>(adaptive ? "initial" : undefined);
	const autoSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const getObjectRefCurrent = <T,>(ref: unknown): T | undefined => {
		if (!ref || typeof ref === "function" || typeof ref !== "object")
			return undefined;
		if (!("current" in ref))
			return undefined;
		return (ref as { current?: T | null }).current ?? undefined;
	};

	/**
	 * @description ارتفاع پابرگ ثابت
	 * اگر پابرگ فعال و ثابت باشد ارتفاع را برگردان، وگرنه 0
	 */
	const footerHeight = useMemo(() => {
		if (enableFooter && fixedFooter) {
			return layoutFooterHeight;
		}
		return 0;
	}, [enableFooter, fixedFooter]);

	const getPaginationProps = () => {
		if (props.pagination === false) {
			return false;
		}

		return {
			position: ["bottomRight"],
			defaultPageSize: 10,
			showQuickJumper: true,
			showSizeChanger: true,
			showTotal: total => t("common.pagination", { total }),
			...props.pagination,
		} satisfies TablePaginationConfig;
	};

	/**
	 * @description محاسبه ارتفاع صفحه بندي
	 * اگر pagination غيرفعال باشد 0 برمي گردد، وگرنه بر اساس اندازه ارتفاع را برمي گرداند
	 *
	 *
	 * نمي توان ارتفاع صفحه بندي را با DOM محاسبه کرد چون pagination يک زيرکامپوننت است
	 */
	const paginationHeight = useMemo(() => {
		const paginationProps = getPaginationProps();
		const isPaginationDisabled = paginationProps === false;
		if (isPaginationDisabled) {
			return 0;
		}
		else {
			if (paginationProps.size === "default") {
				// ارتفاع پيش فرض صفحه بندي 32px است
				return 32 + 16 + 16;
			}
			else {
				// ارتفاع صفحه بندي کوچک 24px است
				return 24 + 16 + 16;
			}
		}
	}, [getPaginationProps]);

	/**
	 * @description ارتفاع جدول به صورت تطبيقي
	 * اين يک hook است و منتظر اصلاح در antd
	 * @see https://github.com/ant-design/ant-design/issues/23974
	 */
	useEffect(() => {
		if (!isUndefined(props.scroll?.y)) {
			// اگر scroll.y تنظيم شده باشد، تطبيقي انجام نمي شود
			return;
		}

		if (adaptive && tableWrapperRef.current && size?.height) {
			const basicTable = tableWrapperRef.current.getElementsByClassName(BASIC_TABLE_ROOT_CLASS_NAME)[0];

			if (!basicTable)
				return;

			const tableWrapperRect = tableWrapperRef.current.getBoundingClientRect();

			// اگر جدول خارج از صفحه باشد، تطبيقي انجام نمي شود
			if (tableWrapperRect.top > window.innerHeight) {
				return;
			}

			const tableBody = basicTable.querySelector("div.ant-table-body");

			if (!tableBody)
				return;

			// گرفتن مرزهاي عنصر
			const tableBodyRect = tableBody.getBoundingClientRect();

			// 16 مقدار padding در BasicContent است
			const offsetBottom = isObject(adaptive) ? (adaptive.offsetBottom ?? 16) : 16;

			const realOffsetBottom = offsetBottom + paginationHeight + footerHeight;

			const bodyHeight = window.innerHeight - tableBodyRect.top - realOffsetBottom;
			/**
			 * @fa scroll.y مقدار max-height را تنظيم مي کند، پس بايد height را دستي تنظيم کرد
			 * @en scroll.y sets the max-height, so we need to set the height manually
			 */
			tableBody.setAttribute("style", `overflow-y: auto;min-height: ${bodyHeight}px;max-height: ${bodyHeight}px;`);
			setScrollY(bodyHeight);
		}
	}, [size, adaptive, paginationHeight, footerHeight, props.scroll?.y]);

	useEffect(() => {
		return () => {
			if (autoSearchTimerRef.current) {
				clearTimeout(autoSearchTimerRef.current);
				autoSearchTimerRef.current = null;
			}
		};
	}, []);

	const getLoadingProps = () => {
		if (props.loading === false) {
			return false;
		}
		if (props.loading === true) {
			return true;
		}
		return {
			indicator: <LoadingOutlined spin />,
			...props.loading,
		};
	};

	const getSearchProps = () => {
		if (props.search === false) {
			return false;
		}

		return {
			filterType: "query" as const,
			searchGutter: [16, 16] as [number, number],
			labelWidth: "auto" as const,
			span: 8,
			layout: "vertical" as const,
			defaultCollapsed: false,
			...props.search,
			collapsed: false,
			collapseRender: () => null,
		};
	};

	const getFormProps = () => {
		const originalFormProps = props.form ?? {};
		if (props.search === false) {
			return originalFormProps;
		}

		return {
			...originalFormProps,
			onValuesChange: (changedValues: any, allValues: any) => {
				originalFormProps.onValuesChange?.(changedValues, allValues);

				if (autoSearchTimerRef.current) {
					clearTimeout(autoSearchTimerRef.current);
					autoSearchTimerRef.current = null;
				}

				autoSearchTimerRef.current = setTimeout(() => {
					const formInstance = getObjectRefCurrent<{ submit?: () => void }>(props.formRef);
					if (formInstance?.submit) {
						formInstance.submit();
						return;
					}

					const actionInstance = getObjectRefCurrent<{ reload?: () => void }>(props.actionRef);
					actionInstance?.reload?.();
				}, autoSearchDebounceTime);
			},
		};
	};

	return (
		<div
			className={cn("basic-table-shell h-full", filterCollapsed && "basic-table-shell--collapsed")}
			ref={tableWrapperRef}
			style={{
				"--basic-table-filter-title": JSON.stringify(filterTitle),
				"--basic-table-filter-subtitle": JSON.stringify(filterSubtitle),
				"--basic-table-filter-margin": `${token.marginLG}px`,
				"--basic-table-filter-padding": `${token.paddingLG}px`,
				"--basic-table-filter-padding-top": `${token.paddingLG + token.controlHeightLG + token.marginSM}px`,
				"--basic-table-filter-border": `${token.lineWidth}px solid ${token.colorBorderSecondary}`,
				"--basic-table-filter-radius": `${filterRadius}px`,
				"--basic-table-filter-background": token.colorBgContainer,
				"--basic-table-filter-shadow": token.boxShadowTertiary,
				"--basic-table-filter-heading": token.colorTextHeading,
				"--basic-table-filter-secondary": token.colorTextTertiary,
				"--basic-table-filter-text": token.colorText,
				"--basic-table-filter-split": token.colorSplit,
				"--basic-table-filter-fill": token.colorFillSecondary,
				"--basic-table-filter-primary": token.colorPrimary,
				"--basic-table-filter-primary-bg": token.colorPrimaryBg,
				"--basic-table-filter-control-radius": `${token.borderRadius}px`,
				"--basic-table-filter-line-width": `${token.lineWidth}px`,
				"--basic-table-filter-dash-length": `${Math.max(token.sizeXS - token.lineWidthBold, 1)}px`,
				"--basic-table-filter-dash-gap": `${token.paddingXXS}px`,
				"--basic-table-filter-label-weight": token.fontWeightStrong,
				"--basic-table-border": `${token.lineWidth}px solid ${token.colorBorderSecondary}`,
				"--basic-table-radius": `${filterRadius}px`,
				"--basic-table-background": token.colorBgContainer,
				"--basic-table-header-background": `color-mix(in srgb, ${token.colorBgContainer} 88%, ${token.colorPrimary} 12%)`,
				"--basic-table-header-color": token.colorTextHeading,
				"--basic-table-row-background": token.colorBgContainer,
				"--basic-table-row-hover": token.colorFillTertiary,
				"--basic-table-split": token.colorSplit,
				"--basic-table-toolbar-padding": `${token.paddingMD}px`,
				"--basic-table-toolbar-gap": `${token.marginMD}px`,
				"--basic-table-heading-icon-size": `${token.controlHeightLG + token.paddingSM}px`,
				"--basic-table-heading-icon-radius": `${token.borderRadiusLG}px`,
				"--basic-table-heading-icon-background": `color-mix(in srgb, ${token.colorPrimary} 22%, ${token.colorBgContainer})`,
				"--basic-table-heading-icon-color": token.colorInfo,
				"--basic-table-heading-color": token.colorTextHeading,
				"--basic-table-subtitle-color": token.colorTextTertiary,
				"--basic-table-table-radius": `${filterRadius}px`,
				"--basic-table-cell-padding-inline": `${token.paddingMD}px`,
				"--basic-table-cell-padding-block": `${token.paddingSM}px`,
			} as CSSProperties}
		>
			{showFilterHeading && (
				<div
					className="basic-table-filter-heading"
					role="button"
					tabIndex={0}
					aria-expanded={!filterCollapsed}
					onClick={() => setFilterCollapsed(current => !current)}
					onKeyDown={(event) => {
						if (event.key === "Enter" || event.key === " ") {
							event.preventDefault();
							setFilterCollapsed(current => !current);
						}
					}}
				>
					<span className="basic-table-filter-heading__icon"><ContractFilterSearchIcon /></span>
					<div className="basic-table-filter-heading__copy">
						<div className="basic-table-filter-heading__title">{filterTitle}</div>
						<div className="basic-table-filter-heading__subtitle">{filterSubtitle}</div>
					</div>
					<button
						type="button"
						className="basic-table-filter-toggle"
						aria-label={filterCollapsed ? "باز کردن فیلترها" : "بستن فیلترها"}
						aria-expanded={!filterCollapsed}
						onClick={(event) => {
							event.stopPropagation();
							setFilterCollapsed(current => !current);
						}}
					>
						{filterCollapsed ? <DownOutlined /> : <UpOutlined />}
					</button>
				</div>
			)}
			<ProTable
				cardBordered
				rowKey="id"
				dateFormatter="string"
				{...props}
				headerTitle={tableHeader}
				options={{
					fullScreen: true,
					...props.options,
				}}
				rootClassName={cn(BASIC_TABLE_ROOT_CLASS_NAME, props.rootClassName)}
				className={cn(classes.basicTable, props.className)}
				tableClassName={cn("basic-table-grid", props.tableClassName)}
				scroll={{ y: scrollY, x: "max-content", ...props.scroll }}
				loading={getLoadingProps()}
				pagination={getPaginationProps()}
				search={getSearchProps()}
				form={getFormProps()}
				expandable={{
					// expandIcon: ({ expanded, onExpand, record }) => {
					// 	return expanded
					// 		? (
					// 			<RightOutlined onClick={e => onExpand(record, e)} />
					// 		)
					// 		: (
					// 			<DownOutlined onClick={e => onExpand(record, e)} />
					// 		);
					// },
					...props.expandable,
				}}
			/>
		</div>
	);
}
