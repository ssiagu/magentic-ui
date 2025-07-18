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

def format_action_proposal(proposal):
    """Format action proposal for display."""
    if not proposal:
        return "No action proposal"
    return proposal[:200] + "..." if len(proposal) > 200 else proposal

def view_logs(log_file="action_guard_calls.jsonl"):
    """View action guard logs in simplified format."""
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
                
                # Display simplified entry
                print(f"\n[{line_no}] {format_timestamp(entry['timestamp'])}")
                
                if entry.get("baseline"):
                    print(f"Baseline: {entry['baseline']}")
                if entry.get("llm_guess"):
                    print(f"LLM Guess: {entry['llm_guess']}")
                if entry.get("approved_by_llm") is not None:
                    print(f"Approved by LLM: {entry['approved_by_llm']}")
                
                if entry.get("action_proposal"):
                    print(f"Action Proposal:\n  {format_action_proposal(entry['action_proposal'])}")
                
                if entry.get("llm_context"):
                    print(f"LLM Context:\n{format_context(entry['llm_context'])}")
                
                if entry.get("action_guard_context"):
                    print(f"Action Guard Context (sent to LLM):\n{format_context(entry['action_guard_context'])}")
                
                print("-" * 40)
                
            except json.JSONDecodeError:
                print(f"Line {line_no}: Invalid JSON - {line.strip()}")
            except Exception as e:
                print(f"Line {line_no}: Error parsing - {e}")

def main():
    parser = argparse.ArgumentParser(description="View action guard call logs")
    parser.add_argument("--log-file", default="action_guard_calls.jsonl", 
                       help="Path to the log file (default: action_guard_calls.jsonl)")
    
    args = parser.parse_args()
    
    view_logs(args.log_file)

if __name__ == "__main__":
    main()