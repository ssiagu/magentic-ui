import { createAzure } from '@ai-sdk/azure';
import { ChainedTokenCredential, DefaultAzureCredential, AzureCliCredential } from '@azure/identity';
import { getModelEndpoint } from './model-config';

// Function to get Azure AD access token using Azure Identity SDK
export async function getAzureAdToken(): Promise<string> {
  try {
    const credential = new ChainedTokenCredential(
      new AzureCliCredential(),
      new DefaultAzureCredential(),
    );

    const tokenResponse = await credential.getToken("api://trapi/.default");
    
    if (!tokenResponse?.token) {
      throw new Error('Failed to obtain access token');
    }

    return tokenResponse.token;
  } catch (error) {
    console.error('Error getting Azure AD token:', error);
    throw new Error(`Failed to get Azure AD token: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Function to create Azure OpenAI client with authentication for a specific model
export async function createAzureClientForModel(modelName: string) {
  const accessToken = await getAzureAdToken();
  const modelEndpoint = getModelEndpoint(modelName);
  
  return createAzure({
    apiKey: "",
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    apiVersion: modelEndpoint.api_version,
    baseURL: modelEndpoint.azure_endpoint
  });
}

// Direct fetch client for Azure OpenAI API
export async function azureChatCompletion(
  modelName: string, 
  messages: Array<{ role: string; content: string }>,
  options?: {
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    stream?: boolean;
  }
) {
  const accessToken = await getAzureAdToken();
  const modelEndpoint = getModelEndpoint(modelName);
  
  const apiUrl = `${modelEndpoint.azure_endpoint}/deployments/${modelEndpoint.azure_deployment}/chat/completions?api-version=${modelEndpoint.api_version}`;
  
  const requestBody = {
    model: modelEndpoint.azure_deployment,
    messages,
    ...options
  };
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Azure API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error calling Azure OpenAI API:', error);
    throw new Error(`Azure API call failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
