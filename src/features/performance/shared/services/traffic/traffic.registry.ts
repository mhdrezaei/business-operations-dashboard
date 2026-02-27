import { TrafficPerformanceFields } from "./traffic.fields";
import { trafficPerformanceSchema } from "./traffic.schema";

export const trafficPerformanceService = {
	code: "traffic",
	schema: trafficPerformanceSchema,
	Fields: TrafficPerformanceFields,
} as const;
