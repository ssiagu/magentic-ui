#!/usr/bin/env python3
"""
Script to view action guard call logs in a readable format.
"""

import json
import argparse
from pathlib import Path
from datetime import datetime

def format_timestamp(ts_str):
    """Format timestamp string to a more readable format."""
    try:
        dt = datetime.fromisoformat(ts_str)
        return dt.strftime("%Y-%m-%d %H:%M:%S")
    except ValueError:
        return ts_str

def format_context(context):
    """Format context messages for display."""
    if not context:
        return "No context"
    
    formatted = []
    for i, msg in enumerate(context):
        role = msg.get("role", "unknown")
        content = msg.get("content", "")
        msg_type = msg.get("type", "unknown")
        formatted.append(f"  [{i+1}] {role} ({msg_type}): {content[:100]}{'...' if len(content) > 100 else ''}")
    
    return "\n".join(formatted)

def view_logs(log_file="action_guard_calls.jsonl", call_type=None, action_name=None):
    """View action guard logs with optional filtering."""
    log_path = Path(log_file)
    
    if not log_path.exists():
        print(f"Log file '{log_file}' not found!")
        return
    
    print(f"Reading logs from: {log_path.absolute()}")
    print("=" * 80)
    
    with open(log_path, 'r') as f:
        for line_no, line in enumerate(f, 1):
            try:
                entry = json.loads(line.strip())
                
                # Apply filters
                if call_type and entry.get("call_type") != call_type:
                    continue
                if action_name and entry.get("action_name") != action_name:
                    continue
                
                # Display entry
                print(f"\n[{line_no}] {format_timestamp(entry['timestamp'])}")
                print(f"Call Type: {entry['call_type']}")
                print(f"Action: {entry['action_name']}")
                
                if entry.get("baseline"):
                    print(f"Baseline: {entry['baseline']}")
                if entry.get("llm_guess"):
                    print(f"LLM Guess: {entry['llm_guess']}")
                if entry.get("needs_approval") is not None:
                    print(f"Needs Approval: {entry['needs_approval']}")
                if entry.get("approved") is not None:
                    print(f"Approved: {entry['approved']}")
                
                if entry.get("context"):
                    print(f"Context:\n{format_context(entry['context'])}")
                
                if entry.get("call_arguments"):
                    print(f"Arguments: {entry['call_arguments']}")
                
                if entry.get("additional_data"):
                    print(f"Additional Data: {entry['additional_data']}")
                
                print("-" * 40)
                
            except json.JSONDecodeError:
                print(f"Line {line_no}: Invalid JSON - {line.strip()}")
            except Exception as e:
                print(f"Line {line_no}: Error parsing - {e}")

def main():
    parser = argparse.ArgumentParser(description="View action guard call logs")
    parser.add_argument("--log-file", default="action_guard_calls.jsonl", 
                       help="Path to the log file (default: action_guard_calls.jsonl)")
    parser.add_argument("--call-type", choices=["requires_approval", "get_approval", "invoke_with_approval"],
                       help="Filter by call type")
    parser.add_argument("--action-name", help="Filter by action name")
    
    args = parser.parse_args()
    
    view_logs(args.log_file, args.call_type, args.action_name)

if __name__ == "__main__":
    main()