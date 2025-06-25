import asyncio
import datetime
import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Tuple

import aiofiles
from autogen_agentchat.base import TaskResult
from autogen_agentchat.conditions import TimeoutTermination
from autogen_agentchat.messages import (
    MultiModalMessage,
    TextMessage,
)
from autogen_core import Image as AGImage
from magentic_ui.cli import PrettyConsole
from magentic_ui.eval.basesystem import BaseSystem
from magentic_ui.eval.models import BaseCandidate, BaseTask, WebVoyagerCandidate
from magentic_ui.magentic_ui_config import MagenticUIConfig
from magentic_ui.task_team import get_task_team
from magentic_ui.types import CheckpointEvent, RunPaths
from PIL import Image
from pydantic import BaseModel

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


BASELINE_MAGUI_CONFIG = MagenticUIConfig(
    # Configuration for evaluation system
    cooperative_planning=False,
    autonomous_execution=True,
    allow_follow_up_input=False,
    model_context_token_limit=110000,
    max_turns=20,
    allow_for_replans=True,
    do_bing_search=False,
    websurfer_loop=False,
    retrieve_relevant_plans="never",
    approval_policy="never",
    max_actions_per_step=10,
    multiple_tools_per_call=False,
    browser_headless=True,
    browser_local=False,
    inside_docker=False,
    no_overwrite_of_task=True,
    # Final answer prompt template - will be formatted with task question
    final_answer_prompt="""
output a FINAL ANSWER to the task.

The real task is: {task}

To output the final answer, use the following template: [any explanation for final answer] FINAL ANSWER: [YOUR FINAL ANSWER]
Don't put your answer in brackets or quotes. 
Your FINAL ANSWER should be a number OR as few words as possible OR a comma separated list of numbers and/or strings.
ADDITIONALLY, your FINAL ANSWER MUST adhere to any formatting instructions specified in the original question (e.g., alphabetization, sequencing, units, rounding, decimal places, etc.)
If you are asked for a number, express it numerically (i.e., with digits rather than words), don't use commas, and don't include units such as $ or percent signs unless specified otherwise.
If you are asked for a string, don't use articles or abbreviations (e.g. for cities), unless specified otherwise. Don't output any final sentence punctuation such as '.', '!', or '?'.
If you are asked for a comma separated list, apply the above rules depending on whether the elements are numbers or strings.
You must answer the question and provide a smart guess if you are unsure. Provide a guess even if you have no idea about the answer.
""".strip(),
)


class MagenticUIAutonomousSystem(BaseSystem):
    """
    MagenticUIAutonomousSystem

    A system that uses MagenticUIConfig for configuration instead of individual parameters.

    Args:
        config (MagenticUIConfig | Dict[str, Any] | None): Configuration for the MagenticUI system.
            If None, uses the BASELINE_MAGUI_CONFIG. Can be a MagenticUIConfig instance or a dictionary.
        name (str): Name of the system instance. Default: "MagenticUIAutonomousSystem".
        dataset_name (str): Name of the evaluation dataset (e.g., "Gaia"). Default: "Gaia".
    """

    def __init__(
        self,
        config: MagenticUIConfig | Dict[str, Any] | None,
        name: str = "MagenticUIAutonomousSystem",
        dataset_name: str = "Gaia",
        debug: bool = False,
    ):
        if config is None:
            config = BASELINE_MAGUI_CONFIG.model_copy()
        config = MagenticUIConfig.model_validate(config)
        super().__init__(name)
        self.candidate_class = WebVoyagerCandidate
        self.config = config
        self.dataset_name = dataset_name
        self.debug = debug

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
            # Step 2: Create the Magentic-UI team
            # TERMINATION CONDITION
            termination_condition = TimeoutTermination(
                timeout_seconds=60 * 15
            )  # 15 minutes

            # --- Use get_task_team instead of manual team/agent construction ---
            # Prepare RunPaths (use output_dir for both internal and external if not in Docker)
            run_paths = RunPaths(
                internal_run_dir=Path(output_dir),
                external_run_dir=Path(output_dir),
                internal_root_dir=Path(output_dir),
                external_root_dir=Path(output_dir),
                run_suffix=task_id,
            )
            team = await get_task_team(
                magentic_ui_config=self.config,
                paths=run_paths,
                termination_condition=termination_condition,
            )
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
            async for message in PrettyConsole(
                team.run_stream(task=task_message), debug=self.debug
            ):
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
                # logger.info(f"Run in progress: {task_id}, message: {message_str}")
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

            # Step 5: Prepare the screenshots
            screenshots_paths: List[Tuple[str, str]] = []
            # check the directory for screenshots which start with screenshot_raw_
            for file in os.listdir(output_dir):
                if file.startswith("screenshot_raw_"):
                    timestamp = file.split("_")[1]
                    screenshots_paths.append(
                        (timestamp, os.path.join(output_dir, file))
                    )

            # restrict to last 15 screenshots by timestamp
            screenshots_paths = sorted(screenshots_paths, key=lambda x: x[0])[-15:]
            screenshot_files: List[str] = [x[1] for x in screenshots_paths]
            return answer, screenshot_files

        # Step 6: Return the answer and screenshots
        answer, screenshots_paths = asyncio.run(_runner())
        answer_candidate = WebVoyagerCandidate(
            answer=answer, screenshots=screenshots_paths
        )
        self.save_answer_to_disk(task_id, answer_candidate, output_dir)
        return answer_candidate
