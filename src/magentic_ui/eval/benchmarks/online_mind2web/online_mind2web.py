import os
import re
import hashlib
from huggingface_hub import hf_hub_download
from enum import Enum
import base64
import asyncio
from typing import List, Union, Tuple, Dict
from autogen_core.models import UserMessage, ChatCompletionClient
from autogen_core import Image as AGImage
from pathlib import Path
from ...benchmark import Benchmark
from ...utils import load_json
from ...models import (
    OnlineMind2WebTask,
    OnlineMind2WebCandidate,
    OnlineMind2WebEvalResult,
    AllTaskTypes,
    AllCandidateTypes,
    AllEvalResultTypes,
    DynamicMemoryType,
)

SYSTEM_PROMPT = """As an evaluator, you will be presented with three primary components to assist you in your role:

1. Web Task Instruction: This is a clear and specific directive provided in natural language, detailing the online activity to be carried out. These requirements may include conducting searches, verifying information, comparing prices, checking availability, or any other action relevant to the specified web service (such as Amazon, Apple, ArXiv, BBC News, Booking etc).

2. Result Screenshots: This is a visual representation of the screen showing the result or intermediate state of performing a web task. It serves as visual proof of the actions taken in response to the instruction.

3. Result Response: This is a textual response obtained after the execution of the web task. It serves as textual result in response to the instruction.

-- You DO NOT NEED to interact with web pages or perform actions such as booking flights or conducting searches on websites.
-- You SHOULD NOT make assumptions based on information not presented in the screenshot when comparing it to the instructions.
-- Your primary responsibility is to conduct a thorough assessment of the web task instruction against the outcome depicted in the screenshot and in the response, evaluating whether the actions taken align with the given instructions.
-- NOTE that the instruction may involve more than one task, for example, locating the garage and summarizing the review. Failing to complete either task, such as not providing a summary, should be considered unsuccessful.
-- NOTE that the screenshot is authentic, but the response provided by LLM is generated at the end of web browsing, and there may be discrepancies between the text and the screenshots.
-- Note the difference: 1) Result response may contradict the screenshot, then the content of the screenshot prevails, 2) The content in the Result response is not mentioned on the screenshot, choose to believe the content.

You should elaborate on how you arrived at your final evaluation and then provide a definitive verdict on whether the task has been successfully accomplished, either as 'SUCCESS' or 'NOT SUCCESS'."""
USER_PROMPT = """TASK: <task>
Result Response: <answer>
<num> screenshots at the end: """
DYNAMIC_MEMORY_PROMPT = """
[TASK]
<question>
[MEMORY]
<dynamic_memory_content>
"""


class OnlineMind2WebSplit(str, Enum):
    TRAIN = "train"
    VALIDATION = "validation"
    TEST = "test"


def encode_image(image_path: str) -> str:
    """
    Encodes an image file into a base64 string.
    """
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


