import type { ContractFormValues } from "../../../shared/model/contract.form.types";
import React from "react";
import { useFormContext, useWatch } from "react-hook-form";

/** جمع ۱۰۰ بودن دو سهم: فیلد مقصد خودکار (۱۰۰ منهای فیلد مبدأ) محاسبه می‌شود و فقط‌خواندنی است. */
export function usePartnerShareSync(sourcePath: string, targetPath: string) {
	const { control, setValue } = useFormContext<ContractFormValues>();
	const sourceShare = useWatch({ control, name: sourcePath as any });
	const previousShare = React.useRef(sourceShare);

	React.useEffect(() => {
		if (sourceShare === previousShare.current)
			return;
		previousShare.current = sourceShare;
		const share = sourceShare == null || sourceShare === "" ? null : Number(sourceShare);
		setValue(targetPath as any, share != null && Number.isFinite(share) && share >= 0 && share <= 100 ? 100 - share : null, { shouldDirty: true, shouldValidate: true });
	}, [sourceShare, targetPath, setValue]);
}
