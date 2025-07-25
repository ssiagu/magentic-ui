import { useState, useEffect } from 'react';

export interface UseAvailableModelsResult {
  models: string[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useAvailableModels(): UseAvailableModelsResult {
  const [models, setModels] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchModels = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/models');
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }
      
      const data = await response.json();
      setModels(data.models || []);
    } catch (err) {
      console.error('Error fetching available models:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setModels([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  return {
    models,
    isLoading,
    error,
    refetch: fetchModels
  };
}
