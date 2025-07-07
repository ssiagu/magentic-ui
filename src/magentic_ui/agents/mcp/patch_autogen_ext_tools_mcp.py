import logging
from autogen_ext.tools.mcp import McpSessionActor, create_mcp_server_session

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s"
)
logger = logging.getLogger(__name__)

async def _run_actor(self) -> None:
    try:
        async with create_mcp_server_session(self.server_params) as session:
            await session.initialize()
            while True:
                cmd = await self._command_queue.get()
                if cmd["type"] == "shutdown":
                    cmd["future"].set_result("ok")
                    break
                elif cmd["type"] == "call_tool":
                    try:
                        result = session.call_tool(
                            name=cmd["name"], arguments=cmd["args"]
                        )
                        cmd["future"].set_result(result)
                    except Exception as e:
                        cmd["future"].set_exception(e)
                elif cmd["type"] == "list_tools":
                    try:
                        result = session.list_tools()
                        cmd["future"].set_result(result)
                    except Exception as e:
                        cmd["future"].set_exception(e)
    except Exception as e:
        if self._shutdown_future and not self._shutdown_future.done():
            self._shutdown_future.set_exception(e)
        ### THIS IS THE PATCH ###
        else:
            logger.exception("Exception in McpSessionActor._run_actor")
            raise e
    finally:
        self._active = False
        self._actor_task = None


logger.warning("Patching autogen_ext[mcp].tools.mcp.McpSessionActor._runActor")
McpSessionActor._run_actor = _run_actor
