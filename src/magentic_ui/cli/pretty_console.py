"""Pretty console formatter for magentic-ui CLI with improved visual formatting."""

from __future__ import annotations

import json
import logging
import re
import sys
import textwrap
import warnings
from typing import Any, AsyncGenerator, Dict, Optional

from autogen_agentchat.base import Response, TaskResult
from autogen_agentchat.messages import (
    BaseAgentEvent,
    BaseChatMessage,
    ThoughtEvent,
    ToolCallExecutionEvent,
    ToolCallRequestEvent,
    ToolCallSummaryMessage,
)

# ╭────────────────────────────────────────────────────────────────────────────╮
# │  Terminal colours / styles - 7‑bit ANSI so they work everywhere            │
# ╰────────────────────────────────────────────────────────────────────────────╯
BOLD = "\033[1m"
RESET = "\033[0m"
BLUE = "\033[34m"
GREEN = "\033[32m"
YELLOW = "\033[33m"
CYAN = "\033[36m"
MAGENTA = "\033[35m"
RED = "\033[31m"
WHITE_BG = "\033[47m"
BLACK_TEXT = "\033[30m"
UNDERLINE = "\033[4m"

# ╭────────────────────────────────────────────────────────────────────────────╮
# │  Common INFO patterns pre‑compiled for speed                               │
# ╰────────────────────────────────────────────────────────────────────────────╯
INFO_REGEX = re.compile(
    r"|".join(
        [
            r"Task received:",
            r"Analyzing",
            r"Submitting",
            r"Reviewing",
            r"checks passed",
            r"Deciding which agent",
            r"Received task:",
            r"Searching for",
            r"Processing",
            r"Executing",
            r"Reading file",
            r"Writing to",
            r"Running",
            r"Starting",
            r"Completed",
            r"Looking up",
            r"Loading",
            r"Generating",
            r"Creating",
            r"Downloading",
            r"Installing",
            r"Checking",
            r"Fetching",
            r"Exploring",
            r"Building",
            r"Setting up",
            r"Finding",
            r"Identifying",
            r"Testing",
            r"Compiling",
            r"Validating",
            r"Cloning",
        ]
    )
)


# ╭────────────────────────────────────────────────────────────────────────────╮
# │  Helper utilities                                                          │
# ╰────────────────────────────────────────────────────────────────────────────╯
def _terminal_width(fallback: int = 100) -> int:
    """Return terminal width minus a 10‑column safety margin."""
    try:
        import shutil

        return max(20, shutil.get_terminal_size().columns - 10)
    except Exception:
        return fallback


def try_parse_json(raw: str) -> tuple[bool, Any]:
    """Lightweight JSON detector – avoids `json.loads` when blatantly not JSON."""
    raw = raw.strip()
    if not (raw.startswith("{") and raw.endswith("}")) and not (
        raw.startswith("[") and raw.endswith("]")
    ):
        return False, None
    try:
        return True, json.loads(raw)
    except (ValueError, TypeError):
        return False, None


# ╭────────────────────────────────────────────────────────────────────────────╮
# │  Pretty‑printers                                                           │
# ╰────────────────────────────────────────────────────────────────────────────╯


def format_info_line(msg: str) -> str:
    return f"{BOLD}{GREEN}[INFO]{RESET} {UNDERLINE}{msg}{RESET}"


def is_info_message(msg: str) -> bool:
    if INFO_REGEX.search(msg):
        return True
    # Verb in present‑participle at start ("Loading models…")
    return bool(re.match(r"^\s*[A-Z][a-z]+ing\b", msg))


def print_content(content: str, colour: str, debug: bool = False, max_lines: int = 10, message_type: str = "Message", icon: str = "📄") -> None:
    """Print content with proper formatting, wrapping, and optional line count truncation.
    
    Args:
        content: The content to print
        colour: The color code for the left border
        debug: If True, don't truncate the number of lines
        max_lines: Maximum number of lines to display (when not in debug mode)
        message_type: The type of message to display in the header
    """
    width = _terminal_width()
    left = f"{colour}┃{RESET} "
    body_w = width - len(left)
    
    # Print message type header
    print(f"\n{left}{BOLD}{colour}{icon} {message_type}{RESET}")
    
    lines = content.splitlines()
    non_empty_lines = [line for line in lines if line.strip()]
    
    # In debug mode, show all lines
    if debug:
        lines_to_show = non_empty_lines
        show_truncation = False
    else:
        # Truncate number of lines when not in debug mode
        if len(non_empty_lines) > max_lines:
            lines_to_show = non_empty_lines[:max_lines]
            show_truncation = True
        else:
            lines_to_show = non_empty_lines
            show_truncation = False
    
    for line in lines_to_show:
        if len(line) <= body_w:
            print(f"{left}{line}")
        else:
            for chunk in textwrap.wrap(line, body_w):
                print(f"{left}{chunk}")
    
    # Show truncation indicator if we truncated lines
    if show_truncation:
        remaining = len(non_empty_lines) - max_lines
        print(f"{left}{CYAN}... ({remaining} more lines){RESET}")
    
    print()  # Add spacing after content

