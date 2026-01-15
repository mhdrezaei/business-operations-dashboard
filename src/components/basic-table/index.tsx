import type { ParamsType, ProTableProps } from "@ant-design/pro-components";

import type { TablePaginationConfig } from "antd";

import { footerHeight as layoutFooterHeight } from "#src/layout/constants";
import { usePreferencesStore } from "#src/store";
import { cn, isObject, isUndefined } from "#src/utils";

import { LoadingOutlined } from "@ant-design/icons";
import { ProTable } from "@ant-design/pro-components";
import { useSize } from "ahooks";
import { useEffect, useMemo, useRef, useState } from "react";
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
}

export function BasicTable<
	DataType extends Record<string, any>,
	Params extends ParamsType = ParamsType,
	ValueType = "text",
>(
	props: BasicTableProps<DataType, Params, ValueType>,
) {
	const classes = useStyles();
	const { t } = useTranslation();
	const { adaptive } = props;
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
			...props.search,
		};
	};

	return (
		<div className="h-full" ref={tableWrapperRef}>
			<ProTable
				cardBordered
				rowKey="id"
				dateFormatter="string"
				{...props}
				options={{
					fullScreen: true,
					...props.options,
				}}
				rootClassName={cn(BASIC_TABLE_ROOT_CLASS_NAME, props.rootClassName)}
				className={cn(classes.basicTable, props.className)}
				scroll={{ y: scrollY, x: "max-content", ...props.scroll }}
				loading={getLoadingProps()}
				pagination={getPaginationProps()}
				search={getSearchProps()}
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
