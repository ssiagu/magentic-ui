import asyncio
import json
import os
import aiofiles
import logging
import datetime
from PIL import Image
from pydantic import BaseModel
from typing import List, Dict, Any, Tuple
from autogen_core.models import ChatCompletionClient
from autogen_core import Image as AGImage
from autogen_agentchat.base import TaskResult
from autogen_agentchat.messages import (
    MultiModalMessage,
    TextMessage,
)
from magentic_ui.eval.basesystem import BaseSystem
from magentic_ui.eval.models import BaseTask, BaseCandidate, WebVoyagerCandidate
from magentic_ui.types import CheckpointEvent
from autogen_ext.teams.magentic_one import MagenticOne


logger = logging.getLogger(__name__)
logging.getLogger("autogen").setLevel(logging.WARNING)
logging.getLogger("autogen.agentchat").setLevel(logging.WARNING)
logging.getLogger("autogen_agentchat.events").setLevel(logging.WARNING)


class LogEventSystem(BaseModel):
    """
    Data model for logging events.

    Attributes:
        source (str): The source of the event (e.g., agent name).
        content (str): The content/message of the event.
        timestamp (str): ISO-formatted timestamp of the event.
        metadata (Dict[str, str]): Additional metadata for the event.
    """

    source: str
    content: str
    timestamp: str
    metadata: Dict[str, str] = {}


class MagenticOneSystem(BaseSystem):
    """
    MagenticOneSystem

    Args:
        name (str): Name of the system instance.
        model_client_config (Dict[str, Any]): Model client config.
        dataset_name (str): Name of the evaluation dataset (e.g., "Gaia").
    """

    def __init__(
        self,
        model_client_config: Dict[str, Any],
        name: str = "MagenticOneSystem",
        dataset_name: str = "Gaia",
    ):
        super().__init__(name)
        self.candidate_class = WebVoyagerCandidate
        self.model_client_config = model_client_config
        self.dataset_name = dataset_name

    def get_answer(
        self, task_id: str, task: BaseTask, output_dir: str
    ) -> BaseCandidate:
        """
        Runs the agent team to solve a given task and saves the answer and logs to disk.

        Args:
            task_id (str): Unique identifier for the task.
            task (BaseTask): The task object containing the question and metadata.
            output_dir (str): Directory to save logs, screenshots, and answer files.

        Returns:
            BaseCandidate: An object containing the final answer and any screenshots taken during execution.
        """

        async def _runner() -> Tuple[str, List[str]]:
            """
            Asynchronous runner that executes the agent team and collects the answer and screenshots.

            Returns:
                Tuple[str, List[str]]: The final answer string and a list of screenshot file paths.
            """
            messages_so_far: List[LogEventSystem] = []

            task_question: str = task.question
            model_client = ChatCompletionClient.load_component(self.model_client_config)

            m1_agent = MagenticOne(client=model_client)

            # Step 3: Prepare the task message
            answer: str = ""
            # check if file name is an image if it exists
            if (
                hasattr(task, "file_name")
                and task.file_name
                and task.file_name.endswith((".png", ".jpg", ".jpeg"))
            ):
                task_message = MultiModalMessage(
                    content=[
                        task_question,
                        AGImage.from_pil(Image.open(task.file_name)),
                    ],
                    source="user",
                )
            else:
                task_message = TextMessage(content=task_question, source="user")
            # Step 4: Run the team on the task
            async for message in m1_agent.run_stream(task=task_message):
                # Store log events
                message_str: str = ""
                try:
                    if isinstance(message, TaskResult) or isinstance(
                        message, CheckpointEvent
                    ):
                        continue
                    message_str = message.to_text()
                    # Create log event with source, content and timestamp
                    log_event = LogEventSystem(
                        source=message.source,
                        content=message_str,
                        timestamp=datetime.datetime.now().isoformat(),
                        metadata=message.metadata,
                    )
                    messages_so_far.append(log_event)
                except Exception as e:
                    logger.info(
                        f"[likely nothing] When creating model_dump of message encountered exception {e}"
                    )
                    pass

                # save to file
                logger.info(f"Run in progress: {task_id}, message: {message_str}")
                async with aiofiles.open(
                    f"{output_dir}/{task_id}_messages.json", "w"
                ) as f:
                    # Convert list of logevent objects to list of dicts
                    messages_json = [msg.model_dump() for msg in messages_so_far]
                    await f.write(json.dumps(messages_json, indent=2))
                # how the final answer is formatted:  "Final Answer: FINAL ANSWER: Actual final answer"

                if message_str.startswith("Final Answer:"):
                    answer = message_str[len("Final Answer:") :].strip()
                    # remove the "FINAL ANSWER:" part and get the string after it
                    answer = answer.split("FINAL ANSWER:")[1].strip()

            assert isinstance(
                answer, str
            ), f"Expected answer to be a string, got {type(answer)}"

            # save the usage of each of the client in a usage json file
            def get_usage(model_client: ChatCompletionClient) -> Dict[str, int]:
                return {
                    "prompt_tokens": model_client.total_usage().prompt_tokens,
                    "completion_tokens": model_client.total_usage().completion_tokens,
                }

            usage_json = {
                "client": get_usage(model_client),
            }
            with open(f"{output_dir}/model_tokens_usage.json", "w") as f:
                json.dump(usage_json, f)

            # Step 5: Prepare the screenshots
            screenshots_paths = []
            # check the directory for screenshots which start with screenshot_raw_
            for file in os.listdir(output_dir):
                if file.startswith("screenshot_raw_"):
                    timestamp = file.split("_")[1]
                    screenshots_paths.append(
                        [timestamp, os.path.join(output_dir, file)]
                    )

            # restrict to last 15 screenshots by timestamp
            screenshots_paths = sorted(screenshots_paths, key=lambda x: x[0])[-15:]
            screenshots_paths = [x[1] for x in screenshots_paths]
            return answer, screenshots_paths

        # Step 6: Return the answer and screenshots
        answer, screenshots_paths = asyncio.run(_runner())
        answer = WebVoyagerCandidate(answer=answer, screenshots=screenshots_paths)
        self.save_answer_to_disk(task_id, answer, output_dir)
        return answer
