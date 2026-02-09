import { TrafficFields } from "./traffic.fields";
import { trafficServiceFieldsSchema } from "./traffic.schema";

export const trafficService = {
	code: "traffic",
	schema: trafficServiceFieldsSchema,
	Fields: TrafficFields,
} as const;
