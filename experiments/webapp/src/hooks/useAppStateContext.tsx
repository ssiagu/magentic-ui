import { createContext, useContext, useState, ReactNode, useMemo, useCallback } from 'react';
import { CoreAppState, CompareTabState, AnalyzeTabState } from '@/types';
import { RunData, TaskAnalysis, RunAnalysis } from '@/types';

// ============================================================================
// INITIAL STATES
// ============================================================================

const initialCoreState: CoreAppState = {
    activeTab: 'import',
    runs: [],
};

const initialCompareState: CompareTabState = {
    selectedDataset: '',
    selectedSplit: '',
    selectedTask: '',
};

const initialAnalyzeState: AnalyzeTabState = {
    selectedDataset: '',
    selectedSplit: '',
    selectedSystem: '',
    selectedRunId: null,
    taskAnalyses: {},
    runAnalysis: null,
    loading: {
        analyzingTasks: {},
        analyzingRun: false,
        analyzingAll: false,
    },
    errors: {},
    analysisSettings: {
        model: 'gpt-4.1',
        temperature: 0,
        includeSuccessfulTasks: false,
    },
};

// ============================================================================
// CONTEXT TYPE
// ============================================================================

interface AppStateContextType {
    // Separate state atoms - each triggers re-renders only for its consumers
    coreState: CoreAppState;
    compareState: CompareTabState;
    analyzeState: AnalyzeTabState;
    
    // Separate update functions - only update their specific slice
    updateCore: (updates: Partial<CoreAppState>) => void;
    updateCompare: (updates: Partial<CompareTabState>) => void;
    updateAnalyze: (updates: Partial<AnalyzeTabState>) => void;
}

const AppStateContext = createContext<AppStateContextType | null>(null);

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

export const AppStateProvider = ({ children }: { children: ReactNode }) => {
    // Separate useState calls - each only triggers re-renders for its consumers!
    const [coreState, setCoreState] = useState<CoreAppState>(initialCoreState);
    const [compareState, setCompareState] = useState<CompareTabState>(initialCompareState);
    const [analyzeState, setAnalyzeState] = useState<AnalyzeTabState>(initialAnalyzeState);

    // Core state updater - only components using coreState will re-render
    const updateCore = useCallback((updates: Partial<CoreAppState>) => {
        setCoreState(prev => ({ ...prev, ...updates }));
    }, []);

    // Compare state updater - only components using compareState will re-render
    const updateCompare = useCallback((updates: Partial<CompareTabState>) => {
        setCompareState(prev => ({ ...prev, ...updates }));
    }, []);

    // Analyze state updater - only components using analyzeState will re-render
    const updateAnalyze = useCallback((updates: Partial<AnalyzeTabState>) => {
        setAnalyzeState(prev => ({ ...prev, ...updates }));
    }, []);

    // Memoize the context value to prevent unnecessary re-renders
    const value = useMemo(() => ({
        coreState,
        compareState,
        analyzeState,
        updateCore,
        updateCompare,
        updateAnalyze,
    }), [coreState, compareState, analyzeState, updateCore, updateCompare, updateAnalyze]);

    return (
        <AppStateContext.Provider value={value}>
            {children}
        </AppStateContext.Provider>
    );
};

// ============================================================================
// BASE HOOK
// ============================================================================

export const useAppStateContext = () => {
    const context = useContext(AppStateContext);
    if (!context) {
        throw new Error('useAppStateContext must be used within AppStateProvider');
    }
    return context;
};

// ============================================================================
// SPECIALIZED HOOKS
// ============================================================================

// Core app hook - manages runs and active tab
export const useCoreApp = () => {
    const { coreState, updateCore } = useAppStateContext();
    
    // Computed values
    const hasData = useMemo(() => coreState.runs.length > 0, [coreState.runs.length]);
    const totalTasks = useMemo(() => 
        coreState.runs.reduce((sum, run) => sum + run.tasks.length, 0), 
        [coreState.runs]
    );

    // Actions
    const setActiveTab = useCallback((tab: CoreAppState['activeTab']) => {
        updateCore({ activeTab: tab });
    }, [updateCore]);

    const addRun = useCallback((run: RunData) => {
        updateCore({ runs: [...coreState.runs, run] });
    }, [updateCore, coreState.runs]);

    const removeRun = useCallback((index: number) => {
        const newRuns = coreState.runs.filter((_, i) => i !== index);
        updateCore({ runs: newRuns });
    }, [updateCore, coreState.runs]);

    const updateRuns = useCallback((runs: RunData[]) => {
        updateCore({ runs });
    }, [updateCore]);

    const clearAllRuns = useCallback(() => {
        updateCore({ runs: [] });
    }, [updateCore]);

    return {
        // State
        activeTab: coreState.activeTab,
        runs: coreState.runs,
        
        // Computed values
        hasData,
        totalTasks,
        
        // Actions
        setActiveTab,
        addRun,
        removeRun,
        updateRuns,
        clearAllRuns,
    };
};

