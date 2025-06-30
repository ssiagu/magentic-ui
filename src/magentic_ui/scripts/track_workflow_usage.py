#!/usr/bin/env python3
import os
import json
import re
import argparse
from collections import defaultdict
from typing import Dict, List, Set
from magentic_ui.scripts.task_loader import get_tasks_for_system


def extract_workflows_from_trajectory(trajectory: str) -> List[int]:
    """Extract workflow numbers from trajectory, excluding prompt instructions."""
    workflows = []

    # Parse the trajectory JSON
    try:
        messages = json.loads(trajectory)
    except json.JSONDecodeError:
        print(f"Error parsing trajectory JSON")
        return workflows

    # Process each message
    for message in messages:
        if isinstance(message, dict) and "content" in message:
            content = message["content"]

            # Skip if this is likely a system/prompt message containing instructions
            if "You must output [WORKFLOW" in content:
                continue

            # Find all instances of [WORKFLOW #]
            pattern = r"\[WORKFLOW\s+(\d+)\]"
            matches = re.findall(pattern, content)
            workflows.extend([int(match) for match in matches])

    return workflows


def track_workflow_usage(runs_path: str, dataset: str = "WebVoyager"):
    """Track workflow usage across all trajectories in a runs folder."""
    workflow_counts = defaultdict(int)
    task_workflow_map = defaultdict(set)  # Track which tasks use which workflows
    workflow_scores = defaultdict(
        list
    )  # Track scores for trajectories using each workflow
    task_workflow_score_map = defaultdict(
        lambda: defaultdict(list)
    )  # workflow -> task_id -> scores

    print(f"Loading tasks from: {runs_path}")
    tasks = get_tasks_for_system(runs_path, dataset)

    total_trajectories = 0
    for task in tasks:
        for task_run in task.task_runs:
            total_trajectories += 1
            workflows = extract_workflows_from_trajectory(task_run.trajectory)

            for workflow_num in workflows:
                workflow_counts[workflow_num] += 1
                task_workflow_map[workflow_num].add(task.task_id)
                workflow_scores[workflow_num].append(task_run.score)
                task_workflow_score_map[workflow_num][task.task_id].append(
                    task_run.score
                )

    print(f"\nProcessed {total_trajectories} trajectories from {len(tasks)} tasks")

    return workflow_counts, task_workflow_map, workflow_scores, task_workflow_score_map


def main():
    parser = argparse.ArgumentParser(description="Track workflow usage in trajectories")
    parser.add_argument("runs_path", type=str, help="Path to the runs folder")
    parser.add_argument(
        "--dataset",
        type=str,
        default="WebVoyager",
        choices=["WebVoyager", "OnlineMind2Web"],
        help="Dataset type (default: WebVoyager)",
    )
    parser.add_argument("--output", type=str, help="Output file for results (optional)")

    args = parser.parse_args()

    # Track workflow usage
    workflow_counts, task_workflow_map, workflow_scores, task_workflow_score_map = (
        track_workflow_usage(args.runs_path, args.dataset)
    )

    # Display results
    print("\n" + "=" * 80)
    print("WORKFLOW USAGE STATISTICS")
    print("=" * 80)

    if not workflow_counts:
        print("No workflows found in the trajectories.")
    else:
        # Sort by workflow number
        sorted_workflows = sorted(workflow_counts.items())

        print(
            f"\n{'Workflow':<15} {'Count':<10} {'Avg Score':<12} {'Tasks Using':<12} {'Task IDs'}"
        )
        print("-" * 80)

        total_usage = 0
        for workflow_num, count in sorted_workflows:
            num_tasks = len(task_workflow_map[workflow_num])
            avg_score = (
                sum(workflow_scores[workflow_num]) / len(workflow_scores[workflow_num])
                if workflow_scores[workflow_num]
                else 0
            )
            task_ids = sorted(task_workflow_map[workflow_num])[
                :3
            ]  # Show first 3 task IDs
            task_ids_str = ", ".join(task_ids)
            if len(task_workflow_map[workflow_num]) > 3:
                task_ids_str += (
                    f", ... ({len(task_workflow_map[workflow_num]) - 3} more)"
                )

            print(
                f"[WORKFLOW {workflow_num}]".ljust(15)
                + f"{count:<10} {avg_score:<12.2f} {num_tasks:<12} {task_ids_str}"
            )
            total_usage += count

        print("-" * 80)
        print(f"{'Total':<15} {total_usage}")
        print(f"\nUnique workflows used: {len(workflow_counts)}")

        # Detailed task information per workflow
        print("\n" + "=" * 80)
        print("DETAILED TASK INFORMATION PER WORKFLOW")
        print("=" * 80)

        for workflow_num in sorted(workflow_counts.keys()):
            print(f"\n[WORKFLOW {workflow_num}]:")
            print(f"  Total usage: {workflow_counts[workflow_num]}")
            print(
                f"  Average score: {sum(workflow_scores[workflow_num]) / len(workflow_scores[workflow_num]):.2f}"
            )
            print(f"  Tasks using this workflow:")

            for task_id in sorted(task_workflow_map[workflow_num]):
                task_scores = task_workflow_score_map[workflow_num][task_id]
                avg_task_score = (
                    sum(task_scores) / len(task_scores) if task_scores else 0
                )
                print(
                    f"    - {task_id}: {len(task_scores)} uses, avg score: {avg_task_score:.2f}"
                )

        # Save results to file if requested
        if args.output:
            # Calculate workflow statistics
            workflow_stats = {}
            for workflow_num in workflow_counts:
                scores = workflow_scores[workflow_num]
                workflow_stats[workflow_num] = {
                    "count": workflow_counts[workflow_num],
                    "average_score": sum(scores) / len(scores) if scores else 0,
                    "min_score": min(scores) if scores else 0,
                    "max_score": max(scores) if scores else 0,
                    "tasks": {
                        task_id: {
                            "scores": task_workflow_score_map[workflow_num][task_id],
                            "average_score": sum(
                                task_workflow_score_map[workflow_num][task_id]
                            )
                            / len(task_workflow_score_map[workflow_num][task_id])
                            if task_workflow_score_map[workflow_num][task_id]
                            else 0,
                        }
                        for task_id in task_workflow_map[workflow_num]
                    },
                }

            results = {
                "runs_path": args.runs_path,
                "dataset": args.dataset,
                "workflow_counts": dict(workflow_counts),
                "workflow_statistics": workflow_stats,
                "task_workflow_map": {k: list(v) for k, v in task_workflow_map.items()},
                "total_trajectories": sum(
                    len(task.task_runs)
                    for task in get_tasks_for_system(args.runs_path, args.dataset)
                ),
                "total_usage": total_usage,
                "unique_workflows": len(workflow_counts),
            }

            with open(args.output, "w") as f:
                json.dump(results, f, indent=2)
            print(f"\nResults saved to: {args.output}")


if __name__ == "__main__":
    main()
