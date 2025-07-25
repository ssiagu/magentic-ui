export interface ModelEndpoint {
  azure_endpoint: string;
  api_version: string;
  azure_deployment: string;
}

export interface ModelConfig {
  [modelName: string]: ModelEndpoint[];
}

export const MODEL_CONFIG: ModelConfig = {
  "gpt-4-turbo": [
    {
      azure_endpoint: "https://trapi.research.microsoft.com/gcr/shared/openai",
      api_version: "2024-10-21",
      azure_deployment: "gpt-4_turbo-2024-04-09",
    },
    {
      azure_endpoint: "https://trapi.research.microsoft.com/msraif/shared/openai",
      api_version: "2024-10-21",
      azure_deployment: "gpt-4_turbo-2024-04-09",
    },
  ],
  "gpt-4-32k": [
    {
      azure_endpoint: "https://trapi.research.microsoft.com/gcr/shared/openai",
      api_version: "2024-10-21",
      azure_deployment: "gpt-4-32k_0314",
    },
  ],
  "gpt-4.1": [
    {
      azure_endpoint: "https://trapi.research.microsoft.com/gcr/shared/openai",
      api_version: "2025-04-01-preview",
      azure_deployment: "gpt-4.1_2025-04-14",
    },
    {
      azure_endpoint: "https://trapi.research.microsoft.com/msraif/shared/openai",
      api_version: "2025-04-01-preview",
      azure_deployment: "gpt-4.1_2025-04-14",
    },
  ],
  "gpt-4.1-mini": [
    {
      azure_endpoint: "https://trapi.research.microsoft.com/gcr/shared/openai",
      api_version: "2025-04-01-preview",
      azure_deployment: "gpt-4.1-mini_2025-04-14",
    },
    {
      azure_endpoint: "https://trapi.research.microsoft.com/msraif/shared/openai",
      api_version: "2025-04-01-preview",
      azure_deployment: "gpt-4.1-mini_2025-04-14",
    },
  ],
  "gpt-4.1-nano": [
    {
      azure_endpoint: "https://trapi.research.microsoft.com/gcr/shared/openai",
      api_version: "2025-04-01-preview",
      azure_deployment: "gpt-4.1-nano_2025-04-14",
    },
    {
      azure_endpoint: "https://trapi.research.microsoft.com/msraif/shared/openai",
      api_version: "2025-04-01-preview",
      azure_deployment: "gpt-4.1-nano_2025-04-14",
    },
  ],
  "gpt-4.5-preview": [
    {
      azure_endpoint: "https://trapi.research.microsoft.com/gcr/shared/openai",
      api_version: "2024-10-21",
      azure_deployment: "gpt-4.5-preview_2025-02-27",
    },
    {
      azure_endpoint: "https://trapi.research.microsoft.com/msraif/shared/openai",
      api_version: "2024-10-21",
      azure_deployment: "gpt-4.5-preview_2025-02-27",
    },
  ],
  "gpt-4o-20240513": [
    {
      azure_endpoint: "https://trapi.research.microsoft.com/gcr/shared/openai",
      api_version: "2024-10-21",
      azure_deployment: "gpt-4o_2024-05-13",
    },
  ],
  "gpt-4o-20241120": [
    {
      azure_endpoint: "https://trapi.research.microsoft.com/gcr/shared/openai",
      api_version: "2024-10-21",
      azure_deployment: "gpt-4o_2024-11-20",
    },
    {
      azure_endpoint: "https://trapi.research.microsoft.com/msraif/shared/openai",
      api_version: "2024-10-21",
      azure_deployment: "gpt-4o_2024-11-20",
    },
  ],
  "gpt-4o-2024_08_06": [
    {
      azure_endpoint: "https://trapi.research.microsoft.com/gcr/shared/openai",
      api_version: "2024-10-21",
      azure_deployment: "gpt-4o_2024-08-06",
    },
    {
      azure_endpoint: "https://trapi.research.microsoft.com/msraif/shared/openai",
      api_version: "2024-10-21",
      azure_deployment: "gpt-4o_2024-08-06",
    },
  ],
  "gpt-4o_2024-11-20": [
    {
      azure_endpoint: "https://trapi.research.microsoft.com/gcr/shared/openai",
      api_version: "2024-10-21",
      azure_deployment: "gpt-4o_2024-11-20",
    },
  ],
  "gpt-4o": [
    {
      azure_endpoint: "https://trapi.research.microsoft.com/msraif/shared/openai",
      api_version: "2024-10-21",
      azure_deployment: "gpt-4o_2024-11-20",
    },
    {
      azure_endpoint: "https://trapi.research.microsoft.com/gcr/shared/openai",
      api_version: "2024-10-21",
      azure_deployment: "gpt-4o_2024-11-20",
    },
  ],
  "gpt-4o-mini": [
    {
      azure_endpoint: "https://trapi.research.microsoft.com/gcr/shared/openai",
      api_version: "2024-10-21",
      azure_deployment: "gpt-4o-mini_2024-07-18",
    },
    {
      azure_endpoint: "https://trapi.research.microsoft.com/msraif/shared/openai",
      api_version: "2024-10-21",
      azure_deployment: "gpt-4o-mini_2024-07-18",
    },
  ],
  "gpt-o1": [
    {
      azure_endpoint: "https://trapi.research.microsoft.com/gcr/shared/openai",
      api_version: "2024-12-01-preview",
      azure_deployment: "o1_2024-12-17",
    },
    {
      azure_endpoint: "https://trapi.research.microsoft.com/msraif/shared/openai",
      api_version: "2024-12-01-preview",
      azure_deployment: "o1_2024-12-17",
    },
  ],
  "gpt-o1-mini": [
    {
      azure_endpoint: "https://trapi.research.microsoft.com/gcr/shared/openai",
      api_version: "2024-12-01-preview",
      azure_deployment: "o1-mini_2024-09-12",
    },
    {
      azure_endpoint: "https://trapi.research.microsoft.com/msraif/shared/openai",
      api_version: "2024-12-01-preview",
      azure_deployment: "o1-mini_2024-09-12",
    },
  ],
  "gpt-o4-mini": [
    {
      azure_endpoint: "https://trapi.research.microsoft.com/gcr/shared/openai",
      api_version: "2024-12-01-preview",
      azure_deployment: "o4-mini_2025-04-16",
    },
    {
      azure_endpoint: "https://trapi.research.microsoft.com/msraif/shared/openai",
      api_version: "2024-12-01-preview",
      azure_deployment: "o4-mini_2025-04-16",
    },
  ],
};

// Helper function to get available model names
export function getAvailableModels(): string[] {
  return Object.keys(MODEL_CONFIG);
}

// Helper function to get a random endpoint for load balancing
export function getModelEndpoint(modelName: string, index?: number): ModelEndpoint {
  const endpoints = MODEL_CONFIG[modelName];
  if (!endpoints || endpoints.length === 0) {
    throw new Error(`Model "${modelName}" is not configured`);
  }
  
  // Simple round-robin or random selection for load balancing
  if (index === undefined) {
    index = Math.floor(Math.random() * endpoints.length);
  }
  
  return endpoints[index];
}
