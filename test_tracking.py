#!/usr/bin/env python3
"""
Simple test script to verify action guard tracking is working.
"""

import asyncio
import json
from pathlib import Path
from autogen_core.models import SystemMessage, UserMessage

# Add the source directory to the path
import sys
sys.path.insert(0, 'src')

from magentic_ui.approval_guard import ApprovalGuard, ApprovalConfig
from magentic_ui.guarded_action import GuardedAction
from magentic_ui.action_guard_tracker import get_tracker
from autogen_agentchat.messages import TextMessage

async def test_action_guard_tracking():
    """Test that action guard calls are being tracked properly."""
    print("Testing action guard tracking...")
    
    # Create a simple approval guard
    config = ApprovalConfig(approval_policy="never")
    guard = ApprovalGuard(config=config)
    
    # Test requires_approval method
    print("\n1. Testing requires_approval...")
    context = [
        SystemMessage(content="System message"),
        UserMessage(content="User wants to perform action X", source="user")
    ]
    
    result = await guard.requires_approval("maybe", "never", context)
    print(f"   Result: {result}")
    
    # Test get_approval method
    print("\n2. Testing get_approval...")
    action_desc = TextMessage(content="Test action description", source="assistant")
    approval_result = await guard.get_approval(action_desc)
    print(f"   Result: {approval_result}")
    
    # Test with GuardedAction
    print("\n3. Testing GuardedAction.invoke_with_approval...")
    
    def test_action(arg1, arg2):
        return f"Action executed with {arg1} and {arg2}"
    
    guarded_action = GuardedAction(
        name="test_action",
        action=test_action
    )
    
    try:
        result = await guarded_action.invoke_with_approval(
            call_arguments={"arg1": "value1", "arg2": "value2"},
            action_description=TextMessage(content="Test action", source="assistant"),
            action_context=context,
            action_guard=guard
        )
        print(f"   Result: {result}")
    except Exception as e:
        print(f"   Exception: {e}")
    
    # Check the log file
    print("\n4. Checking log file...")
    log_file = Path("action_guard_calls.jsonl")
    if log_file.exists():
        with open(log_file, 'r') as f:
            lines = f.readlines()
            print(f"   Found {len(lines)} log entries:")
            for i, line in enumerate(lines, 1):
                try:
                    entry = json.loads(line.strip())
                    print(f"   {i}. {entry['timestamp']}: {entry['call_type']} - {entry.get('action_name', 'unknown')}")
                except json.JSONDecodeError:
                    print(f"   {i}. Invalid JSON: {line.strip()}")
    else:
        print("   Log file not found!")

if __name__ == "__main__":
    asyncio.run(test_action_guard_tracking())