// Compare tab hook - manages compare-specific state + accesses shared runs
export const useCompareTab = () => {
    const { coreState, compareState, updateCompare } = useAppStateContext();
    
    // Access shared runs from core state
    const runs = coreState.runs;

    // Computed values based on compare state + core runs
    const availableDatasets = useMemo(() => {
        const datasets = new Set<string>();
        runs.forEach(runData => {
            runData.args.forEach(args => {
                if (args.dataset) datasets.add(args.dataset);
            });
        });
        return Array.from(datasets).sort();
    }, [runs]);

    const availableSplits = useMemo(() => {
        if (!compareState.selectedDataset) return [];
        const splits = new Set<string>();
        runs.forEach(runData => {
            runData.args.forEach(args => {
                if (args.dataset === compareState.selectedDataset && args.split) {
                    splits.add(args.split);
                }
            });
        });
        return Array.from(splits).sort();
    }, [runs, compareState.selectedDataset]);

    const filteredRuns = useMemo(() => {
        if (!compareState.selectedDataset) return runs;
        return runs.filter(runData => {
            return runData.args.some(args => 
                args.dataset === compareState.selectedDataset
            );
        });
    }, [runs, compareState.selectedDataset]);

    const splitFilteredRuns = useMemo(() => {
        if (!compareState.selectedSplit) return filteredRuns;
        return filteredRuns.filter(runData => {
            return runData.args.some(args => 
                args.split === compareState.selectedSplit
            );
        });
    }, [filteredRuns, compareState.selectedSplit]);

    const commonTasks = useMemo(() => {
        if (splitFilteredRuns.length === 0) return [];
        
        if (splitFilteredRuns.length === 1) {
            return splitFilteredRuns[0].tasks;
        }

        // Find task IDs that exist in all runs
        const firstRunTaskIds = new Set(splitFilteredRuns[0].tasks.map(t => t.taskId));
        const commonTaskIds = splitFilteredRuns.slice(1).reduce((common, runData) => {
            const runTaskIds = new Set(runData.tasks.map(t => t.taskId));
            return new Set([...common].filter(id => runTaskIds.has(id)));
        }, firstRunTaskIds);

        return splitFilteredRuns[0].tasks.filter(task => 
            commonTaskIds.has(task.taskId)
        );
    }, [splitFilteredRuns]);

    // Actions
    const setDataset = useCallback((dataset: string) => {
        updateCompare({ 
            selectedDataset: dataset,
            selectedSplit: '', // Reset split when dataset changes
            selectedTask: '', // Reset task when dataset changes
        });
    }, [updateCompare]);

    const setSplit = useCallback((split: string) => {
        updateCompare({ 
            selectedSplit: split,
            selectedTask: '', // Reset task when split changes
        });
    }, [updateCompare]);

    const setTask = useCallback((task: string) => {
        updateCompare({ selectedTask: task });
    }, [updateCompare]);

    const resetState = useCallback(() => {
        updateCompare(initialCompareState);
    }, [updateCompare]);

    return {
        // State
        selectedDataset: compareState.selectedDataset,
        selectedSplit: compareState.selectedSplit,
        selectedTask: compareState.selectedTask,
        
        // Computed state (includes shared runs!)
        runs, // Shared from core state
        availableDatasets,
        availableSplits,
        filteredRuns,
        splitFilteredRuns,
        commonTasks,
        
        // Actions
        setDataset,
        setSplit,
        setTask,
        resetState,
    };
};

