// Type definitions for task analysis and message browsing

import { z } from 'zod';

// Zod schemas
export const TaskMessageSchema = z.object({
    source: z.enum(['user', 'agent']),
    content: z.string(),
    timestamp: z.string().optional(),
    metadata: z.record(z.any()).optional(),
});

export const TaskAnswerSchema = z.object({
    answer: z.string(),
    screenshots: z.array(z.string()),
});

export const TaskScoreSchema = z.object({
    score: z.number().min(0).max(1), // Score must be between 0 and 1
    metadata: z.record(z.any()),
});

export const TaskTimesSchema = z.object({
    start_time: z.number().positive(),
    end_time: z.number().positive(),
    duration: z.number().positive(),
}).refine(data => data.end_time >= data.start_time, {
    message: "End time must be after start time",
    path: ["end_time"]
}).refine(data => data.duration === (data.end_time - data.start_time), {
    message: "Duration must equal end_time - start_time",
    path: ["duration"]
});

export const TokenUsageClientSchema = z.object({
    total_input_tokens: z.number().nonnegative(),
    total_output_tokens: z.number().nonnegative(),
    total_tokens: z.number().nonnegative(),
    requests: z.array(z.object({
        input_tokens: z.number().nonnegative(),
        output_tokens: z.number().nonnegative(),
        total_tokens: z.number().nonnegative(),
    }))
});

export const TokenUsageSchema = z.object({
    clients: z.record(TokenUsageClientSchema),
    grand_total: z.object({
        total_input_tokens: z.number().nonnegative(),
        total_output_tokens: z.number().nonnegative(),
        total_tokens: z.number().nonnegative(),
        total_requests: z.number().nonnegative(),
    })
});

export const TaskDataSchema = z.object({
    taskId: z.string().min(1), // Task ID cannot be empty
    messages: z.array(TaskMessageSchema), // Allow empty messages array
    answer: TaskAnswerSchema,
    score: TaskScoreSchema,
    times: TaskTimesSchema,
    tokenUsage: TokenUsageSchema.optional(), // Token usage is optional for backward compatibility
});

// Type exports (inferred from schemas)
export type TaskMessage = z.infer<typeof TaskMessageSchema>;
export type TaskAnswer = z.infer<typeof TaskAnswerSchema>;
export type TaskScore = z.infer<typeof TaskScoreSchema>;
export type TaskTimes = z.infer<typeof TaskTimesSchema>;
export type TokenUsageClient = z.infer<typeof TokenUsageClientSchema>;
export type TokenUsage = z.infer<typeof TokenUsageSchema>;
export type TaskData = z.infer<typeof TaskDataSchema>;
