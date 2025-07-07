import { RunData, FilterOptions, TaskData } from '@/types';

export const formatMessageContent = (content: string): string => {
  // If content starts with '[', wrap it in a <pre> block
  if (content.trim().startsWith('[')) {
    return `<pre class="whitespace-pre-wrap text-xs bg-gray-100 p-2 rounded border overflow-hidden break-words">${escapeHtml(content)}</pre>`;
  }
  
  // If content starts with a function call pattern, wrap it in a <pre> block
  const functionCallPattern = /^\s*[a-zA-Z_][a-zA-Z0-9_-]*\(/;
  if (functionCallPattern.test(content.trim())) {
    return `<pre class="whitespace-pre-wrap text-xs bg-gray-100 p-2 rounded border overflow-hidden break-words">${escapeHtml(content)}</pre>`;
  }
  
  // Basic HTML escaping and formatting
  let formatted = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
  
  // Simple markdown-like formatting
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
  formatted = formatted.replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-100 p-2 rounded text-sm overflow-hidden whitespace-pre-wrap break-words"><code>$1</code></pre>');
  formatted = formatted.replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 rounded text-sm break-words">$1</code>');
  
  return formatted;
};

export const escapeHtml = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

export const formatTimestamp = (timestampStr: string): string => {
  try {
    const date = new Date(timestampStr);
    return date.toLocaleString();
  } catch (e) {
    return timestampStr;
  }
};

export const getScoreColorClass = (score: number): string => {
  if (score === 1) return 'text-green-600 bg-green-50';
  if (score === 0) return 'text-red-600 bg-red-50';
  return 'text-gray-600 bg-gray-50';
};

export const getScoreEmoji = (score: number): string => {
  if (score === 1) return '✓';
  if (score === 0) return '✗';
  return '?';
};

export const computeMeanScoresFromTasks = (tasks: TaskData[]): number => {
  if (tasks.length === 0) return 0;
  const totalScore = tasks.reduce((sum, task) => sum + task.score.score, 0);
  return totalScore / tasks.length;
};

export const filterTaskData = (tasks: TaskData[], filters: FilterOptions): TaskData[] => {
  return tasks.filter(task => {
    switch (filters.scoreFilter) {
      case 'success':
        return task.score.score === 1;
      case 'failure':
        return task.score.score === 0;
      case 'partial':
        return task.score.score > 0 && task.score.score < 1;
      default:
        return true;
    }
  });
};

export const generateTaskSummary = (tasks: TaskData[]): string => {
  const totalTasks = tasks.length;
  const totalSuccesses = tasks.filter(task => task.score.score === 1).length;
  const totalFailures = tasks.filter(task => task.score.score === 0).length;
  const totalPartial = tasks.filter(task => task.score.score > 0 && task.score.score < 1).length;
  
  return `${totalTasks} tasks • ${totalSuccesses} passed, ${totalFailures} failed, ${totalPartial} partial`;
};

export const determineSystemName = (
  systemType: string,
  simulatedUserType: string = "none",
  howHelpfulUserProxy: string = "soft",
  webSurferOnly: boolean = false
): string => {
  if (systemType === "mcp-agent") {
    return "McpAgentAutonomousSystem";
  }
  
  let systemName = "MagenticUI";
  if (simulatedUserType !== "none") {
    systemName += `_${simulatedUserType}_${howHelpfulUserProxy}`;
  }
  if (webSurferOnly) {
    systemName += "_web_surfer_only";
  }
  
  return systemName;
};

export const generateOutputFilename = (
  systemName: string,
  dataset: string,
  split: string,
  runIds: number[],
  suffix: string = "analysis"
): string => {
  const sortedRunIds = [...runIds].sort();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const safeSystemName = systemName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const runIdsStr = sortedRunIds.join('_');
  
  return `${suffix}_${safeSystemName}_${dataset}_${split}_runs_${runIdsStr}_${timestamp}.json`;
};
