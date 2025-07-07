// Type definitions for task analysis and message browsing

import { z } from 'zod';

export const TaskAnalysisSchema = z.object({
    taskId: z.string(),
    reason: z.string(),
    suggestion: z.string(),
})

export const SystemPromptAnalysisSchema = z.object({
    originalPrompt: z.string(),
    suggestedPrompt: z.string(),
})

export const RunAnalysisSchema = z.object({
    taskAnalyses: z.array(TaskAnalysisSchema).default([]),
    systemPromptAnalysis: SystemPromptAnalysisSchema.optional(),
    suggestion: z.string().optional(),
})


// Type exports (inferred from schemas)
export type TaskAnalysis = z.infer<typeof TaskAnalysisSchema>
export type SystemPromptAnalysis = z.infer<typeof SystemPromptAnalysisSchema>
export type RunAnalysis = z.infer<typeof RunAnalysisSchema>
