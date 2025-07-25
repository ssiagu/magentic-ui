import React from 'react';

interface PlanMessageProps {
  plan: any;
  maxLength: number;
  showExpanded: boolean;
  onToggleExpanded?: () => void;
}

export const PlanMessage: React.FC<PlanMessageProps> = ({ plan, maxLength, showExpanded, onToggleExpanded }) => {
  const renderTruncatedContent = (content: string) => {
    const isLong = content.length > maxLength;
    const displayContent = showExpanded || !isLong ? content : content.substring(0, maxLength) + '...';
    return (
      <div>
        <span className="text-gray-700">{displayContent}</span>
        {isLong && onToggleExpanded && (
          <button
            onClick={onToggleExpanded}
            className="ml-2 text-sm text-blue-500 hover:text-blue-600"
          >
            {showExpanded ? 'Show less' : 'Show more'}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {plan.task && (
        <div>
          <span className="font-medium">Task: </span>
          {renderTruncatedContent(plan.task)}
        </div>
      )}
      
      {plan.title && (
        <div>
          <span className="font-medium">Plan: </span>
          {renderTruncatedContent(plan.title)}
        </div>
      )}
      
      {plan.plan_summary && (
        <div>
          <span className="font-medium">Summary: </span>
          <div className="mt-1">{renderTruncatedContent(plan.plan_summary)}</div>
        </div>
      )}
      
      {plan.agent_name && (
        <div>
          <span className="font-medium">Agent: </span>
          <span className="text-gray-700 font-mono">{plan.agent_name.toUpperCase()}</span>
        </div>
      )}
      
      {plan.index !== undefined && plan.plan_length && (
        <div>
          <span className="font-medium">Step: </span>
          <span className="text-gray-700">{plan.index + 1}/{plan.plan_length}</span>
        </div>
      )}
      
      {plan.steps && Array.isArray(plan.steps) && (
        <div>
          <span className="font-medium">Steps:</span>
          <ol className="list-decimal list-inside mt-2 space-y-1">
            {plan.steps.map((step: any, i: number) => {
              const stepContent = typeof step === 'string' ? step : step.description || step.content || JSON.stringify(step);
              return (
                <li key={i} className="text-gray-700 ml-2">
                  {renderTruncatedContent(stepContent)}
                </li>
              );
            })}
          </ol>
        </div>
      )}
      
      {plan.details && (
        <div>
          <span className="font-medium">Details: </span>
          <div className="mt-1">{renderTruncatedContent(plan.details)}</div>
        </div>
      )}
      
      {plan.instruction && (
        <div>
          <span className="font-medium">Instruction: </span>
          <div className="mt-1">{renderTruncatedContent(plan.instruction)}</div>
        </div>
      )}
    </div>
  );
};