# ╭────────────────────────────────────────────────────────────────────────────╮
# │  Agent‑specific colour selection (deterministic but cheap)                 │
# ╰────────────────────────────────────────────────────────────────────────────╯
_AGENT_COLORS = {
    "orchestrator": CYAN,
    "coder_agent": MAGENTA,
    "coder": MAGENTA,
    "reviewer": GREEN,
    "web_surfer": BLUE,
    "file_surfer": YELLOW,
    "user_proxy": GREEN,
    "azure_reasoning_agent": RED,
}
_COLOR_POOL = [BLUE, GREEN, YELLOW, CYAN, MAGENTA]


def agent_color(name: str) -> str:
    ln = name.lower()
    for key, col in _AGENT_COLORS.items():
        if key in ln:
            return col
    return _COLOR_POOL[hash(name) % len(_COLOR_POOL)]


# ╭────────────────────────────────────────────────────────────────────────────╮
# │  Header & transition boxes                                                 │
# ╰────────────────────────────────────────────────────────────────────────────╯
def header_box(agent: str) -> str:
    """Return a symmetric ASCII box with the agent name centred."""
    INNER = 24  # number of "═" characters (and usable chars in mid line)

    colour = agent_color(agent)
    text = agent.upper()[:INNER]  # truncate if the name is longer than the box
    pad = INNER - len(text)
    left, right = pad // 2, pad - pad // 2

    top = f"{BOLD}{colour}╔{'═' * INNER}╗"
    mid = f"║{' ' * left}{text}{RESET}{colour}{' ' * right}║"
    bot = f"╚{'═' * INNER}╝{RESET}"

    return f"\n{top}\n{mid}\n{bot}\n"


def transition_line(prev: str, curr: str) -> str:
    return (
        f"{BOLD}{agent_color(prev)}{prev.upper()}{RESET}  "
        f"{BOLD}{YELLOW}━━━━▶{RESET}  "
        f"{BOLD}{agent_color(curr)}{curr.upper()}{RESET}"
    )


# ╭────────────────────────────────────────────────────────────────────────────╮
# │  JSON pretty printer                                                       │
# ╰────────────────────────────────────────────────────────────────────────────╯


def pretty_print_json(raw: str, colour: str) -> bool:
    ok, obj = try_parse_json(raw)
    if not ok or obj in ([], {}):
        return False

    indent_json = json.dumps(obj, indent=2, ensure_ascii=False)
    indent_json = re.sub(r'"([^"\\]+)":', rf'"{BOLD}\1{RESET}":', indent_json)
    
    print_content(indent_json, colour, debug=True, message_type="JSON Data", icon="📋")
    return True


# ╭────────────────────────────────────────────────────────────────────────────╮
# │  Plan & step formatters                                                    │
# ╰────────────────────────────────────────────────────────────────────────────╯


