#!/usr/bin/env python3
import os
import sys
import json
import argparse
from typing import Dict, List, Tuple
from collections import defaultdict
from magentic_ui.scripts.task_loader import get_tasks_for_system, Task


def get_mean_scores_per_run_by_website(
    runs_path: str, k: int = 5
) -> Dict[str, Dict[int, float]]:
    """
    Calculate mean scores for each run grouped by website from individual score.json files.

    Returns:
        Dict mapping website to (run_id -> mean_score)
    """
    website_mean_scores = defaultdict(dict)

    for run_id in range(1, k + 1):
        run_path = os.path.join(runs_path, str(run_id))
        if not os.path.exists(run_path):
            continue

        # Group scores by website for this run
        website_scores = defaultdict(list)

        # Walk through all score.json files in this run
        for root, dirs, files in os.walk(run_path):
            if "score.json" in files:
                score_path = os.path.join(root, "score.json")
                try:
                    with open(score_path, "r") as f:
                        score_data = json.load(f)
                        score = score_data.get("score", 0.0)

                    # Extract website from task ID (e.g., "ArXiv--15" -> "ArXiv")
                    path_parts = root.split(os.sep)
                    # The task ID is the directory containing score.json
                    task_id = path_parts[-1]
                    # Extract website name from task ID (everything before "--")
                    if "--" in task_id:
                        website = task_id.split("--")[0]
                        website_scores[website].append(score)
                except Exception as e:
                    continue

        # Calculate mean score for each website in this run
        for website, scores in website_scores.items():
            if scores:
                website_mean_scores[website][run_id] = sum(scores) / len(scores)

    return dict(website_mean_scores)


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


def calculate_pass_at_k_by_website(
    tasks: List[Task], runs_path: str, k: int = 5
) -> Dict[str, Tuple[float, Dict[int, int]]]:
    """
    Calculate pass@k metric and distribution of success counts grouped by website.

    Returns:
        Dict mapping website to (pass@k score, distribution dict)
    """
    website_stats = defaultdict(lambda: {"tasks": [], "distribution": defaultdict(int)})

    # Group tasks by website and count successes
    for task in tasks:
        website = task.website
        website_stats[website]["tasks"].append(task)

        # Count successful runs for this task (score == 1.0)
        successes = sum(1 for run in task.task_runs if run.score == 1.0)
        # Cap at k for pass@k calculation
        successes_capped = min(successes, k)
        website_stats[website]["distribution"][successes] += 1

    # Calculate pass@k for each website
    results = {}
    for website, stats in website_stats.items():
        distribution = stats["distribution"]
        total_tasks = len(stats["tasks"])

        # Calculate pass@k: tasks with at least 1 success out of k attempts
        tasks_with_success = sum(
            count for num_successes, count in distribution.items() if num_successes > 0
        )
        pass_at_k = (tasks_with_success / total_tasks * 100) if total_tasks > 0 else 0.0

        results[website] = (pass_at_k, dict(distribution))

    return results


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
    website_results = calculate_pass_at_k_by_website(tasks, runs_path, k)

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

    # Print per-website statistics
    print(f"\n{'='*60}")
    print(f"Per-Website Pass@{k} Analysis")
    print(f"{'='*60}")

    # Get per-website mean scores from metrics_by_website.json files
    website_mean_scores_by_run = get_mean_scores_per_run_by_website(runs_path, k)

    # Sort websites by pass@k score (descending)
    sorted_websites = sorted(
        website_results.items(), key=lambda x: x[1][0], reverse=True
    )

    for website, (website_pass_at_k, website_distribution) in sorted_websites:
        print(f"\n{'='*40}")
        print(f"Website: {website}")
        print(f"{'='*40}")

        # Count total tasks for this website
        website_task_count = sum(website_distribution.values())
        print(f"Pass@{k}: {website_pass_at_k:.2f}%")
        print(f"Total tasks: {website_task_count}")

        # Print distribution for this website
        print(f"\nSuccess Distribution:")
        for num_successes in range(k + 1):
            count = website_distribution.get(num_successes, 0)
            percentage = (
                (count / website_task_count * 100) if website_task_count > 0 else 0
            )
            bar_length = int(percentage / 2)  # Scale to fit in terminal
            bar = "█" * bar_length
            print(
                f"{num_successes} successes: {count:4d} tasks ({percentage:6.2f}%) {bar}"
            )

        # Website-specific statistics
        perfect_tasks = website_distribution.get(k, 0)
        failed_tasks = website_distribution.get(0, 0)

        print(f"\nWebsite Statistics:")
        print(f"Perfect score ({k}/{k}): {perfect_tasks}")
        print(f"No success (0/{k}): {failed_tasks}")

        # Calculate and display mean score from per-run scores
        # Use the per-website mean scores if available
        if (
            website in website_mean_scores_by_run
            and website_mean_scores_by_run[website]
        ):
            website_per_run_scores = website_mean_scores_by_run[website]
            website_mean_score = sum(website_per_run_scores.values()) / len(
                website_per_run_scores
            )
            print(
                f"Mean score (averaged from per-run scores): {website_mean_score:.4f}"
            )

            # Show per-run scores
            print(f"\nPer-Run Mean Scores:")
            for run_id in sorted(website_per_run_scores.keys()):
                score = website_per_run_scores[run_id]
                bar_length = int(score * 50)
                bar = "█" * bar_length
                print(f"Run {run_id}: {score:.4f} {bar}")


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
