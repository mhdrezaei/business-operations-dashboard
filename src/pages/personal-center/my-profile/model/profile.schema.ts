import { z } from "zod";

export const baseSchema = z.object({
	email: z.email().nullable(),
	username: z.string().nullable(),
	firstName: z.string().nullable(),
	lastName: z.string().nullable(),
	mobile: z.string().nullable(),
	nationalCode: z.string().nullable(),
});
