import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { NextRequest } from 'next/server';

import { RunAnalysisRequestSchema, SystemPromptAnalysisSchema, RunAnalysisSchema } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const body = RunAnalysisRequestSchema.parse(await req.json());
    const { taskAnalyses, systemPrompt: originalSystemPrompt, model, temperature } = body;

    // Create analysis prompt
    let systemPrompt = `You are an expert AI evaluator analyzing why an AI agent succeeded or failed on a benchmark. 

Your job is to provide actionable aggregate suggestions given the failure reasons and suggestions from a set of individual task analyses.

Be specific and actionable in your analysis.`;

    let userPrompt = `Analyze this AI agent task execution:

**Task Analyses:**
${taskAnalyses.map((taskAnalysis, idx) =>
      `${idx + 1}.\n\tFailiure Reason: ${taskAnalysis.reason}\n\tSuggestion: ${taskAnalysis.suggestion}
`).join('\n\n')}

Please provide your suggestions for improving the agent.`;

    const { text: suggestion } = await generateText({
      model: openai(model),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: temperature,
    });


    systemPrompt = `You are an expert AI evaluator analyzing why an AI agent succeeded or failed on a benchmark. 

Your job is to re-write the agent's original system prompt given suggestions for improvement.`

    userPrompt = `# Expert Suggestions:
${suggestion}

# Original System Prompt:
${originalSystemPrompt}

Please write an updated system prompt to improve the agent's performance. Just write the system prompt directly.`

    const { text: newSystemPrompt } = await generateText({
      model: openai(model),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: temperature,
    });

    const result = RunAnalysisSchema.parse({
      taskAnalyses: taskAnalyses,
      systemPromptAnalysis: SystemPromptAnalysisSchema.parse({
        originalPrompt: originalSystemPrompt,
        suggestedPrompt: newSystemPrompt
      }),
      suggestion: suggestion,

    });

    return Response.json(result);

  } catch (error) {
    console.error('Analysis API error:', error);
    return Response.json(
      { error: 'Failed to analyze run', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
