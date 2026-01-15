/**
 * @description ساخت داده با ساختار درختي
 * @param data منبع داده
 * @param id فيلد id، پيش فرض id
 * @param parentId فيلد والد، پيش فرض parentId
 * @param children فيلد فرزند، پيش فرض children
 * @returns درخت با فيلدهاي اضافه شده
 */
export function handleTree(data: any[], id?: string, parentId?: string, children?: string): any {
	if (!Array.isArray(data)) {
		console.warn("data must be an array");
		return [];
	}
	const config = {
		id: id || "id",
		parentId: parentId || "parentId",
		childrenList: children || "children",
	};

	const childrenListMap: any = {};
	const nodeIds: any = {};
	const tree = [];

	for (const d of data) {
		const parentId = d[config.parentId];
		if (childrenListMap[parentId] == null) {
			childrenListMap[parentId] = [];
		}
		nodeIds[d[config.id]] = d;
		childrenListMap[parentId].push(d);
	}

	for (const d of data) {
		const parentId = d[config.parentId];
		if (nodeIds[parentId] == null) {
			tree.push(d);
		}
	}

	for (const t of tree) {
		adaptToChildrenList(t);
	}

	function adaptToChildrenList(o: Record<string, any>) {
		if (childrenListMap[o[config.id]] !== null) {
			o[config.childrenList] = childrenListMap[o[config.id]];
		}
		if (o[config.childrenList]) {
			for (const c of o[config.childrenList]) {
				adaptToChildrenList(c);
			}
		}
	}
	return tree;
}

export interface TreeConfigOptions {
	// نام ويژگي فرزند، پيش فرض 'children'
	childProps: string
}

/**
 * @fa_CN پيمایش ساختار درختي و بازگرداندن مقادير مشخص شده از همه گره ها.
 * @param tree آرايه ساختار درختي
 * @param getValue تابع دريافت مقدار گره
 * @param options نام ويژگي اختياري براي آرايه فرزندها.
 * @returns آرايه مقادير مشخص شده در تمام گره ها
 */
export function traverseTreeValues<T, V>(
	tree: T[],
	getValue: (node: T) => V,
	options?: TreeConfigOptions,
): V[] {
	const result: V[] = [];
	const { childProps } = options || {
		childProps: "children",
	};

	const dfs = (treeNode: T) => {
		const value = getValue(treeNode);
		result.push(value);
		const children = (treeNode as Record<string, any>)?.[childProps];
		if (!children) {
			return;
		}
		if (children.length > 0) {
			for (const child of children) {
				dfs(child);
			}
		}
	};

	for (const treeNode of tree) {
		dfs(treeNode);
	}
	return result.filter(Boolean);
}

/**
 * فيلتر کردن گره هاي ساختار درخت بر اساس شرط و بازگرداندن آن ها با ترتيب اوليه.
 * @param tree آرايه گره هاي ريشه درخت براي فيلتر
 * @param filter شرط تطابق براي هر گره
 * @param options نام ويژگي اختياري براي آرايه فرزندها.
 * @returns آرايه شامل تمام گره هاي مطابق
 */
export function filterTree<T extends Record<string, any>>(
	tree: T[],
	filter: (node: T) => boolean,
	options?: TreeConfigOptions,
): T[] {
	const { childProps } = options || {
		childProps: "children",
	};

	const _filterTree = (nodes: T[]): T[] => {
		return nodes.filter((node: Record<string, any>) => {
			if (filter(node as T)) {
				if (node[childProps]) {
					node[childProps] = _filterTree(node[childProps]);
				}
				return true;
			}
			return false;
		});
	};

	return _filterTree(tree);
}

/**
 * نگاشت مجدد گره هاي ساختار درخت بر اساس شرط
 * @param tree آرايه گره هاي ريشه درخت براي نگاشت
 * @param mapper تابع نگاشت هر گره
 * @param options نام ويژگي اختياري براي آرايه فرزندها.
 */
export function mapTree<T, V extends Record<string, any>>(
	tree: T[],
	mapper: (node: T) => V,
	options?: TreeConfigOptions,
): V[] {
	const { childProps } = options || {
		childProps: "children",
	};
	return tree.map((node) => {
		const mapperNode: Record<string, any> = mapper(node);
		if (mapperNode[childProps]) {
			mapperNode[childProps] = mapTree(mapperNode[childProps], mapper, options);
		}
		return mapperNode as V;
	});
}
