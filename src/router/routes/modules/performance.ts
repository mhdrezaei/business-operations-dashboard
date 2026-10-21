import type { AppRouteRecordRaw } from "#src/router/types";
import { SidebarPerformanceIcon } from "#src/icons/local-icons";
import { ContainerLayout } from "#src/layout";
import { $t } from "#src/locales";
import UnregisteredPerformancePage from "#src/pages/performances/unregistered.js";
import { performance } from "#src/router/extra-info";
import { BarChartOutlined, EditOutlined, FileAddOutlined, FileTextOutlined, FileUnknownOutlined, PieChartOutlined } from "@ant-design/icons";
import { LineChartOutlined } from "@ant-design/icons/lib";
import { createElement, lazy } from "react";

const CreatePerformancePage = lazy(() => import("#src/pages/performances/"));
const EditPerformancePage = lazy(() => import("#src/pages/performances/edit"));
const PerformanceReportPage = lazy(() => import("#src/pages/performances/report"));
const PredictionsSummaryReportPage = lazy(() => import("#src/pages/performances/predictions-summary-report"));
const SmsGatewayTrafficReportPage = lazy(() => import("#src/pages/performances/sms-gateway-traffic-report"));
const SmsGatewayOperatorInvoicesPage = lazy(() => import("#src/pages/performances/sms-gateway-operator-invoices"));

const routes: AppRouteRecordRaw[] = [
	{
		path: "/performances",
		Component: ContainerLayout,
		handle: {
			icon: createElement(SidebarPerformanceIcon),
			title: $t("common.menu.performanceManagement"),
			order: performance,
			accessDomain: "performances",
			accessAction: "view",
		},
		children: [
			{
				path: "/performances/new",
				Component: CreatePerformancePage,
				handle: {
					icon: createElement(FileAddOutlined),
					title: $t("common.menu.newPerformance"),
					accessDomain: "performances",
					accessAction: "create",
				},
			},
			{
				path: "/performances/edit",
				Component: EditPerformancePage,
				handle: {
					icon: createElement(EditOutlined),
					title: $t("common.menu.editPerformance"),
					accessDomain: "performances",
					accessAction: "update",
				},
			},
			{
				path: "/performances/unregistered",
				Component: UnregisteredPerformancePage,
				handle: {
					icon: createElement(FileUnknownOutlined),
					title: $t("common.menu.unregisteredPerformances"),
					accessDomain: "performances",
					accessAction: "view",
				},
			},
			{
				path: "/performances/report",
				Component: PerformanceReportPage,
				handle: {
					icon: createElement(BarChartOutlined),
					title: $t("common.menu.performanceReports"),
					accessDomain: "performances",
					accessAction: "view",
				},
			},
			{
				path: "/performances/report/predictions-summary",
				Component: PredictionsSummaryReportPage,
				handle: {
					icon: createElement(PieChartOutlined),
					title: $t("common.menu.predictionsSummaryReport"),
					accessDomain: "performances",
					accessAction: "view",
				},
			},
			{
				path: "/performances/sms-gateway/operator-invoices",
				Component: SmsGatewayOperatorInvoicesPage,
				handle: {
					icon: createElement(FileTextOutlined),
					title: $t("common.menu.smsGatewayOperatorInvoices"),
					accessDomain: "performances",
					accessAction: "view",
					serviceCode: "sms",
				},
			},
			{
				path: "/performances/sms-gateway/traffic-report",
				Component: SmsGatewayTrafficReportPage,
				handle: {
					icon: createElement(LineChartOutlined),
					title: $t("common.menu.smsGatewayTrafficReport"),
					accessDomain: "performances",
					accessAction: "view",
					serviceCode: "sms",
				},
			},
		],
	},
];

export default routes;