class OnlineMind2WebBenchmark(Benchmark):
    """
    Loads the Online-Mind2Web dataset, stores it locally, and evaluates predictions using the GPT-based evaluator.
    """

    DATA_URL = "https://huggingface.co/datasets/osunlp/Online-Mind2Web/resolve/main/Online_Mind2Web.json"

    def __init__(
        self,
        name: str = "Online-Mind2Web",
        data_dir: Union[str, None] = None,
        eval_method: str = "gpt_eval",
        model_client: ChatCompletionClient | None = None,
        dynamic_memory_type: DynamicMemoryType = DynamicMemoryType.NONE,
        dynamic_memory_files: Union[List[str], None] = None,
    ):
        assert (
            data_dir is not None
        ), "data_dir must be provided for OnlineMind2WebBenchmark"
        super().__init__(
            name=name,
            data_dir=data_dir,
        )
        if eval_method not in ["gpt_eval"]:
            raise ValueError("eval_method must be 'gpt_eval'")
        self.eval_method = eval_method
        if eval_method == "gpt_eval" and model_client is None:
            raise ValueError("model_client must be provided for gpt_eval")
        self.model_client = model_client
        assert self.data_dir is not None
        self.data_file = os.path.join(self.data_dir, "Online_Mind2Web.json")
        self.eval_result_class = OnlineMind2WebEvalResult
        self.tasks: Dict[str, AllTaskTypes] = {}
        self.dynamic_memory_type = dynamic_memory_type

        if dynamic_memory_type != DynamicMemoryType.NONE:
            if dynamic_memory_type == DynamicMemoryType.AWM:
                assert (
                    dynamic_memory_files is not None
                ), "dynamic_memory_files must be provided for DynamicMemoryType.AWM"
                start_phrase = (
                    "Here are some workflows that may help you with your task:"
                )
                end_phrase = "If you use a workflow, you must indicate which workflow you used. You must output [WORKFLOW #] where # is the index of the workflow you used. If you do not use a workflow, you must output [WORKFLOW NONE]."
            elif dynamic_memory_type == DynamicMemoryType.INSIGHTS:
                assert (
                    dynamic_memory_files is not None
                ), "dynamic_memory_files must be provided for DynamicMemoryType.INSIGHTS"
                start_phrase = (
                    "Here are some insights that may help you with your task:"
                )
                end_phrase = "If you use an insight, you must indicate which insight you used. You must output [INSIGHT #] where # is the index of the insight you used. If you do not use an insight, you must output [INSIGHT NONE]."
            else:
                raise ValueError(f"Unknown dynamic memory type: {dynamic_memory_type}")

            if len(dynamic_memory_files) == 1:
                with open(dynamic_memory_files[0], "r") as f:
                    self.dynamic_memory_content = f.read()  # type: ignore
                    self.dynamic_memory_content = (
                        start_phrase
                        + "\n"
                        + self.dynamic_memory_content
                        + "\n"
                        + end_phrase
                    )
            else:
                self.dynamic_memory_content = {}  # type: ignore
                for file in dynamic_memory_files:
                    site = file.split("/")[-1].split("___")[0]
                    with open(file, "r") as f:
                        site_dynamic_memory_content = f.read()
                        self.dynamic_memory_content[site] = (  # type: ignore
                            start_phrase
                            + "\n"
                            + site_dynamic_memory_content
                            + "\n"
                            + end_phrase
                        )

    def download_dataset(self) -> None:
        """
        Download the dataset files into self.data_dir.
        """
        assert self.data_dir is not None
        if not os.path.exists(self.data_dir):
            os.makedirs(self.data_dir, exist_ok=True)

        # Download directly to the target location
        hf_hub_download(
            repo_id="osunlp/Online-Mind2Web",
            filename="Online_Mind2Web.json",
            repo_type="dataset",
            local_dir=self.data_dir,
        )

    def _get_split_for_site(self, site_name: str) -> str:
        """
        Create splits for the dataset.
        """
        ### create splits for tasks
        template_hash = hashlib.md5(str(site_name).encode("utf-8")).hexdigest()

        # Use first two hex digits for more granular control
        hash_value = int(template_hash[:2], 16)  # 0-255

        if hash_value < 128:  # 0-127 (50%)
            split = "train"
        else:  # 128-255 (50%)
            split = "test"

        return split

    def _get_split_for_task(self, task_id: str) -> str:
        """
        Create splits for the dataset.
        """
        ### create splits for tasks
        template_hash = hashlib.md5(str(task_id).encode("utf-8")).hexdigest()

        # Use first two hex digits for more granular control
        hash_value = int(template_hash[:2], 16)  # 0-255

        if hash_value < 128:  # 0-127 (50%)
            split = "train"
        else:  # 128-255 (50%)
            split = "test"

        return split

    def _get_split_for_task_per_site(self, site_name: str, task_id: str) -> str:
        """
        Create splits for tasks within each website to ensure roughly 50/50
        train/test distribution for each site's tasks.

        Args:
            site_name: The name of the website
            task_id: The task identifier

        Returns:
            Split assignment ("train" or "test")
        """
        # Hash the task_id to ensure deterministic splits
        # This ensures that within any site, tasks are distributed roughly 50/50
        template_hash = hashlib.md5(str(task_id).encode("utf-8")).hexdigest()

        # Use first two hex digits for more granular control
        hash_value = int(template_hash[:2], 16)  # 0-255

        if hash_value < 128:  # 0-127 (50%)
            split = "train"
        else:  # 128-255 (50%)
            split = "test"

        return split

    def load_dataset(self):
        """
        Loads the data from a JSON file.
        Creates OnlineMind2WebTask objects from the loaded data.
        """
        data = load_json(self.data_file)

        # Data is a list
        for item in data:
            task_id: str = item["task_id"]
            web_name: str = item["website"]
            question: str = item["confirmed_task"]
            level: str = item["level"]
            reference_length: int = item["reference_length"]

            split = self._get_split_for_task_per_site(web_name, task_id)
            if (
                self.dynamic_memory_type == DynamicMemoryType.AWM
                or self.dynamic_memory_type == DynamicMemoryType.INSIGHTS
            ):
                question = DYNAMIC_MEMORY_PROMPT.replace("<question>", question)
                # Check if self.dynamic_memory_content is a dictionary
                if isinstance(self.dynamic_memory_content, dict):  # type: ignore
                    if web_name in self.dynamic_memory_content:  # type: ignore
                        question = question.replace(
                            "<dynamic_memory_content>",
                            self.dynamic_memory_content[web_name],  # type: ignore
                        )
                    else:
                        question = question.replace("<dynamic_memory_content>", "")
                else:
                    question = question.replace(
                        "<dynamic_memory_content>", self.dynamic_memory_content
                    )

            task = OnlineMind2WebTask(
                id=task_id,
                web_name=web_name,
                question=question,
                ground_truth="",
                metadata={},
                level=level,
                reference_length=reference_length,
                set=f"{split}/{web_name}/{level}",
            )
            self.tasks[task.id] = task

    def get_split_tasks(self, split: str) -> List[str]:
        """
        Returns task IDs for the specified set.
        """
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
        Evaluate how 'correct' the candidate answer is relative to the gold_answer.
        Returns a OnlineMind2WebEvalResult with the score.
        """
        if isinstance(task, dict):
            task = OnlineMind2WebTask(**task)  # type: ignore
        if isinstance(candidate, dict):
            candidate = OnlineMind2WebCandidate(**candidate)  # type: ignore
        if self.eval_method == "gpt_eval":
            score, gpt_response_text = asyncio.run(
                self.gpt_evaluator_async(task, candidate)
            )
            return OnlineMind2WebEvalResult(score=score, reasoning=gpt_response_text)
        raise ValueError(f"Unknown eval_method: {self.eval_method}")

    async def gpt_evaluator_async(
        self, task: AllTaskTypes, candidate: AllCandidateTypes
    ) -> Tuple[float, str]:
        """
        Adapted from https://github.com/MinorJerry/WebVoyager/blob/main/evaluation/auto_eval.py
        Evaluates the candidate answer by calling GPT-based auto-eval.

        Args:
            task: dict containing the original question, any ground-truth info, etc.
            candidate: dict containing the predicted/produced answer.

        Returns:
            1.0 if GPT decides the result is "SUCCESS",
            0.0 if GPT decides "NOT SUCCESS",
            or 0.0 if the verdict is missing or unclear.
        """
        # Extract data
        task_content = task.question
        answer_content = candidate.answer
        assert isinstance(candidate, OnlineMind2WebCandidate)
        screenshot_paths = candidate.screenshots
        # Suppose we only attach up to <num> screenshots
        num_screens = len(screenshot_paths)

        # Build user content from the template
        user_prompt_tmp = USER_PROMPT.replace("<task>", task_content)
        user_prompt_tmp = user_prompt_tmp.replace("<answer>", answer_content)
        user_prompt_tmp = user_prompt_tmp.replace("<num>", str(num_screens))

        images: List[AGImage] = []
        for path in screenshot_paths:
            # from_file
            try:
                image = AGImage.from_file(Path(path))
                images.append(image)
            except Exception as e:
                print(f"Error: {e}")
                continue
        # restrict to last 15 screenshots
        images = images[-15:]

        # The system prompt explains how to evaluate correctness
        user_message: str | list[str | AGImage] = ""
        if len(images) > 0:
            user_message = [
                user_prompt_tmp,
            ]
            user_message.extend(images)
        else:
            user_message = user_prompt_tmp

        messages = [
            UserMessage(
                source="system",
                content=SYSTEM_PROMPT,
            ),
            UserMessage(
                source="user",
                content=user_message,
            ),
            UserMessage(
                source="user",
                content="Your verdict:\n.",
            ),
        ]

        # Now call the GPT model
        assert self.model_client is not None
        response = await self.model_client.create(messages)
        assert isinstance(response.content, str)
        gpt_response_text = response.content
        # Parse out the text from the model

        verdict = 0.0
        if "NOT SUCCESS" in gpt_response_text:
            verdict = 0.0
        elif "SUCCESS" in gpt_response_text:
            verdict = 1.0
        else:
            verdict = 0.0  # Could not decide

        return verdict, gpt_response_text
