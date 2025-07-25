import { NextRequest } from 'next/server';

import { RunAnalysisRequestSchema, SystemPromptAnalysisSchema, RunAnalysisSchema } from '@/types'
import { azureChatCompletion } from '@/utils/azure-client';

export async function POST(req: NextRequest) {
  try {
    const body = RunAnalysisRequestSchema.parse(await req.json());
    const { taskAnalyses, systemPrompt: originalSystemPrompt, model, temperature } = body;

    // Create analysis prompt
    let systemPrompt = `You are an expert AI evaluator analyzing why an AI agent succeeded or failed on a benchmark. 

Your job is to provide actionable aggregate suggestions given the failure reasons and suggestions from a set of individual task analyses.

Constraints of the system:
- Fully autonomous. The agent is _never_ allowed to talk to the user.

Be specific and actionable in your analysis, but do not violate any of the contraints.`;

    let userPrompt = `Analyze this AI agent task execution:

**Task Analyses:**
${taskAnalyses.map((taskAnalysis, idx) =>
      `${idx + 1}.\n\tFailiure Reason: ${taskAnalysis.reason}\n\tSuggestion: ${taskAnalysis.suggestion}
`).join('\n\n')}

Please provide your suggestions for improving the agent.`;

    const suggestionResponse = await azureChatCompletion(model, [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ], {
      temperature: temperature
    });

    const suggestion = suggestionResponse.choices[0]?.message?.content;
    if (!suggestion) {
      throw new Error('No suggestion response content from Azure API');
    }

    systemPrompt = `You are an expert AI evaluator analyzing why an AI agent succeeded or failed on a benchmark. 

Your job is to re-write the agent's original system prompt given suggestions for improvement.

Please provide your analysis in the following JSON format:
{
  "reason": "A clear summary of common task failure reasons",
  "suggestion": "Actionable suggestions on how to improve task execution on average."
  "systemPrompt": "An updated system prompt based on your suggestions"
}`

    userPrompt = `# Expert Suggestions:
${suggestion}

# Original System Prompt:
${originalSystemPrompt}

Please provide your analysis in the requested JSON format.`

    const response = await azureChatCompletion(model, [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ], {
      temperature: temperature
    });

    const text = response.choices[0]?.message?.content;
    if (!text) {
      throw new Error('No response content from Azure API');
    }

    const jsonMatch = text.match(/{[\s\S]*}/);
    if (!jsonMatch) {
      throw new Error('No JSON object found in analysis response');
    }

    const jsonText = jsonMatch[0];
    const jsonObject = JSON.parse(jsonText);

    const systemPromptAnalysis = SystemPromptAnalysisSchema.parse({
      originalPrompt: originalSystemPrompt,
      suggestedPrompt: jsonObject.systemPrompt
    });

    delete jsonObject.systemPrompt;

    const result = RunAnalysisSchema.parse({
      systemPromptAnalysis: systemPromptAnalysis,
      ...jsonObject
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
