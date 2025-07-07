import { RunData, RunDataSchema } from '@/types';

/**
 * Validates and exports RunData to JSON with proper error handling
 */
export const exportValidatedRunData = (data: RunData): string => {
  try {
    // Validate the data before export
    const validatedData = RunDataSchema.parse(data);
    return JSON.stringify(validatedData, null, 2);
  } catch (error) {
    throw new Error(`Data validation failed before export: ${error}`);
  }
};

/**
 * Imports and validates JSON data as RunData
 */
export const importValidatedRunData = (jsonString: string): RunData => {
  try {
    const parsedData = JSON.parse(jsonString);
    return RunDataSchema.parse(parsedData);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON format: ${error.message}`);
    }
    throw new Error(`Data validation failed during import: ${error}`);
  }
};

/**
 * Validates RunData and returns validation result
 */
export const validateRunData = (data: any): { 
  isValid: boolean; 
  errors: string[]; 
  data?: RunData 
} => {
  try {
    const validatedData = RunDataSchema.parse(data);
    return {
      isValid: true,
      errors: [],
      data: validatedData
    };
  } catch (error: any) {
    return {
      isValid: false,
      errors: error.errors?.map((e: any) => `${e.path.join('.')}: ${e.message}`) || [error.message],
    };
  }
};
