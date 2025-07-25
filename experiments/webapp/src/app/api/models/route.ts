import { NextRequest } from 'next/server';
import { getAvailableModels } from '@/utils/model-config';

export async function GET(req: NextRequest) {
  try {
    const models = getAvailableModels();
    return Response.json({ models });
  } catch (error) {
    console.error('Error getting available models:', error);
    return Response.json(
      { error: 'Failed to get available models', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
