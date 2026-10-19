import type { ComponentType, ReactNode, SVGProps } from "react";
import { prefersReducedMotion } from "#src/features/dashboard/model/navigation";
import { RiCloseLine, RiFullscreenExitLine, RiFullscreenLine, RiTable2 } from "#src/features/dashboard/ui/icons";
import { Button, Tooltip } from "antd";
import { createContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useDashboardBorderStyle } from "../shell/dashboard-border";

const ANIM_MS = 280;

/** PagerBar renders into the fixed modal footer through this context, not inside the scroll area. */
export const ModalFooterContext = createContext<{ el: HTMLElement | null } | null>(null);
/** true in fullscreen; lists with a capped height fill the extra space. */
export const ModalFullContext = createContext(false);

export interface DashboardModalProps {
	isOpen: boolean
	onClose: () => void
	title: ReactNode
	children: ReactNode
	/** Tailwind max-width class in the normal (non-fullscreen) state. */
	maxWidth?: string
	icon?: ComponentType<SVGProps<SVGSVGElement>>
	/** Counter text next to the title (e.g. "218 items"). */
	count?: ReactNode
	crumbs?: string[]
}

interface ModalView {
	title: ReactNode
	children: ReactNode
	count: ReactNode
	crumbs?: string[]
}

/**
 * Drill-down popup of the dashboard: animated open/close with a blurred backdrop, fullscreen toggle, Esc to close,
 * header with icon/title/counter/breadcrumb and a fixed footer for the pager.
 */
export function DashboardModal({
	isOpen,
	onClose,
	title,
	children,
	maxWidth = "max-w-4xl",
	icon: Icon = RiTable2,
	count = null,
	crumbs,
}: DashboardModalProps) {
	const { t } = useTranslation();
	const borderStyle = useDashboardBorderStyle();
	// mounted: stays in the DOM until the close animation ends; shown: the open state (enter/leave transition).
	const [mounted, setMounted] = useState(isOpen);
	const [shown, setShown] = useState(false);
	const [full, setFull] = useState(false);
	const [footerEl, setFooterEl] = useState<HTMLElement | null>(null);
	// The last content is kept so it does not jump while the leave animation plays with emptied props.
	const snapshot = useRef<ModalView>({ title, children, count, crumbs });
	if (isOpen)
		snapshot.current = { title, children, count, crumbs };

	useEffect(() => {
		if (isOpen) {
			setMounted(true);
			let inner = 0;
			const outer = requestAnimationFrame(() => {
				inner = requestAnimationFrame(() => setShown(true));
			});
			return () => {
				cancelAnimationFrame(outer);
				cancelAnimationFrame(inner);
			};
		}
		setShown(false);
		const timer = setTimeout(() => {
			setMounted(false);
			setFull(false);
		}, prefersReducedMotion() ? 0 : ANIM_MS);
		return () => clearTimeout(timer);
	}, [isOpen]);

	useEffect(() => {
		if (!mounted)
			return undefined;
		const { body } = document;
		const previousOverflow = body.style.overflow;
		body.style.overflow = "hidden";
		return () => {
			body.style.overflow = previousOverflow;
		};
	}, [mounted]);

	useEffect(() => {
		if (!isOpen)
			return undefined;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape")
				onClose();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [isOpen, onClose]);

	if (!mounted)
		return null;
	const view = isOpen ? { title, children, count, crumbs } : snapshot.current;
	const fullLabel = full ? t("dashboard.modal.exitFullscreen") : t("dashboard.modal.fullscreen");

	// Portal to body: transforms of hovered cards around must not affect position: fixed.
	return createPortal(
		<div
			role="dialog"
			aria-modal="true"
			style={borderStyle}
			className={`fixed inset-0 z-[1000] flex items-center justify-center transition-[padding] duration-300 ${full ? "p-3" : "p-4 md:px-6 md:py-8"}`}
		>
			<div
				className={`absolute inset-0 bg-colorBgMask backdrop-blur-[6px] transition-opacity duration-300 ease-out motion-reduce:transition-none ${shown ? "opacity-100" : "opacity-0"}`}
				onClick={onClose}
				aria-hidden="true"
			/>
			<div
				className={`relative flex flex-col w-full ${full ? "max-w-full h-full max-h-full rounded-xl" : `${maxWidth} max-h-full rounded-[18px]`} overflow-hidden border border-solid border-[var(--dash-border)] bg-colorBgElevated backdrop-blur-xl text-colorText shadow-2xl transition-[opacity,transform,max-width,border-radius] duration-[380ms] ease-[cubic-bezier(.2,.9,.25,1.05)] motion-reduce:transition-none ${
					shown ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-[.965] translate-y-[18px]"
				}`}
			>
				<div className="flex items-center gap-3 px-5 pt-4 pb-3.5 border-0 border-b border-solid border-[var(--dash-border)]">
					<span className="grid place-items-center w-10 h-10 rounded-[11px] shrink-0 bg-primaryBg text-primaryText text-xl">
						<Icon />
					</span>
					<div className="flex flex-col gap-1.5 min-w-0 flex-1">
						<div className="flex items-center gap-2 flex-wrap">
							<h3 className="m-0 text-base font-semibold text-colorText">{view.title}</h3>
							{view.count != null && (
								<span className="text-[12px] px-2.5 py-px rounded-full whitespace-nowrap tabular-nums bg-colorFillSecondary text-colorTextSecondary">
									{view.count}
								</span>
							)}
						</div>
						{!!view.crumbs?.length && (
							<div className="flex items-center gap-1 flex-wrap">
								{view.crumbs.map((crumb, i) => (
									<span key={`${crumb}-${i}`} className="flex items-center gap-1">
										<span className="text-[11.5px] px-2 py-px rounded-md border border-solid border-[var(--dash-border)] text-colorTextSecondary whitespace-nowrap">{crumb}</span>
										{i < view.crumbs!.length - 1 && <span className="text-[10px] text-colorTextTertiary">‹</span>}
									</span>
								))}
							</div>
						)}
					</div>
					<div className="flex items-center gap-1 shrink-0">
						<Tooltip title={fullLabel}>
							<Button type="text" aria-label={fullLabel} icon={full ? <RiFullscreenExitLine /> : <RiFullscreenLine />} onClick={() => setFull(f => !f)} />
						</Tooltip>
						<Tooltip title={t("dashboard.modal.closeEsc")}>
							<Button type="text" danger aria-label={t("dashboard.modal.close")} icon={<RiCloseLine />} onClick={onClose} />
						</Tooltip>
					</div>
				</div>

				<div className={`dash-scroll flex-1 min-h-0 overflow-y-auto px-5 py-4 ${full ? "" : "max-h-[calc(100vh-170px)]"}`}>
					<ModalFullContext.Provider value={full}>
						<ModalFooterContext.Provider value={{ el: footerEl }}>{view.children}</ModalFooterContext.Provider>
					</ModalFullContext.Provider>
				</div>

				<div className="dash-modal-footer flex items-center gap-3 flex-wrap px-5 py-3 border-0 border-t border-solid border-[var(--dash-border)]">
					<div ref={setFooterEl} className="contents" />
					<span className="hidden md:flex items-center gap-1.5 text-[11.5px] text-colorTextTertiary ms-auto [.dash-modal-footer:has(.dash-pager)_&]:ms-0">
						<kbd className="font-[inherit] text-[11px] px-1.5 rounded-[5px] border border-solid border-[var(--dash-border)] bg-colorFillQuaternary">Esc</kbd>
						{t("dashboard.modal.close")}
					</span>
				</div>
			</div>
		</div>,
		document.body,
	);
}
