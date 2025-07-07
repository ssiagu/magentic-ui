import { z } from "zod";
import { TaskDataSchema } from "./task"
import { TaskAnalysisSchema } from "./analysis";

export const BaseAnalysisRequestSchema = z.object({
    model: z.string(),
    temperature: z.number().default(0),
})

export const TaskAnalysisRequestSchema = BaseAnalysisRequestSchema.extend({
    task: TaskDataSchema,
});

export const RunAnalysisRequestSchema = BaseAnalysisRequestSchema.extend({
    taskAnalyses: z.array(TaskAnalysisSchema),
    systemPrompt: z.string(),
});

export type BaseAnalysisRequest = z.infer<typeof BaseAnalysisRequestSchema>;
export type TaskAnalysisRequest = z.infer<typeof TaskAnalysisRequestSchema>;
export type RunAnalysisRequest = z.infer<typeof RunAnalysisRequestSchema>;