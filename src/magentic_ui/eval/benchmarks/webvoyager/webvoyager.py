import os
import re
import hashlib
from enum import Enum
import base64
import asyncio
from typing import List, Union, Tuple, Dict
from autogen_core.models import UserMessage, ChatCompletionClient
from autogen_core import Image as AGImage
from pathlib import Path
from ...benchmark import Benchmark
from ..gaia.gaia import gaia_evaluator
from ...utils import download_file, load_jsonl, load_json
from ...models import (
    WebVoyagerTask,
    WebVoyagerCandidate,
    WebVoyagerEvalResult,
    AllTaskTypes,
    AllCandidateTypes,
    AllEvalResultTypes,
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
Here are some workflows that may help you with your task:

<dynamic_memory_content>
"""


class WebVoyagerSplit(str, Enum):
    TRAIN = "train"
    VALIDATION = "validation"
    TEST = "test"


class DynamicMemoryType(str, Enum):
    NONE = "none"
    AWM = "awm"
    INSIGHTS = "insights"


def encode_image(image_path: str) -> str:
    """
    Encodes an image file into a base64 string.
    """
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


class WebVoyagerBenchmark(Benchmark):
    """
    Loads the WebVoyager dataset, stores it locally,
    and evaluates predictions using the GAIA evaluator.
    """

    DATA_URL = "https://raw.githubusercontent.com/MinorJerry/WebVoyager/main/data/WebVoyager_data.jsonl"
    REFERENCE_URL = "https://raw.githubusercontent.com/MinorJerry/WebVoyager/main/data/reference_answer.json"
    GAIA_DATA_URL = "https://raw.githubusercontent.com/MinorJerry/WebVoyager/main/data/GAIA_web.jsonl"

    def __init__(
        self,
        name: str = "WebVoyager",
        data_dir: Union[str, None] = None,
        eval_method: str = "exact_match",
        model_client: ChatCompletionClient | None = None,
        dynamic_memory_type: DynamicMemoryType = DynamicMemoryType.NONE,
        dynamic_memory_file: Union[str, None] = None,
    ):
        assert data_dir is not None, "data_dir must be provided for WebVoyagerBenchmark"
        super().__init__(
            name=name,
            data_dir=data_dir,
        )
        if eval_method not in ["exact_match", "gpt_eval"]:
            raise ValueError("eval_method must be 'exact_match' or 'gpt_eval'")
        self.eval_method = eval_method
        if eval_method == "gpt_eval" and model_client is None:
            raise ValueError("model_client must be provided for gpt_eval")
        self.model_client = model_client
        assert self.data_dir is not None
        self.data_file = os.path.join(self.data_dir, "WebVoyager_data.jsonl")
        self.reference_file = os.path.join(self.data_dir, "reference_answer.json")
        self.gaia_data_file = os.path.join(self.data_dir, "GAIA_web.jsonl")
        self.eval_result_class = WebVoyagerEvalResult
        self.tasks: Dict[str, AllTaskTypes] = {}
        self.dynamic_memory_type = dynamic_memory_type
        if dynamic_memory_type == DynamicMemoryType.AWM:
            assert (
                dynamic_memory_file is not None
            ), "dynamic_memory_file must be provided for DynamicMemoryType.AWM"
            self.dynamic_memory_file = dynamic_memory_file
            with open(self.dynamic_memory_file, "r") as f:
                self.dynamic_memory_content = f.read()

    def download_dataset(self) -> None:
        """
        Download the dataset files into self.data_dir.
        """
        assert self.data_dir is not None
        if not os.path.exists(self.data_dir):
            os.makedirs(self.data_dir, exist_ok=True)
        download_file(self.DATA_URL, self.data_file)
        download_file(self.REFERENCE_URL, self.reference_file)
        download_file(self.GAIA_DATA_URL, self.gaia_data_file)

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

    def load_dataset(self):
        """
        Loads the data from a JSONL file and the references from a JSON file.
        Creates WebVoyagerTask objects from the loaded data.
        """
        data = load_jsonl(self.data_file)
        reference_data = load_json(self.reference_file)

        for item in data:
            numeric_id_str = item["id"].split("--")[-1]
            try:
                numeric_id = int(numeric_id_str)
            except ValueError:
                numeric_id = None

            web_name = item.get("web_name", "")
            ref_answer = None
            answer_type = None

            if web_name in reference_data:
                answers_list = reference_data[web_name].get("answers", [])
                for ans_obj in answers_list:
                    if ans_obj.get("id") == numeric_id:
                        ref_answer = ans_obj.get("ans", "")
                        answer_type = ans_obj.get("type", None)
                        break

            split = self._get_split_for_site(web_name)
            question = item.get("ques", "")
            if self.dynamic_memory_type == DynamicMemoryType.AWM:
                question = DYNAMIC_MEMORY_PROMPT.replace("<question>", question)
                question = question.replace(
                    "<dynamic_memory_content>", self.dynamic_memory_content
                )

            task = WebVoyagerTask(
                id=item["id"],
                web_name=web_name,
                web=item.get("web", ""),
                question=question,
                ground_truth=ref_answer or "",
                answer_type=answer_type,
                metadata=item.get("metadata", {}),
                set=f"webvoyager/{split}/{web_name}",
            )
            self.tasks[task.id] = task

        data = load_jsonl(self.gaia_data_file)

        for item in data:
            split = self._get_split_for_task(item.get("id", ""))

            question = item.get("ques", "")
            if self.dynamic_memory_type == DynamicMemoryType.AWM:
                question = DYNAMIC_MEMORY_PROMPT.replace("<question>", question)
                question = question.replace(
                    "<dynamic_memory_content>", self.dynamic_memory_content
                )

            task = WebVoyagerTask(
                id=item.get("id", ""),
                web_name="",
                web=item.get("web", ""),
                question=question,
                metadata=item.get("metadata", {}),
                set=f"gaia/{split}",
            )
            self.tasks[task.id] = task

    def get_split_tasks(self, split: str) -> List[str]:
        """
        Returns task IDs for the specified set.
        """
        # if split not in ["webvoyager", "gaia"]:
        #     raise ValueError("split must be 'webvoyager' or 'gaia'")
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
        Returns a WebVoyagerEvalResult with the score.
        """
        # cast to WebVoyagerTask and WebVoyagerCandidate if dicts
        if isinstance(task, dict):
            task = WebVoyagerTask(**task)  # type: ignore
        if isinstance(candidate, dict):
            candidate = WebVoyagerCandidate(**candidate)  # type: ignore
        if self.eval_method == "exact_match":
            score = gaia_evaluator(task.ground_truth, candidate.answer)
            return WebVoyagerEvalResult(score=score, reasoning="")
        elif self.eval_method == "gpt_eval":
            score, gpt_response_text = asyncio.run(
                self.gpt_evaluator_async(task, candidate)
            )
            return WebVoyagerEvalResult(score=score, reasoning=gpt_response_text)
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
        assert isinstance(candidate, WebVoyagerCandidate)
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
