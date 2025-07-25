// Type definitions for task analysis and message browsing

import { z } from 'zod';

import { TaskDataSchema } from "./task"
import { RunAnalysisSchema } from './analysis';

export const RunMetricsSchema = z.object({
    mean_score: z.number(),
    max_score: z.number(),
    num_tasks: z.number(),
    average_time: z.number(),
    scores: z.array(z.tuple([z.string(), z.string()])),
});

export const RunArgsSchema = z.object({
    mode: z.enum(['run', 'eval']),
    current_dir: z.string(),
    split: z.string(),
    dataset: z.string(),
    config: z.string(),
    run_id: z.number(),
    run_continue: z.boolean(),
    parallel: z.number(),
    subsample: z.number(),
    question_ids: z.array(z.string()).nullable().optional(),
    system_type: z.string(),
    seed: z.number(),
    debug: z.boolean(),
    config_content: z.record(z.any()),
    task_dirs_with_answers: z.array(z.string()),
}).catchall(z.any()); // Allow additional properties

export const RunDataSchema = z.object({
    args: z.array(RunArgsSchema).min(1), // Must have at least one run arg
    metrics: RunMetricsSchema,
    tasks: z.array(TaskDataSchema).min(1), // Must have at least one task
    analysis: RunAnalysisSchema.optional(),
});
// Removed the strict num_tasks validation - use actual found tasks instead


// Type exports (inferred from schemas)
export type RunMetrics = z.infer<typeof RunMetricsSchema>;
export type RunArgs = z.infer<typeof RunArgsSchema>;
export type RunData = z.infer<typeof RunDataSchema>;
