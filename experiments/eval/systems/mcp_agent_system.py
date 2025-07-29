import asyncio
import datetime
import json
import logging
from typing import Any, Dict, List

import aiofiles
from autogen_agentchat.base import TaskResult
from autogen_agentchat.messages import (
    MultiModalMessage,
    TextMessage,
)
from autogen_core import Image as AGImage
from magentic_ui.agents.mcp._agent import McpAgent
from magentic_ui.agents.mcp._config import McpAgentConfig
from magentic_ui.cli import PrettyConsole
from magentic_ui.eval.basesystem import BaseSystem
from magentic_ui.eval.models import BaseCandidate, BaseTask, WebVoyagerCandidate
from magentic_ui.eval.token_usage_tracker import wrap_client_with_tracking
from magentic_ui.types import CheckpointEvent
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


FINAL_ANSWER_PROMPT = """
output a FINAL ANSWER to the task.

To output the final answer, use the following template: [any explanation for final answer] FINAL ANSWER: [YOUR FINAL ANSWER]
Don't put your answer in brackets or quotes. 
Your FINAL ANSWER should be a number OR as few words as possible OR a comma separated list of numbers and/or strings.
ADDITIONALLY, your FINAL ANSWER MUST adhere to any formatting instructions specified in the original question (e.g., alphabetization, sequencing, units, rounding, decimal places, etc.)
If you are asked for a number, express it numerically (i.e., with digits rather than words), don't use commas, and don't include units such as $ or percent signs unless specified otherwise.
If you are asked for a string, don't use articles or abbreviations (e.g. for cities), unless specified otherwise. Don't output any final sentence punctuation such as '.', '!', or '?'.
If you are asked for a comma separated list, apply the above rules depending on whether the elements are numbers or strings.
You must answer the question and provide a smart guess if you are unsure. Provide a guess even if you have no idea about the answer.
""".strip()


class McpAgentAutonomousSystemConfig(McpAgentConfig):
    loop_until_task_comlete: bool = True
    max_loops: int = 20
    final_prompt: str | None = FINAL_ANSWER_PROMPT
    task_timeout_seconds: int = 15 * 60


class McpAgentAutonomousSystem(BaseSystem):
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
        config: McpAgentAutonomousSystemConfig | Dict[str, Any],
        name: str = "McpAgentAutonomousSystem",
        dataset_name: str = "Gaia",
        debug: bool = False,
    ):
        if not isinstance(config, McpAgentAutonomousSystemConfig):
            config = McpAgentAutonomousSystemConfig.model_validate(config)

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

        async def _runner() -> str:
            """
            Asynchronous runner that executes the agent team and collects the answer and screenshots.
            """
            messages_so_far: List[LogEventSystem] = []

            task_question: str = task.question
            
            # Create agent first, then wrap its model client to ensure MCP servers get the wrapped client
            agent = McpAgent._from_config(self.config)  # type: ignore
            
            # Now wrap the actual model client that was created
            original_client = agent._model_client
            wrapped_client = wrap_client_with_tracking(original_client, f"mcp_agent_{self.config.name}")
            
            # Replace the model client in the agent and its workbench
            agent._model_client = wrapped_client
            
            # If the agent has a workbench with its own model client references, update those too
            if hasattr(agent, '_workbench') and agent._workbench:
                workbench = agent._workbench
                
                # For AggregateMcpWorkbench, update all individual workbenches
                if hasattr(workbench, '_workbenches'):
                    for wb in workbench._workbenches.values():
                        if hasattr(wb, 'set_model_client'):
                            wb.set_model_client(wrapped_client)
                        elif hasattr(wb, '_model_client'):
                            wb._model_client = wrapped_client
            
            answer: str = ""

            # Catch any errors after team is created so we can close it
            try:
                # Step 3: Prepare the task message
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
                async for message in PrettyConsole(agent.run_stream(task=task_message)):  # type: ignore
                    # Store log events
                    if isinstance(message, TaskResult):
                        answer = message.messages[-1].to_text()
                    elif not isinstance(message, CheckpointEvent):
                        try:
                            # Create log event with source, content and timestamp
                            log_event = LogEventSystem(
                                source=message.source,
                                content=message.model_dump_json(),
                                timestamp=datetime.datetime.now().isoformat(),
                                metadata=message.metadata,
                            )
                            messages_so_far.append(log_event)
                        except Exception as e:
                            logger.info(
                                f"[likely nothing] When creating model_dump of message encountered exception {e}"
                            )

                # save to file
                # logger.info(f"Run in progress: {task_id}, message: {message_str}")
                async with aiofiles.open(
                    f"{output_dir}/{task_id}_messages.json", "w"
                ) as f:
                    # Convert list of logevent objects to list of dicts
                    messages_json = [msg.model_dump(mode='json') for msg in messages_so_far]
                    await f.write(json.dumps(messages_json, indent=2))
                # how the final answer is formatted:  "Final Answer: FINAL ANSWER: Actual final answer"

                if "FINAL ANSWER:" in answer:
                    answer = answer.rsplit("FINAL ANSWER:", 1)[1].strip()

                assert isinstance(
                    answer, str
                ), f"Expected answer to be a string, got {type(answer)}"

            except Exception:
                logger.exception("Error while running system")
            finally:
                await agent.close()
                return answer

        # Step 6: Return the answer and screenshots
        answer = asyncio.run(_runner())
        answer_candidate = WebVoyagerCandidate(
            answer=answer
        )
        # Only save non-empty answers?
        if answer:
            self.save_answer_to_disk(task_id, answer_candidate, output_dir)
        return answer_candidate
