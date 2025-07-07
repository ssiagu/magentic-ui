import argparse

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Literal, cast

from autogen_core import CancellationToken
from autogen_core.code_executor import CodeBlock
from autogen_ext.code_executors.local import LocalCommandLineCodeExecutor
from mcp.server import FastMCP

from pydantic import BaseModel


@dataclass
class AppContext:
    executor: LocalCommandLineCodeExecutor


def parse_args():
    parser = argparse.ArgumentParser(description="Start MCP Local Code Executor Server")
    parser.add_argument(
        "--timeout", type=int, default=60, help="Timeout for code execution (seconds)"
    )
    parser.add_argument(
        "--work-dir",
        type=str,
        default="/workspace",
        help="Working directory for code execution",
    )
    return parser.parse_args()


args = parse_args()


@asynccontextmanager
async def app_lifespan(server: FastMCP) -> AsyncIterator[AppContext]:
    """Manage Local executor lifecycle with type-safe context"""
    executor = LocalCommandLineCodeExecutor(
        timeout=args.timeout,
        work_dir=Path(args.work_dir) if args.work_dir else None,
    )
    await executor.start()
    try:
        yield AppContext(executor=executor)
    finally:
        await executor.stop()


mcp = FastMCP("local-code-executor", lifespan=app_lifespan)


Langauge = Literal["bash", "python", "node"]

@mcp.tool()
async def execute_code(language: Langauge, code: str) -> Dict[str, Any]:
    """
    Execute a code block.

    Args:
        language: The language the code is written in, must be one of 'bash', 'python', or 'node'
        code: The code to execute. It will be written to a temporary file and then executed by the appropriate interpreter for the language.
    
    Returns:
        A dictionary with information about the status of the execution, including outputs and exit code.
    """
    ctx = mcp.get_context()
    lifespan_ctx = cast(AppContext, ctx.request_context.lifespan_context)
    executor: LocalCommandLineCodeExecutor = lifespan_ctx.executor
    try:
        code_block = CodeBlock(code=code, language=language)
        token: CancellationToken = CancellationToken()
        result = await executor.execute_code_blocks([code_block], token)
        return {
            "status": "success",
            "exit_code": result.exit_code,
            "output": result.output,
            "code_file": result.code_file,
        }
    except Exception as e:
        return {"status": "error", "message": f"Code execution failed: {str(e)}"}


class CodeBlockModel(BaseModel):
    language: Langauge
    """The language the code is written in, must be one of 'bash', 'python', or 'node'"""
    code: str
    """The code to execute. It will be written to a temporary file and then executed by the appropriate interpreter for the language."""



@mcp.tool()
async def execute_multiple_blocks(code_blocks: List[Dict[str, str]]) -> Dict[str, Any]:
    """
    Execute multiple code blocks in a sequence. 
    
    The code blocks will be written to files and then executed by the appropriate interpreter for the block's language. Therefore consecutive blocks can only share state via the fileystem.

    Args:
        code_blocks: A list of dictionaries with exactly two properties 'language' and 'code'. The value for 'language' must be one of 'bash', 'python', or 'node'. The value of 'code' will be written to a file and executed by the approriate interpreter for the language.
    
    Returns:
        A dictionary with information about the status of the execution, including outputs and exit code.
    """
    ctx = mcp.get_context()
    lifespan_ctx = cast(AppContext, ctx.request_context.lifespan_context)
    executor: LocalCommandLineCodeExecutor = lifespan_ctx.executor
    try:
        blocks: List[CodeBlock] = [
            CodeBlock(code=block["code"], language=block.get("language", "python"))
            for block in code_blocks
        ]
        token: CancellationToken = CancellationToken()
        result = await executor.execute_code_blocks(blocks, token)
        return {
            "status": "success",
            "exit_code": result.exit_code,
            "output": result.output,
            "code_file": result.code_file,
        }
    except Exception as e:
        return {"status": "error", "message": f"Code execution failed: {str(e)}"}


if __name__ == "__main__":
    mcp.run()