def format_plan(obj: dict[str, Any], colour: str) -> None:
    width = _terminal_width()
    left = f"{colour}┃{RESET} "
    body_w = width - len(left)

    def _wrap(text: str, indent: int = 3):
        for ln in textwrap.wrap(text, body_w - indent):
            print(f"{left}{' ' * indent}{ln}")

    # Task / title
    if "task" in obj:
        print(f"{left}{BOLD}Task:{RESET} {obj['task']}")
    elif "title" in obj:
        print(f"{left}{BOLD}Plan:{RESET} {obj['title']}")

    # Summary
    if obj.get("plan_summary"):
        print()  # tail spacer
        print(f"{left}{BOLD}Plan Summary:{RESET}")
        _wrap(obj["plan_summary"])

    # Is this a user proxy interaction? (Check agent name)
    agent_name = obj.get("agent_name", "").lower()
    is_user_proxy = "user" in agent_name and "proxy" in agent_name

    # Steps
    steps: list[dict[str, Any]] = obj.get("steps", []) or []
    if steps:
        print(f"{left}\n{left}{BOLD}Steps:{RESET}")
        for i, step in enumerate(steps, 1):
            print(f"{left}\n{left}{BOLD}{i}. {step.get('title', step)}{RESET}")
            if isinstance(step, dict):
                if step.get("details"):
                    _wrap(step["details"], 5)
                if step.get("instruction"):
                    print(f"{left}{' ' * 5}{BOLD}Instruction:{RESET}")
                    _wrap(step["instruction"], 7)
                if step.get("progress_summary"):
                    print(f"{left}{' ' * 5}{BOLD}Progress:{RESET}")
                    _wrap(step["progress_summary"], 7)
                if step.get("agent_name"):
                    print(
                        f"{left}{' ' * 5}{BOLD}Agent:{RESET} {step['agent_name'].upper()}"
                    )

        # Always show acceptance prompt for full plans
        print()  # tail spacer
        print(f"{BOLD}{YELLOW}Type 'accept' to proceed or describe changes:{RESET}")

    # Single‑step orchestrator JSON (title/index style)
    elif {"title", "index", "agent_name"}.issubset(obj):
        idx = obj["index"] + 1 if isinstance(obj.get("index"), int) else obj["index"]
        print(f"{left}{BOLD}Step:{RESET} {idx}/{obj.get('plan_length', '?')}")
        print(f"{left}{BOLD}Agent:{RESET} {obj['agent_name'].upper()}")
        if obj.get("details"):
            print(f"{left}{BOLD}Details:{RESET}")
            _wrap(obj["details"])
        if obj.get("instruction"):
            print(f"{left}{BOLD}Instruction:{RESET}")
            _wrap(obj["instruction"])
        if obj.get("progress_summary"):
            print(f"{left}{BOLD}Progress:{RESET}")
            _wrap(obj["progress_summary"])

        print()  # tail spacer

        # Only show the prompt if this is a user proxy agent interaction
        if is_user_proxy:
            print(f"{BOLD}{YELLOW}Type 'accept' to proceed or describe changes:{RESET}")
    # If it's a full plan without steps, always show acceptance prompt
    elif "task" in obj or "plan_summary" in obj:
        print()  # tail spacer
        print(f"{BOLD}{YELLOW}Type 'accept' to proceed or describe changes:{RESET}")


def pretty_print_plan(raw: str, colour: str) -> bool:
    ok, obj = try_parse_json(raw)
    if not ok:
        return False
    if any(k in obj for k in ("task", "plan_summary", "steps", "title")):
        format_plan(obj, colour)
        return True
    return False


# Step formatter (simple schema: {step, content})
def try_format_step(raw: str, colour: str) -> bool:
    ok, obj = try_parse_json(raw)
    if not ok or not {"step", "content"}.issubset(obj):
        return False
    
    title = obj.get("title", f"Step {obj['step']}")
    content = obj['content']
    
    print_content(content, colour, debug=True, message_type=title, icon="📋")
    return True


# ╭────────────────────────────────────────────────────────────────────────────╮
# │  Tool call event formatters                                                │
# ╰────────────────────────────────────────────────────────────────────────────╯


def format_tool_call_request(event: ToolCallRequestEvent, colour: str, debug: bool = False) -> None:
    """Format a ToolCallRequestEvent for display."""
    
    # Build content string for all tool calls
    content_lines: list[str] = []
    for i, call in enumerate(event.content, 1):
        content_lines.append(f"Call {i}: {call.name}")
        
        # Parse and display arguments if available
        try:
            args = json.loads(call.arguments)
            if args:
                for key, value in args.items():
                    value_str = str(value)
                    # Truncate long values only if not in debug mode
                    if not debug and len(value_str) > 80:
                        value_str = value_str[:77] + "..."
                    content_lines.append(f"  {key}: {value_str}")
        except Exception:
            content_lines.append(f"  arguments: {call.arguments}")
        
        if i < len(event.content):  # Add spacing between calls
            content_lines.append("")
    
    content = "\n".join(content_lines)
    print_content(content, colour, debug=debug, message_type="Tool Call Request", icon="🔧")


def format_tool_call_execution(event: ToolCallExecutionEvent, colour: str, debug: bool = False) -> None:
    """Format a ToolCallExecutionEvent for display."""
    
    # Build content string for all tool call results
    content_lines: list[str] = []
    for i, result in enumerate(event.content, 1):
        content_lines.append(f"Result {i}:")
        
        # Display call_id if available
        if hasattr(result, "call_id"):
            content_lines.append(f"  call_id: {result.call_id}")
        
        # Display content
        if hasattr(result, "content"):
            content = str(result.content)
            content_lines.append("  content:")
            
            # Add indented content lines
            for line in content.split("\n"):
                if line.strip():  # Only add non-empty lines
                    content_lines.append(f"    {line}")
        
        if i < len(event.content):  # Add spacing between results
            content_lines.append("")
    
    final_content = "\n".join(content_lines)
    print_content(final_content, colour, debug=debug, message_type="Tool Call Results", icon="✅")


