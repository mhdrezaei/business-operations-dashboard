import type { ButtonProps } from "antd";
import type { CSSProperties } from "react";

import SunIcon from "#src/assets/svg/header/sun.svg?react";
import MoonIcon from "#src/assets/svg/header/theme.svg?react";
import { BasicButton } from "#src/components";
import { usePreferences } from "#src/hooks";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect } from "react";
import { flushSync } from "react-dom";

const isBrowser = typeof window !== "undefined";
function injectViewTransitionStyles() {
	if (isBrowser) {
		const styleId = "theme-switch-view-transition-styles";
		if (!document.getElementById(styleId)) {
			const style = document.createElement("style");
			style.id = styleId;
			style.textContent = `
        html.stop-transition * {
          transition: none !important;
        }
        ::view-transition-old(root),
        ::view-transition-new(root) {
          animation: none;
          mix-blend-mode: normal;
        }
        ::view-transition-old(root),
        .dark::view-transition-new(root) {
          z-index: 999999999;
        }
        ::view-transition-new(root),
        .dark::view-transition-old(root) {
          z-index: 1;
        }
        ::view-transition-group(theme-toggle-icon) {
          z-index: 1000000000;
          animation: none;
        }
        ::view-transition-image-pair(theme-toggle-icon) {
          overflow: visible;
        }
        html.dark::view-transition-old(theme-toggle-icon) {
          animation: theme-moon-orbit-out 220ms cubic-bezier(0.7, 0, 1, 0.5) both;
        }
        html.dark::view-transition-new(theme-toggle-icon) {
          animation: theme-sun-burst-in 480ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        html:not(.dark)::view-transition-old(theme-toggle-icon) {
          animation: theme-sun-collapse-out 220ms cubic-bezier(0.7, 0, 1, 0.5) both;
        }
        html:not(.dark)::view-transition-new(theme-toggle-icon) {
          animation: theme-moon-orbit-in 420ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes theme-moon-orbit-out {
          to {
            opacity: 0;
            filter: blur(5px);
            transform: translate(-10px, 7px) rotate(-48deg) scale(0.25);
          }
        }
        @keyframes theme-sun-burst-in {
          0% {
            opacity: 0;
            filter: blur(7px) brightness(1.8);
            transform: rotate(-150deg) scale(0.15);
          }
          68% {
            opacity: 1;
            filter: blur(0) brightness(1.25);
            transform: rotate(9deg) scale(1.18);
          }
          100% {
            opacity: 1;
            filter: blur(0) brightness(1);
            transform: rotate(0) scale(1);
          }
        }
        @keyframes theme-sun-collapse-out {
          to {
            opacity: 0;
            filter: blur(5px) brightness(1.5);
            transform: rotate(105deg) scale(0.2);
          }
        }
        @keyframes theme-moon-orbit-in {
          0% {
            opacity: 0;
            filter: blur(6px);
            transform: translate(10px, -7px) rotate(52deg) scale(0.3);
          }
          72% {
            opacity: 1;
            filter: blur(0);
            transform: translate(-1px, 1px) rotate(-5deg) scale(1.08);
          }
          100% {
            opacity: 1;
            filter: blur(0);
            transform: translate(0) rotate(0) scale(1);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          ::view-transition-old(theme-toggle-icon),
          ::view-transition-new(theme-toggle-icon) {
            animation: none !important;
          }
        }
      `;

			document.head.appendChild(style);
		}
	}
}

function ThemeToggleIcon({ isDark }: { isDark: boolean }) {
	const prefersReducedMotion = useReducedMotion();
	const usesViewTransition = isBrowser && !!document.startViewTransition && !prefersReducedMotion;

	if (usesViewTransition) {
		return (
			<span
				className="relative inline-flex size-6 items-center justify-center"
				style={{ viewTransitionName: "theme-toggle-icon" } as CSSProperties}
				aria-hidden
			>
				{isDark ? <SunIcon className="size-6" /> : <MoonIcon className="size-6" />}
			</span>
		);
	}

	return (
		<span className="relative inline-flex size-6 items-center justify-center" aria-hidden>
			<AnimatePresence initial={false} mode="sync">
				<motion.span
					key={isDark ? "sun" : "moon"}
					className="absolute inset-0 inline-flex items-center justify-center"
					initial={prefersReducedMotion
						? { opacity: 0 }
						: isDark
							? { opacity: 0, rotate: -140, scale: 0.2, filter: "blur(6px)" }
							: { opacity: 0, x: 9, y: -6, rotate: 45, scale: 0.35, filter: "blur(5px)" }}
					animate={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1, filter: "blur(0px)" }}
					exit={prefersReducedMotion
						? { opacity: 0 }
						: isDark
							? { opacity: 0, rotate: 100, scale: 0.2, filter: "blur(5px)" }
							: { opacity: 0, x: -9, y: 6, rotate: -45, scale: 0.25, filter: "blur(5px)" }}
					transition={prefersReducedMotion
						? { duration: 0.12 }
						: { type: "spring", stiffness: 420, damping: 27, mass: 0.65 }}
				>
					{isDark ? <SunIcon className="size-6" /> : <MoonIcon className="size-6" />}
				</motion.span>
			</AnimatePresence>
		</span>
	);
}

/**
 * @fa کامپوننت تغيير تم
 * به کاربر اجازه مي دهد با دکمه بين تم روشن و تيره جابجا شود
 *
 * @en Theme Button Component
 * Allows users to toggle between light and dark themes of the website via a button
 */
export function ThemeButton({ ...restProps }: ButtonProps) {
	const { isDark, changeSiteTheme } = usePreferences();

	useEffect(() => {
		injectViewTransitionStyles();
	}, []);

	function toggleTheme(event: React.PointerEvent<HTMLElement>) {
		const isAppearanceTransition = !!document.startViewTransition && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		if (!isAppearanceTransition || !event) {
			changeSiteTheme(isDark ? "light" : "dark");
			return;
		}
		const x = event.clientX;
		const y = event.clientY;
		const endRadius = Math.hypot(
			Math.max(x, innerWidth - x),
			Math.max(y, innerHeight - y),
		);
		const transition = document.startViewTransition(() => {
			// eslint-disable-next-line react-dom/no-flush-sync
			flushSync(() => {
				changeSiteTheme(isDark ? "light" : "dark");
			});
		});
		transition.ready.then(() => {
			const clipPath = [
				`circle(0px at ${x}px ${y}px)`,
				`circle(${endRadius}px at ${x}px ${y}px)`,
			];
			document.documentElement.animate(
				{
					clipPath: isDark ? [...clipPath].reverse() : clipPath,
				},
				{
					duration: 500,
					easing: "ease-in",
					pseudoElement: isDark
						? "::view-transition-old(root)"
						: "::view-transition-new(root)",
				},
			);
		});
	}

	return (
		<BasicButton
			type="text"
			{...restProps}
			aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
			icon={<ThemeToggleIcon isDark={isDark} />}
			onPointerDown={(e) => {
				restProps?.onPointerDown?.(e);
				toggleTheme(e);
			}}
		/>
	);
}
