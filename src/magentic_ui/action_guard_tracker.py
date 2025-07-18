import json
from datetime import datetime
from typing import List, Dict, Any, Optional
from pathlib import Path
from autogen_core.models import LLMMessage

class ActionGuardTracker:
    def __init__(self, log_file: str = "action_guard_calls.jsonl"):
        self.log_file = Path(log_file)
        # Ensure the log file exists
        self.log_file.touch(exist_ok=True)
    
    def log_call(
        self,
        call_type: str,
        action_name: str,
        baseline: Optional[str] = None,
        llm_guess: Optional[str] = None,
        action_context: Optional[List[LLMMessage]] = None,
        needs_approval: Optional[bool] = None,
        approved: Optional[bool] = None,
        call_arguments: Optional[Dict[str, Any]] = None,
        additional_data: Optional[Dict[str, Any]] = None
    ):
        """
        Log an action guard call with context.
        
        Args:
            call_type: Type of call ("requires_approval", "get_approval", "invoke_with_approval")
            action_name: Name of the action being guarded
            baseline: Baseline approval requirement
            llm_guess: LLM's guess for approval requirement
            action_context: List of LLM messages providing context
            needs_approval: Whether the action needs approval
            approved: Whether the action was approved
            call_arguments: Arguments passed to the action
            additional_data: Any additional data to log
        """
        
        # Extract action proposal (last message) and context for LLM
        action_proposal = None
        llm_context = []
        
        if action_context:
            # Action proposal is the last message
            if action_context:
                last_msg = action_context[-1]
                content = getattr(last_msg, "content", "")
                # Handle different content types for action proposal
                if hasattr(content, '__iter__') and not isinstance(content, str):
                    serialized_content = []
                    for item in content:
                        if hasattr(item, '__class__') and 'Image' in item.__class__.__name__:
                            serialized_content.append(f"[Image: {getattr(item, 'alt_text', 'no alt text')}]")
                        else:
                            serialized_content.append(str(item))
                    action_proposal = "\n".join(serialized_content)
                elif hasattr(content, '__class__') and 'Image' in content.__class__.__name__:
                    action_proposal = f"[Image: {getattr(content, 'alt_text', 'no alt text')}]"
                else:
                    action_proposal = str(content)
            
            # Context that would go to LLM (all messages except the last one, limited to last 5)
            context_messages = action_context[:-1]
            if len(context_messages) > 5:
                context_messages = context_messages[-5:]
            
            for msg in context_messages:
                content = getattr(msg, "content", "")
                # Handle different content types
                if hasattr(content, '__iter__') and not isinstance(content, str):
                    serialized_content = []
                    for item in content:
                        if hasattr(item, '__class__') and 'Image' in item.__class__.__name__:
                            serialized_content.append(f"[Image: {getattr(item, 'alt_text', 'no alt text')}]")
                        else:
                            serialized_content.append(str(item))
                    content = "\n".join(serialized_content)
                elif hasattr(content, '__class__') and 'Image' in content.__class__.__name__:
                    content = f"[Image: {getattr(content, 'alt_text', 'no alt text')}]"
                else:
                    content = str(content)
                
                llm_context.append({
                    "role": getattr(msg, "role", "unknown"),
                    "content": content,
                    "type": type(msg).__name__
                })

        # Extract action guard context (the exact messages sent to LLM)
        action_guard_context = []
        if additional_data and "llm_request_messages" in additional_data:
            llm_request_messages = additional_data["llm_request_messages"]
            for msg in llm_request_messages:
                content = getattr(msg, "content", "")
                # Handle different content types
                if hasattr(content, '__iter__') and not isinstance(content, str):
                    serialized_content = []
                    for item in content:
                        if hasattr(item, '__class__') and 'Image' in item.__class__.__name__:
                            serialized_content.append(f"[Image: {getattr(item, 'alt_text', 'no alt text')}]")
                        else:
                            serialized_content.append(str(item))
                    content = "\n".join(serialized_content)
                elif hasattr(content, '__class__') and 'Image' in content.__class__.__name__:
                    content = f"[Image: {getattr(content, 'alt_text', 'no alt text')}]"
                else:
                    content = str(content)
                
                action_guard_context.append({
                    "role": getattr(msg, "role", "unknown"),
                    "content": content,
                    "type": type(msg).__name__
                })

        # Create simplified log entry with only requested fields
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "llm_context": llm_context,
            "action_proposal": action_proposal,
            "action_guard_context": action_guard_context,
            "approved_by_llm": needs_approval,
            "baseline": baseline,
            "llm_guess": llm_guess
        }
        
        # Write to file
        with open(self.log_file, "a") as f:
            f.write(json.dumps(log_entry) + "\n")

# Global tracker instance
_tracker = ActionGuardTracker()

def get_tracker() -> ActionGuardTracker:
    """Get the global action guard tracker instance."""
    return _tracker