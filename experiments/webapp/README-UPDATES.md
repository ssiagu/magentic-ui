# Updated Task Analysis Webapp

## Overview
The webapp has been updated to use a new, more structured data format with Zod schema validation. This provides better type safety, data validation, and a more consistent data structure.

## New Data Structure

### RunData (Main Container)
```typescript
interface RunData {
  args: RunArgs[];        // Array of run configurations
  metrics: RunMetrics;    // Overall metrics for the run
  tasks: TaskData[];      // Array of task execution data
}
```

### TaskData (Individual Task)
```typescript
interface TaskData {
  taskId: string;
  messages: TaskMessage[];  // Conversation messages
  answer: TaskAnswer;       // Final answer and screenshots
  score: TaskScore;         // Score and metadata
  times: TaskTimes;         // Timing information
}
```

## Key Features

### 1. Zod Schema Validation
- All data is validated using Zod schemas before processing
- Detailed error reporting for invalid data
- Ensures data consistency and type safety

### 2. Enhanced DataImport Component
- **Folder Upload**: Supports run folder structure with:
  - `args_*` files containing RunArgs data
  - `metrics.json` file containing RunMetrics  
  - Task folders named with taskId containing:
    - `*_answer.json` - TaskAnswer data
    - `*_messages.json` - Array of TaskMessage objects
    - `score.json` - TaskScore data  
    - `times.json` - TaskTimes data
- **JSON Upload**: Direct import of JSON files matching the RunData schema
- **Sample Data**: Quick loading of test data for development
- **Validation Feedback**: Clear error messages for invalid data

### 3. Updated Components
- **MessageBrowser**: Browse task conversations with improved filtering
- **AnalysisDashboard**: View metrics and perform task analysis
- **TaskAnalysisApp**: Main orchestration component

## Data Validation Rules

### TaskScore
- Score must be between 0 and 1
- Metadata object required

### TaskTimes
- All times must be positive numbers
- End time must be after start time
- Duration must equal (end_time - start_time)

### TaskData
- Task ID cannot be empty
- Must have at least one message
- All nested objects validated

### RunData
- Must have at least one run argument
- Must have at least one task
- Metrics num_tasks must match actual task count

## Expected Folder Structure

When uploading a run folder, the system expects the following structure:

```
run-folder/
├── args_*.json          # RunArgs files (can have multiple)
├── metrics.json         # RunMetrics data
├── task-id-1/          # Folder named with actual taskId
│   ├── *_answer.json   # TaskAnswer (any prefix)
│   ├── *_messages.json # TaskMessage array (any prefix) 
│   ├── score.json      # TaskScore
│   └── times.json      # TaskTimes
├── task-id-2/
│   ├── *_answer.json
│   ├── *_messages.json
│   ├── score.json
│   └── times.json
└── ...
```

### File Content Examples

**args_example.json** (RunArgs):
```json
{
  "_date": "2025-01-01",
  "mode": "run",
  "dataset": "gaia",
  "run_id": 1,
  // ... other RunArgs fields
}
```

**metrics.json** (RunMetrics):
```json
{
  "mean_score": 0.75,
  "num_tasks": 4,
  "average_time": 120.5,
  // ... other metrics
}
```

**score.json** (TaskScore):
```json
{
  "score": 1.0,
  "metadata": {}
}
```

**times.json** (TaskTimes):
```json
{
  "start_time": 1640995200000,
  "end_time": 1640995260000,
  "duration": 60000
}
```

## Usage Examples

### Loading Sample Data
The easiest way to test the system is using the "Load Sample Data" button in the DataImport component.

### Importing JSON Data
Create a JSON file matching the RunData schema:
```json
{
  "args": [{ ... }],
  "metrics": { ... },
  "tasks": [{ ... }]
}
```

### Validation Utilities
```typescript
import { validateRunData } from '@/utils/dataValidation';

const result = validateRunData(someData);
if (result.isValid) {
  // Use result.data
} else {
  // Handle result.errors
}
```

## Migration from Old Types

The old nested structure `{[taskId]: {[runId]: taskData}}` has been replaced with a flat array structure in `RunData.tasks[]`. This provides:

- Better performance with large datasets
- Clearer data relationships
- Easier validation and processing
- More consistent API responses

## Error Handling

The system provides comprehensive error handling:
- **Schema Validation Errors**: Detailed field-level validation messages
- **Custom Validation Errors**: Business logic validation (e.g., score ranges)
- **Import Errors**: File parsing and structure validation
- **Runtime Errors**: Graceful handling of unexpected data formats

## Development

All components now use TypeScript types inferred from Zod schemas, ensuring compile-time and runtime type safety. The schemas serve as both validation rules and type definitions.
