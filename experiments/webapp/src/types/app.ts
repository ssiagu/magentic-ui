import { z } from 'zod'
import { RunData } from './run'
import { RunAnalysis, TaskAnalysis } from './analysis'

// ============================================================================
// CORE APP STATE (Single source of truth - shared across all tabs)
// ============================================================================
export interface CoreAppState {
    activeTab: 'import' | 'compare' | 'analyze';
    runs: RunData[];
}

// ============================================================================
// TAB-SPECIFIC STATE INTERFACES
// ============================================================================

// Import tab has no independent state - it just modifies runs directly

// Compare/MessageBrowser tab state
export interface CompareTabState {
    selectedDataset: string;
    selectedSplit: string;
    selectedTask: string;
}

// Analyze tab state  
export interface AnalyzeTabState {
    // Selection
    selectedDataset: string;
    selectedSplit: string;
    selectedSystem: string;
    selectedRunId: number | null;
    
    // Analysis results
    taskAnalyses: Record<string, TaskAnalysis>;
    runAnalysis: RunAnalysis | null;
    
    // UI state
    loading: {
        analyzingTasks: Record<string, boolean>; // taskId -> loading
        analyzingRun: boolean;
    };
    errors: Record<string, string>;
    
    // Settings
    analysisSettings: {
        model: string;
        temperature: number;
        includeSuccessfulTasks: boolean;
    };
}

// ============================================================================
// SCHEMAS FOR VALIDATION (Optional)
// ============================================================================
export const CompareTabStateSchema = z.object({
    selectedDataset: z.string(),
    selectedSplit: z.string(),
    selectedTask: z.string(),
});

export const AnalyzeTabStateSchema = z.object({
    selectedDataset: z.string(),
    selectedSplit: z.string(),
    selectedSystem: z.string(),
    selectedRunId: z.number().nullable(),
    taskAnalyses: z.record(z.string(), z.any()), // TaskAnalysis schema
    runAnalysis: z.any().nullable(), // RunAnalysis schema
    loading: z.object({
        analyzingTasks: z.record(z.string(), z.boolean()),
        analyzingRun: z.boolean(),
    }),
    errors: z.record(z.string(), z.string()),
    analysisSettings: z.object({
        model: z.string(),
        temperature: z.number(),
        includeSuccessfulTasks: z.boolean(),
    }),
});