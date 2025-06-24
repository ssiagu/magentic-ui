import os
import json
import subprocess
import tempfile
import hashlib
from ..webvoyager.webvoyager import DynamicMemoryType
from typing import List, Union, Dict, Any
from datasets import load_dataset  # type: ignore
from swebench.harness.run_evaluation import main  # type: ignore

from ...benchmark import Benchmark
from ...utils import load_jsonl
from ...models import (
    SWEBenchTask,
    SWEBenchCandidate,
    SWEBenchEvalResult,
    AllTaskTypes,
    AllCandidateTypes,
    AllEvalResultTypes,
)

INSTRUCTION_PROMPT = """
[TASK]
The codebase and files have been pre-downloaded for your use. Here is the codebase / files needed to solve the task:
<codebase_path>

Try accessing the codebase / files first to understand the task.

The task is as follows:
<problem_statement>
[MEMORY]
<dynamic_memory_content>
"""

# Used for testing
# INSTRUCTION_PROMPT = """
# [TASK]
# This is a test. Repeat the following patch as an answer in the correct FINAL ANSWER format:
# diff --git a/sympy/core/sympify.py b/sympy/core/sympify.py\nindex 6a73a83..fb90e1a 100644\n--- a/sympy/core/sympify.py\n+++ b/sympy/core/sympify.py\n@@ -508,7 +508,7 @@ def sympify(a, locals=None, convert_xor=True, strict=False, rational=False,\n         converter[type(a)],\n         (SympifyError,\n          OverflowError,\n-         ValueError)):\n+         ValueError, AttributeError)):\n     return a\n
# [MEMORY]
# <dynamic_memory_content>
# """


