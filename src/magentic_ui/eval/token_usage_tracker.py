"""Token usage tracking for evaluation runs."""

import json
import logging
from typing import Any, Dict, List, Optional, Union
from collections import defaultdict
from threading import Lock

from autogen_core.models import ChatCompletionClient, CreateResult, LLMMessage

logger = logging.getLogger(__name__)


class TokenUsageTracker:
    """Thread-safe tracker for token usage during evaluation runs."""
    
    def __init__(self):
        self._lock = Lock()
        self._usage_data: Dict[str, Dict[str, Any]] = defaultdict(lambda: {
            "total_input_tokens": 0,
            "total_output_tokens": 0,
            "total_tokens": 0,
            "requests": []
        })
    
    def record_usage(self, client_name: str, result: CreateResult) -> None:
        """Record token usage from a ChatCompletionClient result.
        
        Args:
            client_name: Name/identifier of the client making the request
            result: The CreateResult containing usage information
        """
        if not hasattr(result, 'usage') or result.usage is None:
            return
            
        usage = result.usage
        input_tokens = getattr(usage, 'prompt_tokens', 0) or getattr(usage, 'input_tokens', 0)
        output_tokens = getattr(usage, 'completion_tokens', 0) or getattr(usage, 'output_tokens', 0)
        total_tokens = getattr(usage, 'total_tokens', 0) or (input_tokens + output_tokens)
        
        with self._lock:
            client_data = self._usage_data[client_name]
            client_data["total_input_tokens"] += input_tokens
            client_data["total_output_tokens"] += output_tokens
            client_data["total_tokens"] += total_tokens
            client_data["requests"].append({
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "total_tokens": total_tokens
            })
    
    def get_usage_summary(self) -> Dict[str, Any]:
        """Get a summary of all recorded token usage."""
        with self._lock:
            summary = {
                "clients": dict(self._usage_data),
                "grand_total": {
                    "total_input_tokens": sum(data["total_input_tokens"] for data in self._usage_data.values()),
                    "total_output_tokens": sum(data["total_output_tokens"] for data in self._usage_data.values()),
                    "total_tokens": sum(data["total_tokens"] for data in self._usage_data.values()),
                    "total_requests": sum(len(data["requests"]) for data in self._usage_data.values())
                }
            }
            return summary
    
    def save_to_file(self, filepath: str) -> None:
        """Save token usage data to a JSON file."""
        summary = self.get_usage_summary()
        with open(filepath, 'w') as f:
            json.dump(summary, f, indent=2)
        logger.info(f"Token usage data saved to {filepath}")
    
    def clear(self) -> None:
        """Clear all recorded usage data."""
        with self._lock:
            self._usage_data.clear()


class TokenTrackingChatCompletionClient:
    """Wrapper around ChatCompletionClient that tracks token usage."""
    
    def __init__(self, client: ChatCompletionClient, tracker: TokenUsageTracker, client_name: str):
        self._client = client
        self._tracker = tracker
        self._client_name = client_name
    
    async def create(self, messages: List[LLMMessage], **kwargs) -> CreateResult:
        """Create a chat completion and track token usage."""
        result = await self._client.create(messages, **kwargs)
        self._tracker.record_usage(self._client_name, result)
        return result
    
    def __getattr__(self, name):
        """Delegate all other attributes to the wrapped client."""
        return getattr(self._client, name)


# Global token usage tracker instance
_global_tracker = TokenUsageTracker()


def get_global_tracker() -> TokenUsageTracker:
    """Get the global token usage tracker instance."""
    return _global_tracker


def wrap_client_with_tracking(client: ChatCompletionClient, client_name: str) -> TokenTrackingChatCompletionClient:
    """Wrap a ChatCompletionClient with token usage tracking.
    
    Args:
        client: The ChatCompletionClient to wrap
        client_name: Name/identifier for this client
        
    Returns:
        Wrapped client that records token usage
    """
    return TokenTrackingChatCompletionClient(client, _global_tracker, client_name)