def format_tool_call_summary(event: ToolCallSummaryMessage, colour: str, debug: bool = False) -> None:
    """Format a ToolCallSummaryMessage for display."""
    content = str(getattr(event, "content", ""))
    if content:
        print_content(content, colour, debug=debug, message_type="Tool Call Summary")


# ╭────────────────────────────────────────────────────────────────────────────╮
# │  Thought event formatter                                                   │
# ╰────────────────────────────────────────────────────────────────────────────╯


def format_thought_event(event: ThoughtEvent, colour: str, debug: bool = False) -> None:
    """Format a ThoughtEvent for display."""
    content = str(getattr(event, "content", ""))
    if content:
        print_content(content, colour, debug=debug, message_type="Thought Process", icon="🧠")


# ╭────────────────────────────────────────────────────────────────────────────╮
# │  PrettyConsole coroutine - main entry point                                │
# ╰────────────────────────────────────────────────────────────────────────────╯
async def _PrettyConsole(
    stream: AsyncGenerator[Any, None],
    *,
    debug: bool = False,
    no_inline_images: bool = False,  # reserved for future use
    output_stats: bool = False,  # reserved for future use
):
    current_agent: Optional[str] = None
    previous_agent: Optional[str] = None
    last_processed: Any = None

    # Quiet libraries unless debugging
    if not debug:
        warnings.filterwarnings("ignore")
        logging.disable(logging.CRITICAL)

    class _Gate:
        """Allow writes only when inside `process_message`."""

        def __init__(self, dbg: bool, flag: Dict[str, bool]):
            self.dbg, self.flag = dbg, flag
            # Store the current stdout at creation time (which might be redirected)
            self._stdout = sys.stdout

        def write(self, txt: str):
            if self.dbg or self.flag["open"]:
                # Write to the current stdout (respects redirection)
                self._stdout.write(txt)

        def flush(self):
            self._stdout.flush()

    gate = {"open": False}
    sys.stdout = _Gate(debug, gate)
    sys.stderr = _Gate(debug, gate)
    sys.__stdout__ = sys.__stdout__  # keep a reference for raw writes

    async def process(msg: BaseChatMessage | BaseAgentEvent | TaskResult | Response):
        nonlocal current_agent, previous_agent, last_processed
        last_processed = msg
        gate["open"] = True

        try:
            # Chat message
            if isinstance(msg, BaseChatMessage):
                meta = getattr(msg, "metadata", {})
                if meta.get("internal") == "yes" and not debug:
                    return
                src = msg.source
                if src != current_agent:
                    previous_agent, current_agent = current_agent, src
                    if previous_agent:
                        print("\n" + transition_line(previous_agent, current_agent))
                    print(header_box(src))

                colour = agent_color(src)
                content = str(getattr(msg, "content", ""))
                # if isinstance(msg, ToolCallSummaryMessage):
                #     format_tool_call_summary(msg, colour)
                # elif is_info_message(content):
                #     print(format_info_line(content))
                if pretty_print_plan(content, colour):
                    pass
                elif pretty_print_json(content, colour):
                    pass
                elif try_format_step(content, colour):
                    pass
                else:
                    print_content(content, colour, debug, message_type="Text Message")

            # Event message (non‑chat) - including tool call events
            elif isinstance(msg, BaseAgentEvent):
                # Check if this is one of the tool call events we want to display
                src = getattr(msg, 'source', 'unknown')
                
                # Set current agent for tool events
                if src != current_agent and src != 'unknown':
                    previous_agent, current_agent = current_agent, src
                    if previous_agent and current_agent:
                        print("\n" + transition_line(previous_agent, current_agent))
                    print(header_box(src))
                
                colour = agent_color(src)
                
                if isinstance(msg, ToolCallRequestEvent):
                    format_tool_call_request(msg, colour, debug)
                elif isinstance(msg, ToolCallExecutionEvent):
                    format_tool_call_execution(msg, colour, debug)
                elif isinstance(msg, ThoughtEvent):
                    format_thought_event(msg, colour, debug)

            # TaskResult / Response (final outputs)
            elif isinstance(msg, (TaskResult, Response)):
                print(
                    f"\n{BOLD}{MAGENTA}╔═════════════════════════╗\n"
                    f"║     SESSION COMPLETE    ║\n"
                    f"╚═════════════════════════╝{RESET}\n"
                )
            # Fallback unknown type
            else:
                print(f"{BOLD}{RED}[WARN]{RESET} Unhandled message type: {type(msg)}")

        finally:
            gate["open"] = False

    # Main loop
    if debug:
        print(f"{BOLD}{YELLOW}[DEBUG] Starting console stream processing…{RESET}")

    async for m in stream:
        await process(m)
        yield m

    yield last_processed


# Public alias
PrettyConsole = _PrettyConsole