class SWEBenchBenchmark(Benchmark):
    """
    Loads the SWE-bench Verified dataset and evaluates predictions using the SWE-bench harness.
    """

    def __init__(
        self,
        name: str = "SWEBench_Verified",
        data_dir: Union[str, None] = None,
        dynamic_memory_type: DynamicMemoryType = DynamicMemoryType.NONE,
        dynamic_memory_file: Union[str, None] = None,
    ):
        assert data_dir is not None, "data_dir must be provided for SWEBenchBenchmark"
        super().__init__(
            name=name,
            data_dir=data_dir,
        )
        assert self.data_dir is not None
        self.data_file = os.path.join(self.data_dir, "test.jsonl")
        self.repos_dir = os.path.join(self.data_dir, "repos")
        self.eval_result_class = SWEBenchEvalResult
        self.tasks: Dict[str, AllTaskTypes] = {}
        self.dynamic_memory_type = dynamic_memory_type
        if dynamic_memory_type == DynamicMemoryType.AWM:
            assert (
                dynamic_memory_file is not None
            ), "dynamic_memory_file must be provided for DynamicMemoryType.AWM"
            self.dynamic_memory_file = dynamic_memory_file
            with open(self.dynamic_memory_file, "r") as f:
                self.dynamic_memory_content = f.read()
                start_phrase = (
                    "Here are some workflows that may help you with your task:"
                )
                self.dynamic_memory_content = (
                    start_phrase + "\n" + self.dynamic_memory_content
                )
        elif dynamic_memory_type == DynamicMemoryType.INSIGHTS:
            assert (
                dynamic_memory_file is not None
            ), "dynamic_memory_file must be provided for DynamicMemoryType.INSIGHTS"
            self.dynamic_memory_file = dynamic_memory_file
            with open(self.dynamic_memory_file, "r") as f:
                self.dynamic_memory_content = f.read()
        else:
            print(f"No dynamic memory file provided for {dynamic_memory_type}")

    def download_dataset(self) -> None:
        """
        Download the SWE-bench dataset from HuggingFace.
        """
        assert self.data_dir is not None
        if not os.path.exists(self.data_dir):
            os.makedirs(self.data_dir, exist_ok=True)

        # Download SWE-bench dataset using load_dataset
        # Note that this "test split" is not the same as our train/test split
        dataset = load_dataset(f"princeton-nlp/{self.name}", split="test")
        dataset.to_json(self.data_file, orient="records", lines=True)  # type: ignore

    def _get_split_for_repo(self, repo: str) -> str:
        """
        Create splits for the dataset based on repository.
        """
        repo_hash = hashlib.md5(repo.encode("utf-8")).hexdigest()
        hash_value = int(repo_hash[:2], 16)  # 0-255

        if hash_value < 175:  # 0-174 is closer to 50% for swebench
            split = "train"
        else:
            split = "test"

        return split

    def _get_repo_path(self, repo: str) -> str:
        """
        Get the path to the repository.
        """
        owner, repo_name = repo.split("/")
        return os.path.abspath(os.path.join(self.repos_dir, owner, repo_name))

    def load_dataset(self):
        """
        Loads the SWE-bench Verified dataset and creates SWEBenchTask objects.
        """
        data = load_jsonl(self.data_file)

        for item in data:
            split = self._get_split_for_repo(item["repo"])

            repo_path = self._get_repo_path(item["repo"])

            question = item["problem_statement"]
            question = INSTRUCTION_PROMPT.replace("<problem_statement>", question)
            question = question.replace("<codebase_path>", repo_path)
            question = question.replace("<dynamic_memory_content>", "")

            task = SWEBenchTask(
                id=item["instance_id"],
                question=question,
                ground_truth=item["patch"],
                set=f"{split}/{item['repo']}/{item['difficulty']}",
                metadata={},
                repo=item["repo"],
                instance_id=item["instance_id"],
                base_commit=item["base_commit"],
                patch=item["patch"],
                test_patch=item["test_patch"],
                problem_statement=item["problem_statement"],
                hints_text=item["hints_text"],
                created_at=item["created_at"],
                version=item["version"],
                FAIL_TO_PASS=item["FAIL_TO_PASS"],
                PASS_TO_PASS=item["PASS_TO_PASS"],
                environment_setup_commit=item["environment_setup_commit"],
                difficulty=item["difficulty"],
            )
            self.tasks[task.id] = task

    def load_task_by_id(self, id: str) -> Union[AllTaskTypes, None]:
        """
        Load a task by ID and set up the repository at the base commit.
        """
        task = self.tasks.get(id)
        if task is None:
            return None

        assert isinstance(task, SWEBenchTask)

        # Set up repository
        repo_path = self._get_repo_path(task.repo)

        if not os.path.exists(repo_path):
            os.makedirs(os.path.dirname(repo_path), exist_ok=True)
            # Clone repository
            clone_url = f"https://github.com/{task.repo}.git"
            subprocess.run(
                ["git", "clone", clone_url, repo_path],
                check=True,
                capture_output=True,
            )

        # Checkout to base commit
        subprocess.run(
            ["git", "checkout", "-f", task.base_commit],
            cwd=repo_path,
            check=True,
            capture_output=True,
        )

        return task

    def get_split_tasks(self, split: str) -> List[str]:
        """
        Returns task IDs for the specified split.
        """
        import re

        split_tasks = [
            task_id for task_id, task in self.tasks.items() if re.match(split, task.set)
        ]
        print(
            f"Found {len(split_tasks)} tasks in split {split} out of {len(self.tasks)} total tasks"
        )
        return split_tasks

    def evaluator(
        self, task: AllTaskTypes, candidate: AllCandidateTypes
    ) -> AllEvalResultTypes:
        """
        Evaluate the candidate prediction using the SWE-bench harness.
        """
        if isinstance(task, dict):
            task = SWEBenchTask(**task)  # type: ignore
        if isinstance(candidate, dict):
            candidate = SWEBenchCandidate(**candidate)  # type: ignore

        assert isinstance(task, SWEBenchTask)
        assert isinstance(candidate, SWEBenchCandidate)

        # Create predictions file in required format
        prediction_data = {
            "instance_id": task.instance_id,
            "model_name_or_path": task.instance_id,
            "model_patch": candidate.answer,
        }

        with tempfile.NamedTemporaryFile(mode="w", suffix=".jsonl", delete=False) as f:
            f.write(json.dumps(prediction_data) + "\n")
            predictions_path = f.name

        try:
            # Run SWE-bench evaluation
            run_id = f"eval_{task.instance_id}"
            main(
                dataset_name="princeton-nlp/SWE-bench_Verified",
                split="test",
                instance_ids=[task.instance_id],
                predictions_path=predictions_path,
                max_workers=1,
                force_rebuild=False,
                cache_level="env",
                clean=False,
                open_file_limit=4096,
                run_id=run_id,
                timeout=1_800,
                namespace="swebench",
                rewrite_reports=True,
                modal=False,
                instance_image_tag="latest",
                report_dir="./reports",  # This apparantly does nothing but build the directory lol
            )

            metadata: Dict[str, Any] = {}
            # Move the file to the reports directory
            os.makedirs("./reports", exist_ok=True)
            os.rename(
                f"{task.instance_id}.eval_{task.instance_id}.json",
                f"./reports/{task.instance_id}.eval_{task.instance_id}.json",
            )

            # Check the output JSON file for resolved_instances
            output_file = f"./reports/{task.instance_id}.eval_{task.instance_id}.json"
            if os.path.exists(output_file):
                try:
                    with open(output_file, "r") as f:
                        eval_results = json.load(f)
                        resolved_instances = eval_results.get("resolved_instances", 0)
                        score = 1.0 if resolved_instances == 1 else 0.0
                        metadata["eval_results"] = eval_results
                        return SWEBenchEvalResult(score=score, metadata=metadata)
                except (json.JSONDecodeError, KeyError) as e:
                    raise e
            else:
                raise FileNotFoundError(f"Output file {output_file} not found")

        finally:
            # Clean up
            if os.path.exists(predictions_path):
                os.unlink(predictions_path)
