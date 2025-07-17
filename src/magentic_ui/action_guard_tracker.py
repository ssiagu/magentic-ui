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
        
        # Serialize context messages
        context_data = []
        if action_context:
            for msg in action_context:
                content = getattr(msg, "content", "")
                # Handle different content types
                if hasattr(content, '__iter__') and not isinstance(content, str):
                    # Handle multimodal content (list of strings and Images)
                    serialized_content = []
                    for item in content:
                        if hasattr(item, '__class__') and 'Image' in item.__class__.__name__:
                            serialized_content.append(f"[Image: {getattr(item, 'alt_text', 'no alt text')}]")
                        else:
                            serialized_content.append(str(item))
                    content = "\n".join(serialized_content)
                elif hasattr(content, '__class__') and 'Image' in content.__class__.__name__:
                    # Handle single Image objects
                    content = f"[Image: {getattr(content, 'alt_text', 'no alt text')}]"
                else:
                    content = str(content)
                
                context_data.append({
                    "role": getattr(msg, "role", "unknown"),
                    "content": content,
                    "type": type(msg).__name__
                })
        
        # Serialize call arguments to handle non-JSON serializable objects
        serialized_call_arguments = None
        if call_arguments:
            serialized_call_arguments = {}
            for key, value in call_arguments.items():
                try:
                    # Try to serialize the value
                    json.dumps(value)
                    serialized_call_arguments[key] = value
                except (TypeError, ValueError):
                    # If it fails, convert to string representation
                    serialized_call_arguments[key] = str(value)

        # Create log entry
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "call_type": call_type,
            "action_name": action_name,
            "baseline": baseline,
            "llm_guess": llm_guess,
            "context": context_data,
            "needs_approval": needs_approval,
            "approved": approved,
            "call_arguments": serialized_call_arguments,
            "additional_data": additional_data or {}
        }
        
        # Write to file
        with open(self.log_file, "a") as f:
            f.write(json.dumps(log_entry) + "\n")

# Global tracker instance
_tracker = ActionGuardTracker()

def get_tracker() -> ActionGuardTracker:
    """Get the global action guard tracker instance."""
    return _tracker