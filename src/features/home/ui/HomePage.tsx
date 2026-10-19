import { BasicContent } from "#src/components";

import { HOME_CARDS } from "#src/features/home/model/home-cards";
import { HomeFinanceCard } from "./HomeFinanceCard";
import { HomeKpiStrip } from "./HomeKpiStrip";
import { HomeModuleCard } from "./HomeModuleCard";

/** Landing page: counters, shortcuts to the main modules and last month's financial summary. */
export function HomePage() {
	return (
		<BasicContent>
			<div className="flex flex-col gap-4">
				<HomeKpiStrip />
				<div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
					{HOME_CARDS.map(card => <HomeModuleCard key={card.key} card={card} />)}
				</div>
				<HomeFinanceCard />
			</div>
		</BasicContent>
	);
}
