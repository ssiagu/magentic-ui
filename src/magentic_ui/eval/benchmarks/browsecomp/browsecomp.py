"""
Adapted from:

BrowseComp: A Simple Yet Challenging Benchmark for Browsing Agents
Authors: Jason Wei, Zhiqing Sun, Spencer Papay, Scott McKinney, Jeffrey Han, Isa Fulford, Hyung Won Chung, Alex Tachard Passos, William Fedus, Mia Glaese
https://openai.com/index/browsecomp/
"""

import asyncio
import base64
import hashlib
import json
import os
from dataclasses import asdict
from typing import Coroutine, Dict, List, TypeVar, Union

import pandas
from autogen_core import FunctionCall
from autogen_core.models import ChatCompletionClient, UserMessage
from loguru import logger
from pydantic_core import to_json

from ...benchmark import Benchmark
from ...models import (
    AllTaskTypes,
    BaseCandidate,
    BaseEvalResult,
    BaseTask,
)

# from: https://github.com/centerforaisafety/hle/blob/7b6be5aad6f9b43af3857de7867f3b52f6e4acb3/hle_eval/run_model_predictions.py#L11
QUERY_TEMPLATE = """
{Question}

Your response should be in the following format:
Explanation: {{your explanation for your final answer}}
Exact Answer: {{your succinct, final answer}}
Confidence: {{your confidence score between 0% and 100% for your answer}}
""".strip()

# from: https://github.com/centerforaisafety/hle/blob/7b6be5aad6f9b43af3857de7867f3b52f6e4acb3/hle_eval/run_judge_results.py#L16-L33
GRADER_TEMPLATE = """
Judge whether the following [response] to [question] is correct or not based on the precise and unambiguous [correct_answer] below.

[question]: {question}

[response]: {response}

Your judgement must be in the format and criteria specified below:

extracted_final_answer: The final exact answer extracted from the [response]. Put the extracted answer as 'None' if there is no exact, final answer to extract from the response.

[correct_answer]: {correct_answer}

reasoning: Explain why the extracted_final_answer is correct or incorrect based on [correct_answer], focusing only on if there are meaningful differences between [correct_answer] and the extracted_final_answer. Do not comment on any background to the problem, do not attempt to solve the problem, do not argue for any answer different than [correct_answer], focus only on whether the answers match.

correct: Answer 'yes' if extracted_final_answer matches the [correct_answer] given above, or is within a small margin of error for numerical problems. Answer 'no' otherwise, i.e. if there if there is any inconsistency, ambiguity, non-equivalency, or if the extracted answer is incorrect.


confidence: The extracted confidence score between 0% and 100% from [response]. Put 100 if there is no confidence score available.
""".strip()


def derive_key(password: str, length: int) -> bytes:
    """Derive a fixed-length key from the password using SHA256."""
    hasher = hashlib.sha256()
    hasher.update(password.encode())
    key = hasher.digest()
    return key * (length // len(key)) + key[: length % len(key)]


def decrypt(ciphertext_b64: str, password: str) -> str:
    """Decrypt base64-encoded ciphertext with XOR."""
    encrypted = base64.b64decode(ciphertext_b64)
    key = derive_key(password, len(encrypted))
    decrypted = bytes(a ^ b for a, b in zip(encrypted, key))
    return decrypted.decode()


T = TypeVar("T")


def run_sync(coro: Coroutine[None, None, T]):
    """
    Execute *coro* and return its result from synchronous code.

    • If no event-loop is running → ``asyncio.run``
    • If a loop is already running → schedule with
    ``asyncio.run_coroutine_threadsafe`` and block until done.
    """
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if loop and loop.is_running():
        return asyncio.run_coroutine_threadsafe(coro, loop).result()
    return asyncio.run(coro)


def get_text_content(response: str | List[FunctionCall]):
    if isinstance(response, str):
        return response
    else:
        try:
            return json.dumps([asdict(function_call) for function_call in response])
        except Exception:
            return str(response)


class BrowseCompBenchmark(Benchmark):
    def __init__(self, name: str, data_dir: str, model_client: ChatCompletionClient | None = None):
        super().__init__(name or "BrowseComp", data_dir=data_dir)
        if model_client is None:
            from autogen_ext.models.openai import OpenAIChatCompletionClient

            model_client = OpenAIChatCompletionClient(model="gpt-4o-mini")

        self._model_client = model_client

    def get_dataset_filepath(self):
        return os.path.join(self.data_dir or "data", "BrowseComp.json")

    def download_dataset(self) -> None:
        """Download or load the dataset into data/<benchmark_name>/."""
        
        dataset_fp = self.get_dataset_filepath()
        if os.path.exists(dataset_fp):
            return

        df = pandas.read_csv( # type: ignore
            "https://openaipublic.blob.core.windows.net/simple-evals/browse_comp_test_set.csv"
        )

        dataset: Dict[str, BaseTask] = {}
        for _, row in df.iterrows(): # type: ignore
            problem = decrypt(row.get("problem", ""), row.get("canary", "")) # type: ignore
            answer = decrypt(row.get("answer", ""), row.get("canary", "")) # type: ignore
            if problem and answer:
                task_id = hashlib.md5(problem.encode("utf-8")).hexdigest()
                dataset[task_id] = BaseTask(
                    id=task_id,
                    question=problem,
                    ground_truth=answer,
                    set="",
                )

        with open(dataset_fp, "wb") as fd:
            fd.write(to_json(dataset))

    def load_dataset(self) -> None:
        """Loads the previously downloaded dataset from self.data_dir into self.tasks."""
        dataset_fp = self.get_dataset_filepath()

        if not os.path.exists(dataset_fp):
            self.download_dataset()

        try:
            with open(dataset_fp) as fd:
                dataset = json.load(fd)
                assert isinstance(dataset, dict)
                self.tasks: Dict[str, BaseTask] = {}
                for key, value in dataset.items(): # type: ignore
                    try:
                        assert isinstance(key, str)
                        self.tasks[key] = BaseTask.model_validate(value)
                    except Exception as e:
                        logger.warning(f"Error processing BrowseComp row: {e}")
        except Exception:
            logger.exception("Failed to load BrowseComp, deleting current file")
            os.remove(dataset_fp)

    def load_task_by_id(self, id: str) -> Union[AllTaskTypes, None]:
        """Load and returns a task by its id. Can do any preprocessing here (setting up environment, etc.)."""
        return self.tasks.get(id)

    def get_split_tasks(self, split: str) -> List[str]:
        """Return task ids for the specified split."""
        return list(self.tasks.keys())

    def evaluator(
        self,
        task: BaseTask,
        candidate: BaseCandidate,
    ) -> BaseEvalResult:
        """Implement the evaluator logic here for a single example."""
        content = GRADER_TEMPLATE.format(
            question=task.question,
            correct_answer=task.ground_truth,
            response=candidate.answer,
        )

        message = UserMessage(content=content, source="browsecomp")
        result = run_sync(self._model_client.create([message]))

        grade = get_text_content(result.content)

        return BaseEvalResult(
            score=1 if grade == "yes" else 0, metadata={"grade": grade}
        )
