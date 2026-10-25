import type { TelecomFrameDirectoryEntryDto } from "#src/features/contract/api/telecom-frame.api";
import type { MasterDataFormValues, MasterDataLevel, MasterDataTab } from "../model/telecom-frame-master-data.schema";
import { BasicContent } from "#src/components";
import { isTelecomFrameCode } from "#src/features/contract/shared/services/telecom-frame/telecom-frame.types";
import { useAccess } from "#src/hooks";
import { useUserStore } from "#src/store";
import { Segmented, Typography } from "antd";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { MASTER_DATA_LEVELS, toMasterDataPayload } from "../model/telecom-frame-master-data.schema";
import { useMasterDataList, useMasterDataMutations } from "../queries/telecom-frame-master-data.queries";
import { MasterDataColumn } from "./components/MasterDataColumn";
import { MasterDataFormModal } from "./components/MasterDataFormModal";

type Selection = Partial<Record<MasterDataLevel, number | null>>;

const TAB_LEVELS: Record<MasterDataTab, MasterDataLevel[]> = {
	bo: ["department", "generalOffice", "boPerson"],
	po: ["division", "poPerson"],
};

function useLevel(level: MasterDataLevel, selection: Selection) {
	const config = MASTER_DATA_LEVELS[level];
	const parentId = config.parent ? selection[config.parent.level] ?? null : null;
	const ready = !config.parent || parentId != null;
	const list = useMasterDataList(config.resource, config.parent && parentId != null ? { [config.parent.field]: parentId } : {}, ready);
	return { config, parentId, ready, items: ready ? list.data ?? [] : [], loading: ready && list.isFetching, mutations: useMasterDataMutations(config.resource) };
}

/** BO (department / general office / person) and PO (division / person) records of the telecom-frame contract service. */
export default function TelecomFrameMasterDataPage() {
	const { t } = useTranslation();
	const { getPermittedCompanyTypes } = useAccess();
	const services = useUserStore(state => state.services) ?? [];
	const [tab, setTab] = useState<MasterDataTab>("bo");
	const [selection, setSelection] = useState<Selection>({});
	const [modal, setModal] = useState<{ level: MasterDataLevel, record: TelecomFrameDirectoryEntryDto | null } | null>(null);

	const levels = {
		department: useLevel("department", selection),
		generalOffice: useLevel("generalOffice", selection),
		boPerson: useLevel("boPerson", selection),
		division: useLevel("division", selection),
		poPerson: useLevel("poPerson", selection),
	};

	const permittedCompanyTypes = useMemo(() => {
		const serviceId = services.find(service => isTelecomFrameCode(service.code))?.id;
		const types = new Map<string, string>();
		(["create", "update"] as const).forEach((action) => {
			getPermittedCompanyTypes("contracts", action, serviceId).forEach(type => types.set(type.key, type.value));
		});
		return types;
	}, [services, getPermittedCompanyTypes]);

	const companyTypeOptionsFor = (level: MasterDataLevel) => {
		const parent = MASTER_DATA_LEVELS[level].parent;
		const parentEntry = parent ? levels[parent.level].items.find(item => item.id === selection[parent.level]) : null;
		const codes = parent ? parentEntry?.company_types ?? [] : [...permittedCompanyTypes.keys()];
		return codes.map(code => ({ label: permittedCompanyTypes.get(code) ?? code, value: code }));
	};

	const select = (level: MasterDataLevel, id: number | null) => {
		const children = (Object.keys(MASTER_DATA_LEVELS) as MasterDataLevel[]).filter(candidate => MASTER_DATA_LEVELS[candidate].parent?.level === level);
		setSelection(current => ({ ...current, [level]: id, ...Object.fromEntries(children.map(child => [child, null])) }));
	};

	const submit = async (values: MasterDataFormValues) => {
		if (!modal)
			return;
		const { config, parentId, mutations } = levels[modal.level];
		await mutations.save.mutateAsync({
			id: modal.record?.id,
			payload: { ...toMasterDataPayload(values, config.isPerson), ...(config.parent && parentId != null ? { [config.parent.field]: parentId } : {}) },
		});
		window.$message?.success(t("telecomFrameMasterData.saved"));
		setModal(null);
	};

	const remove = async (level: MasterDataLevel, item: TelecomFrameDirectoryEntryDto) => {
		await levels[level].mutations.remove.mutateAsync(item.id);
		if (selection[level] === item.id)
			select(level, null);
		window.$message?.success(t("telecomFrameMasterData.deleted"));
	};

	const levelTitle = (level: MasterDataLevel) => level === "boPerson" || level === "poPerson"
		? t("telecomFrameMasterData.people")
		: t(`telecomFrameMasterData.levels.${MASTER_DATA_LEVELS[level].titleKey}`);

	return (
		<BasicContent className="h-full !overflow-y-auto">
			<div className="flex flex-col gap-4">
				<div>
					<Typography.Title level={3} className="!mb-1">{t("telecomFrameMasterData.title")}</Typography.Title>
					<Typography.Text type="secondary">{t("telecomFrameMasterData.subtitle")}</Typography.Text>
				</div>
				<Segmented<MasterDataTab> value={tab} onChange={setTab} options={[{ label: "BO", value: "bo" }, { label: "PO", value: "po" }]} />
				<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
					{TAB_LEVELS[tab].map((level) => {
						const { items, loading, ready } = levels[level];
						const hasChildren = Object.values(MASTER_DATA_LEVELS).some(candidate => candidate.parent?.level === level);
						return (
							<MasterDataColumn
								key={level}
								title={levelTitle(level)}
								items={items}
								loading={loading}
								selectedId={selection[level]}
								addDisabled={!ready}
								onSelect={hasChildren ? id => select(level, id) : undefined}
								onAdd={() => setModal({ level, record: null })}
								onEdit={record => setModal({ level, record })}
								onDelete={item => remove(level, item)}
							/>
						);
					})}
				</div>
			</div>

			{modal && (
				<MasterDataFormModal
					title={`${modal.record ? t("telecomFrameMasterData.edit") : t("telecomFrameMasterData.add")} ${t(`telecomFrameMasterData.levels.${MASTER_DATA_LEVELS[modal.level].titleKey}`)}`}
					isPerson={MASTER_DATA_LEVELS[modal.level].isPerson}
					record={modal.record}
					companyTypeOptions={companyTypeOptionsFor(modal.level)}
					saving={levels[modal.level].mutations.save.isPending}
					onSubmit={submit}
					onClose={() => setModal(null)}
				/>
			)}
		</BasicContent>
	);
}
