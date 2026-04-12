import type { CompanyDto } from "#src/api/common/common.types.js";
import type { PerformanceServicePath } from "#src/features/performance/api/performances.api";
import type { PerformanceListRow } from "../../model/performance.list.types";
import { PerformanceDetailModal as BasePerformanceDetailModal } from "#src/features/performance/list/ui/components/PerformanceDetailModal";

interface Props {
	open: boolean
	service: PerformanceServicePath | null
	companies: CompanyDto[] | undefined
	record: PerformanceListRow | null
	onClose: () => void
	onUpdated?: () => void
}

export function PerformanceDetailModal(props: Props) {
	return <BasePerformanceDetailModal {...props} mode="unregistered" />;
}
