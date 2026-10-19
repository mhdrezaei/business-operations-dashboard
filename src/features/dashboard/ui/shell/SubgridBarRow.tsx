import type { KeyboardEvent, ReactNode } from "react";
import { useEffect, useState } from "react";

/** Subgrid row that scales up on hover/focus (approval matrix, rate rows). */
export const SUBGRID_ROW_MOTION = "transition-[transform,background-color,box-shadow] duration-200 ease-out motion-reduce:transition-none";
export const SUBGRID_ROW_INTERACTIVE = "cursor-pointer hover:z-10 hover:scale-[1.025] hover:bg-colorFillQuaternary hover:shadow-md focus-visible:z-10 focus-visible:scale-[1.025] focus-visible:bg-colorFillQuaternary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primaryText motion-reduce:hover:scale-100";

interface SubgridBarRowProps {
	label: ReactNode
	/** Bar fill, 0..100. */
	percent: number
	color: string
	value: ReactNode
	indent?: boolean
	/** Makes the row a button (hover lift + keyboard); without it the row is static. */
	onOpen?: () => void
	/** The bar starts empty and grows to its value after mount. */
	grow?: boolean
}

/**
 * Row of the rate / unregistered cards. It is a subgrid item of the card's outer grid (not a grid per row), so the
 * service-name column has the same width in all rows and the bars line up.
 */
export function SubgridBarRow({ label, percent, color, value, indent = false, onOpen, grow = false }: SubgridBarRowProps) {
	// Two nested frames so the transition from zero is really painted.
	const [grown, setGrown] = useState(!grow);
	useEffect(() => {
		if (!grow)
			return undefined;
		const frame = requestAnimationFrame(() => requestAnimationFrame(() => setGrown(true)));
		return () => cancelAnimationFrame(frame);
	}, [grow]);

	const onKeyDown = onOpen
		? (e: KeyboardEvent) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				onOpen();
			}
		}
		: undefined;

	return (
		// subgrid: the row is a real box (it can scale / highlight) while its columns are the outer grid's columns.
		<div
			role={onOpen ? "button" : undefined}
			tabIndex={onOpen ? 0 : undefined}
			onClick={onOpen}
			onKeyDown={onKeyDown}
			className={`grid grid-cols-subgrid col-span-3 items-center relative rounded-lg ${SUBGRID_ROW_MOTION} ${
				onOpen
					? SUBGRID_ROW_INTERACTIVE
					: ""
			}`}
		>
			<span className={`flex items-center gap-1.5 whitespace-nowrap text-[12.5px] py-1.5 ps-2 ${indent ? "!ps-5" : ""}`}>{label}</span>
			<span className="block h-[7px] rounded-full bg-colorFillSecondary overflow-hidden">
				<span
					className={`block h-full rounded-full transition-[width] duration-[900ms] ${grow ? "ease-out" : ""}`}
					style={{ width: `${grown ? percent : 0}%`, background: color }}
				/>
			</span>
			<span className="whitespace-nowrap text-[12.5px] text-colorTextSecondary py-1.5 pe-2">{value}</span>
		</div>
	);
}
