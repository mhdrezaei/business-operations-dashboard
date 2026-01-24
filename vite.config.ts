/// <reference types="vitest/config" />

import process from "node:process";
import { cleanupSVG, isEmptyColor, parseColors, runSVGO, SVG } from "@iconify/tools";
import react from "@vitejs/plugin-react";
import { codeInspectorPlugin } from "code-inspector-plugin";
import dayjs from "dayjs";
import { FileSystemIconLoader } from "unplugin-icons/loaders";
import Icons from "unplugin-icons/vite";
import { defineConfig } from "vite";
import { checker } from "vite-plugin-checker";
import { vitePluginFakeServer } from "vite-plugin-fake-server";
import svgrPlugin from "vite-plugin-svgr";

import { author, dependencies, devDependencies, license, name, version } from "./package.json";

const __APP_INFO__ = {
	pkg: { dependencies, devDependencies, name, version, license, author },
	lastBuildTime: dayjs(new Date()).format("YYYY-MM-DD HH:mm:ss"),
};

const isDev = process.env.NODE_ENV === "development";

// https://vitejs.dev/config/
export default defineConfig({

	base: isDev ? "/" : "/react-antd-admin/",
	plugins: [
		react(),
		vitePluginFakeServer({
			basename: "/api",
			enableProd: true,
			timeout: 1000,
		}),
		// https://github.com/pd4d10/vite-plugin-svgr#options
		svgrPlugin({
			// https://react-svgr.com/docs/options/
			svgrOptions: {
				plugins: ["@svgr/plugin-svgo", "@svgr/plugin-jsx"],
				svgoConfig: {
					floatPrecision: 2,
				},
			},
		}),
		checker({
			typescript: true,
			terminal: false,
			enableBuild: false,
		}),

		codeInspectorPlugin({
			bundler: "vite",
			// hideConsole: true,
		}),

		Icons({
			customCollections: {
				svg: FileSystemIconLoader("./src/icons/svg"),
			},
			/**
			 * @see https://iconify.design/docs/articles/cleaning-up-icons/#parsing-one-monotone-icon
			 * Cleaning up icons
			 * Set default color to currentColor
			 * Set default width and height to 1em
			 */
			transform: (svg, collection) => {
				if (collection === "svg") {
					const svgObject = new SVG(svg);
					cleanupSVG(svgObject);
					runSVGO(svgObject);
					parseColors(svgObject, {
						defaultColor: "currentColor",
						callback: (attr, colorStr, color) => {
							if (!color) {
								// Color cannot be parsed!
								throw new Error(`Invalid color: "${colorStr}" in attribute ${attr}`);
							}

							if (isEmptyColor(color)) {
								// Color is empty: 'none' or 'transparent'. Return as is
								return color;
							}

							// If color is not empty, return it
							return color;
						},
					});
					return svgObject.toString({ height: "1em", width: "1em" });
				}
				return svg;
			},
			compiler: "jsx",
			jsx: "react",
			scale: 1,
		}),
	],
	test: {
		globals: true,
		environment: "happy-dom",
		setupFiles: ["./src/setupTests.ts"],
	},
	server: {
		port: 3333,
		// https://vitejs.dev/config/server-options#server-proxy
		proxy: {
			// "/api": {
			// 	target: "http://191.255.255.123:8888",
			// 	changeOrigin: true,
			// 	rewrite: path => isDev ? path.replace(/^\/api/, "") : path,
			// },
		},
	},
	define: {
		__APP_INFO__: JSON.stringify(__APP_INFO__),
	},
	build: {
		outDir: "build",
		sourcemap: false,
		rollupOptions: {
			output: {
				manualChunks: {
					react: ["react", "react-dom", "react-router"],
					antd: ["antd", "@ant-design/icons"],
					faker: ["@faker-js/faker"],
				},
			},
		},
	},
});
