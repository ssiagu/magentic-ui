import { z } from "zod";

export const FilterOptionsSchema = z.object({
    selectedRuns: z.array(z.number()),
    scoreFilter: z.enum(['all', 'success', 'failure', 'partial']),
    categoryFilter: z.string(),
});

export type FilterOptions = z.infer<typeof FilterOptionsSchema>;

export * from "./analysis"
export * from "./api"
export * from "./run"
export * from "./task"