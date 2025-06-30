import os
import json
import glob
from typing import List, Dict
from dataclasses import dataclass


@dataclass
class TaskRun:
    trajectory: str
    score: float
    answer: str
    evaluation: str


@dataclass
class Task:
    task_id: str
    task_description: str
    task_runs: List[TaskRun]
    website: str = ""


DATASET_MAPPING = {
    "WebVoyager": "/home/t-waynechi/dev/magentic-ui/data/WebVoyager/WebVoyager_data.jsonl",
    "OnlineMind2Web": "/home/t-waynechi/dev/magentic-ui/data/OnlineMind2Web/Online_Mind2Web.json",
}


def get_task_runs_for_task_id(runs_path: str, task_id: str) -> List[TaskRun]:
    # runs_path (runs/MagenticUI_web_surfer_only_insights/OnlineMind2Web/train)
    # Search in runs_path via glob for messages with this format.
    message_filename = f"{task_id}_messages.json"
    score_filename = "score.json"
    answer_filename = f"{task_id}_answer.json"
    task_runs: List[TaskRun] = []

    # Search for all message files matching the pattern across all run subdirectories
    pattern = os.path.join(runs_path, "*", task_id, message_filename)
    message_files = glob.glob(pattern)

    for message_file in message_files:
        try:
            # Get message parent path
            run_path = os.path.dirname(message_file)
            with open(
                os.path.join(run_path, score_filename), "r", encoding="utf-8"
            ) as f:
                score_data = json.load(f)
                score = score_data["score"]
                evaluation = score_data["reasoning"]
            with open(
                os.path.join(run_path, answer_filename), "r", encoding="utf-8"
            ) as f:
                answer_data = json.load(f)
                answer = answer_data["answer"]
            with open(message_file, "r", encoding="utf-8") as f:
                messages = json.load(f)
                trajectory = json.dumps(messages, indent=2)
            task_runs.append(
                TaskRun(
                    trajectory=trajectory,
                    score=score,
                    answer=answer,
                    evaluation=evaluation,
                )
            )
        except (FileNotFoundError, json.JSONDecodeError) as e:
            print(f"Error reading {message_file}: {e}")
            continue

    return task_runs


def get_tasks_for_system(runs_path: str, dataset: str) -> List[Task]:
    task_description_mapping = create_task_description_mapping(dataset)
    task_website_mapping = create_task_website_mapping(dataset)

    # Get all run directories
    if os.path.exists(runs_path) and os.path.isdir(runs_path):
        run_dirs = [
            d
            for d in os.listdir(runs_path)
            if d.isdigit() and os.path.isdir(os.path.join(runs_path, d))
        ]

        # Initialize with tasks from first run
        if not run_dirs:
            print(f"No run directories found in: {runs_path}")
            return []

        first_run_path = os.path.join(runs_path, run_dirs[0])
        task_ids = set(
            item
            for item in os.listdir(first_run_path)
            if os.path.isdir(os.path.join(first_run_path, item))
        )
        print(f"Run {run_dirs[0]}: found {len(task_ids)} tasks")

        # Take intersection with tasks from subsequent runs
        for run_dir in run_dirs[1:]:
            run_path = os.path.join(runs_path, run_dir)
            run_tasks = set(
                item
                for item in os.listdir(run_path)
                if os.path.isdir(os.path.join(run_path, item))
            )
            task_ids.intersection_update(run_tasks)
            print(
                f"Run {run_dir}: found {len(run_tasks)} tasks, {len(task_ids)} tasks in common so far"
            )
    else:
        print(f"Runs path does not exist or is not a directory: {runs_path}")
        return []

    print(f"Total unique tasks across all runs: {len(task_ids)}")

    with open("task_ids.txt", "w") as f:
        for task_id in sorted(task_ids):
            f.write(f"{task_id}\n")

    tasks: List[Task] = []
    for task_id in sorted(task_ids):
        task_runs = get_task_runs_for_task_id(runs_path, task_id)
        if len(task_runs) == 0:
            print(f"No task runs found for task {task_id}")
            continue
        tasks.append(
            Task(
                task_id=task_id,
                task_description=task_description_mapping.get(task_id, ""),
                task_runs=task_runs,
                website=task_website_mapping.get(task_id, "Unknown"),
            )
        )

    print(f"Found {len(tasks)} processable tasks out of {len(task_ids)} total tasks")

    return tasks


def create_task_description_mapping(dataset: str) -> Dict[str, str]:
    task_description_mapping: Dict[str, str] = {}
    if dataset == "WebVoyager":
        with open(DATASET_MAPPING[dataset], "r", encoding="utf-8") as f:
            for line in f:
                task = json.loads(line)
                task_description_mapping[task["id"]] = task["ques"]
    elif dataset == "OnlineMind2Web":
        with open(DATASET_MAPPING[dataset], "r", encoding="utf-8") as f:
            data = json.load(f)
            for task in data:
                task_description_mapping[task["task_id"]] = task["confirmed_task"]
    else:
        raise ValueError(f"Unsupported dataset: {dataset}")

    return task_description_mapping


def create_task_website_mapping(dataset: str) -> Dict[str, str]:
    task_website_mapping: Dict[str, str] = {}
    if dataset == "WebVoyager":
        with open(DATASET_MAPPING[dataset], "r", encoding="utf-8") as f:
            for line in f:
                task = json.loads(line)
                task_website_mapping[task["id"]] = task.get("web_name", "Unknown")
    elif dataset == "OnlineMind2Web":
        # For OnlineMind2Web, extract website from task_id or use default
        # This may need adjustment based on actual data format
        pass
    else:
        raise ValueError(f"Unsupported dataset: {dataset}")

    return task_website_mapping
