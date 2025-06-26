#!/usr/bin/env python3
import os
import sys
import json
import argparse
from typing import Dict, List, Tuple
from collections import defaultdict
from magentic_ui.scripts.task_loader import get_tasks_for_system, Task


def get_mean_scores_per_run(runs_path: str, k: int = 5) -> Dict[int, float]:
    """
    Get mean_score for each run from metrics.json files.

    Returns:
        Dict mapping run_id to mean_score
    """
    mean_scores = {}

    for run_id in range(1, k + 1):
        metrics_path = os.path.join(runs_path, str(run_id), "metrics.json")
        if os.path.exists(metrics_path):
            try:
                with open(metrics_path, "r") as f:
                    metrics = json.load(f)
                    mean_scores[run_id] = metrics.get("mean_score", 0.0)
            except Exception as e:
                print(f"Warning: Could not read metrics for run {run_id}: {e}")
                mean_scores[run_id] = 0.0
        else:
            mean_scores[run_id] = 0.0

    return mean_scores


def calculate_pass_at_k(tasks: List[Task], k: int = 5) -> Tuple[float, Dict[int, int]]:
    """
    Calculate pass@k metric and distribution of success counts.

    Returns:
        - pass@k score (percentage)
        - Distribution dict: {num_successes: count_of_tasks}
    """
    task_success_counts = defaultdict(int)

    for task in tasks:
        # Count successful runs for this task (score == 1.0)
        successes = sum(1 for run in task.task_runs if run.score == 1.0)
        # Cap at k for pass@k calculation
        successes_capped = min(successes, k)
        task_success_counts[successes] += 1

    # Calculate pass@k: tasks with at least 1 success out of k attempts
    tasks_with_success = sum(
        count
        for num_successes, count in task_success_counts.items()
        if num_successes > 0
    )
    total_tasks = len(tasks)
    pass_at_k = (tasks_with_success / total_tasks * 100) if total_tasks > 0 else 0.0

    return pass_at_k, dict(task_success_counts)


def print_analysis(runs_path: str, dataset: str, k: int = 5):
    """Print pass@k analysis and success distribution."""
    print(f"\n{'='*60}")
    print(f"Pass@{k} Analysis for {dataset}")
    print(f"Runs path: {runs_path}")
    print(f"{'='*60}\n")

    # Load tasks
    tasks = get_tasks_for_system(runs_path, dataset)

    if not tasks:
        print("No tasks found!")
        return

    # Calculate metrics
    pass_at_k, distribution = calculate_pass_at_k(tasks, k)

    # Print overall pass@k
    print(f"\nOverall Pass@{k}: {pass_at_k:.2f}%")
    print(f"Total tasks analyzed: {len(tasks)}")

    # Print distribution
    print(f"\n{'='*40}")
    print(f"Task Success Distribution (out of {k} runs):")
    print(f"{'='*40}")

    # Sort by number of successes
    for num_successes in range(k + 1):
        count = distribution.get(num_successes, 0)
        percentage = (count / len(tasks) * 100) if len(tasks) > 0 else 0
        bar_length = int(percentage / 2)  # Scale to fit in terminal
        bar = "█" * bar_length
        print(f"{num_successes} successes: {count:4d} tasks ({percentage:6.2f}%) {bar}")

    # Additional statistics
    print(f"\n{'='*40}")
    print("Summary Statistics:")
    print(f"{'='*40}")

    # Tasks with perfect score
    perfect_tasks = distribution.get(k, 0)
    print(f"Tasks with perfect score ({k}/{k}): {perfect_tasks}")

    # Tasks with no success
    failed_tasks = distribution.get(0, 0)
    print(f"Tasks with no success (0/{k}): {failed_tasks}")

    # Average success rate
    total_successes = sum(
        num_successes * count for num_successes, count in distribution.items()
    )
    total_attempts = len(tasks) * k
    avg_success_rate = (
        (total_successes / total_attempts * 100) if total_attempts > 0 else 0
    )
    print(f"Average success rate: {avg_success_rate:.2f}%")

    # Mean scores per run
    mean_scores = get_mean_scores_per_run(runs_path, k)
    print(f"\n{'='*40}")
    print("Mean Scores Per Run:")
    print(f"{'='*40}")
    for run_id in sorted(mean_scores.keys()):
        score = mean_scores[run_id]
        bar_length = int(
            score * 50
        )  # Scale to fit in terminal (0-1 score to 0-50 chars)
        bar = "█" * bar_length
        print(f"Run {run_id}: {score:.4f} {bar}")

    # Overall mean score across all runs
    if mean_scores:
        overall_mean = sum(mean_scores.values()) / len(mean_scores)
        print(f"\nOverall mean score across all runs: {overall_mean:.4f}")


def main():
    parser = argparse.ArgumentParser(
        description="Calculate pass@k metrics for evaluation runs"
    )
    parser.add_argument(
        "runs_path",
        help="Path to the runs directory (e.g., runs/MagenticUI_web_surfer_only/WebVoyager/webvoyager/train)",
    )
    parser.add_argument(
        "dataset", choices=["WebVoyager", "OnlineMind2Web"], help="Dataset name"
    )
    parser.add_argument(
        "-k", type=int, default=5, help="k value for pass@k calculation (default: 5)"
    )

    args = parser.parse_args()

    # Validate runs path
    if not os.path.exists(args.runs_path):
        print(f"Error: Runs path does not exist: {args.runs_path}")
        sys.exit(1)

    print_analysis(args.runs_path, args.dataset, args.k)


if __name__ == "__main__":
    main()