// Analyze tab hook - manages analysis-specific state + accesses shared runs
export const useAnalyzeTab = () => {
    const { coreState, analyzeState, updateAnalyze } = useAppStateContext();
    
    // Access shared runs from core state
    const runs = coreState.runs;

    // Computed values
    const availableDatasets = useMemo(() => {
        const datasets = new Set<string>();
        runs.forEach(runData => {
            runData.args.forEach(args => {
                if (args.dataset) datasets.add(args.dataset);
            });
        });
        return Array.from(datasets).sort();
    }, [runs]);

    const availableSplits = useMemo(() => {
        if (!analyzeState.selectedDataset) return [];
        const splits = new Set<string>();
        runs.forEach(runData => {
            runData.args.forEach(args => {
                if (args.dataset === analyzeState.selectedDataset && args.split) {
                    splits.add(args.split);
                }
            });
        });
        return Array.from(splits).sort();
    }, [runs, analyzeState.selectedDataset]);

    const availableSystems = useMemo(() => {
        if (!analyzeState.selectedDataset || !analyzeState.selectedSplit) return [];
        const systems = new Set<string>();
        runs.forEach(runData => {
            runData.args.forEach(args => {
                if (args.dataset === analyzeState.selectedDataset && 
                    args.split === analyzeState.selectedSplit && 
                    args.system_type) {
                    systems.add(args.system_type);
                }
            });
        });
        return Array.from(systems).sort();
    }, [runs, analyzeState.selectedDataset, analyzeState.selectedSplit]);

    const availableRunIds = useMemo(() => {
        if (!analyzeState.selectedDataset || !analyzeState.selectedSplit || !analyzeState.selectedSystem) return [];
        const runIds = new Set<number>();
        runs.forEach(runData => {
            runData.args.forEach(args => {
                if (args.dataset === analyzeState.selectedDataset && 
                    args.split === analyzeState.selectedSplit && 
                    args.system_type === analyzeState.selectedSystem &&
                    args.run_id) {
                    runIds.add(args.run_id);
                }
            });
        });
        return Array.from(runIds).sort((a, b) => a - b);
    }, [runs, analyzeState.selectedDataset, analyzeState.selectedSplit, analyzeState.selectedSystem]);

    const selectedRun = useMemo(() => {
        if (!analyzeState.selectedRunId) return null;
        return runs.find(runData => 
            runData.args.some(args => args.run_id === analyzeState.selectedRunId)
        );
    }, [runs, analyzeState.selectedRunId]);

    // Actions
    const setSelection = useCallback((updates: Partial<Pick<AnalyzeTabState, 'selectedDataset' | 'selectedSplit' | 'selectedSystem' | 'selectedRunId'>>) => {
        updateAnalyze(updates);
    }, [updateAnalyze]);

    const setDataset = useCallback((dataset: string) => {
        updateAnalyze({ 
            selectedDataset: dataset,
            selectedSplit: '',
            selectedSystem: '',
            selectedRunId: null,
        });
    }, [updateAnalyze]);

    const setSplit = useCallback((split: string) => {
        updateAnalyze({ 
            selectedSplit: split,
            selectedSystem: '',
            selectedRunId: null,
        });
    }, [updateAnalyze]);

    const setSystem = useCallback((system: string) => {
        updateAnalyze({ 
            selectedSystem: system,
            selectedRunId: null,
        });
    }, [updateAnalyze]);

    const setRunId = useCallback((runId: number | null) => {
        updateAnalyze({ selectedRunId: runId });
    }, [updateAnalyze]);

    const addTaskAnalysis = useCallback((taskId: string, analysis: TaskAnalysis) => {
        updateAnalyze(prev => ({
            taskAnalyses: { ...prev.taskAnalyses, [taskId]: analysis }
        }));
    }, [updateAnalyze]);

    const clearAllTaskAnalyses = useCallback(() => {
        updateAnalyze({
            taskAnalyses: {}
        });
    }, [updateAnalyze]);

    const setRunAnalysis = useCallback((analysis: RunAnalysis) => {
        updateAnalyze({ runAnalysis: analysis });
    }, [updateAnalyze]);

    const setTaskLoading = useCallback((taskId: string, loading: boolean) => {
        updateAnalyze(prev => ({
            loading: {
                ...prev.loading,
                analyzingTasks: { ...prev.loading.analyzingTasks, [taskId]: loading }
            }
        }));
    }, [updateAnalyze]);

    const setRunLoading = useCallback((loading: boolean) => {
        updateAnalyze(prev => ({
            loading: { ...prev.loading, analyzingRun: loading }
        }));
    }, [updateAnalyze]);

    const setAllTasksLoading = useCallback((loading: boolean) => {
        updateAnalyze(prev => ({
            loading: { ...prev.loading, analyzingAll: loading }
        }));
    }, [updateAnalyze]);

    const setError = useCallback((key: string, error: string) => {
        updateAnalyze(prev => ({
            errors: { ...prev.errors, [key]: error }
        }));
    }, [updateAnalyze]);

    const clearError = useCallback((key: string) => {
        updateAnalyze(prev => {
            const newErrors = { ...prev.errors };
            delete newErrors[key];
            return { errors: newErrors };
        });
    }, [updateAnalyze]);

    const updateSettings = useCallback((settings: Partial<AnalyzeTabState['analysisSettings']>) => {
        updateAnalyze(prev => ({
            analysisSettings: { ...prev.analysisSettings, ...settings }
        }));
    }, [updateAnalyze]);

    const resetState = useCallback(() => {
        updateAnalyze(initialAnalyzeState);
    }, [updateAnalyze]);

    return {
        // State
        selectedDataset: analyzeState.selectedDataset,
        selectedSplit: analyzeState.selectedSplit,
        selectedSystem: analyzeState.selectedSystem,
        selectedRunId: analyzeState.selectedRunId,
        taskAnalyses: analyzeState.taskAnalyses,
        runAnalysis: analyzeState.runAnalysis,
        loading: analyzeState.loading,
        errors: analyzeState.errors,
        analysisSettings: analyzeState.analysisSettings,
        
        // Computed state (includes shared runs!)
        runs, // Shared from core state
        availableDatasets,
        availableSplits,
        availableSystems,
        availableRunIds,
        selectedRun,
        
        // Actions
        setSelection,
        setDataset,
        setSplit,
        setSystem,
        setRunId,
        addTaskAnalysis,
        clearAllTaskAnalyses,
        setRunAnalysis,
        setTaskLoading,
        setRunLoading,
        setAllTasksLoading,
        setError,
        clearError,
        updateSettings,
        resetState,
    };
};
