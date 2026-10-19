import type { HomeTone } from "#src/features/home/model/home-cards";
import type { ReactNode } from "react";
import { Card } from "antd";

import { useHomeTones } from "./home-tones";

interface HomeCardProps {
	tone: HomeTone
	icon: ReactNode
	title: ReactNode
	description?: ReactNode
	/** Header content opposite the title block (counters, tags). */
	extra?: ReactNode
	children: ReactNode
}

/** Frame of every home card: tinted icon box, title and description, then the content. */
export function HomeCard({ tone, icon, title, description, extra, children }: HomeCardProps) {
	const tones = useHomeTones();
	return (
		<Card className="h-full min-w-0" classNames={{ body: "flex flex-col gap-4" }}>
			<div className="flex items-center gap-4">
				<div
					className="grid place-items-center w-[50px] h-[50px] rounded-[10px] shrink-0 text-[28px]"
					style={{ color: tones[tone].color, background: tones[tone].soft }}
				>
					{icon}
				</div>
				<div className="flex flex-col gap-1 flex-1 min-w-0">
					<h3 className="m-0 text-base font-bold text-colorText">{title}</h3>
					{description && <p className="m-0 text-sm text-colorTextSecondary">{description}</p>}
				</div>
				{extra}
			</div>
			{children}
		</Card>
	);
}
