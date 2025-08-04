import asyncio
import subprocess
import shutil
import requests
from typing import Dict, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from magentic_ui.tools.mcp import AggregateMcpWorkbench, NamedMcpServerParams
from autogen_ext.tools.mcp import StdioServerParams, SseServerParams

router = APIRouter()


class ServerHealthRequest(BaseModel):
    server_name: str
    server_type: str
    server_params: Dict


class ServerHealthResponse(BaseModel):
    server_name: str
    is_connected: bool
    error_message: str = None
    tools_available: List[str] = []


class ServerDiscoveryRequest(BaseModel):
    command: str
    args: List[str] = []


def test_command_exists(command: str) -> bool:
    """Test if a command exists in PATH"""
    return shutil.which(command) is not None


def test_npm_package_exists(package_name: str) -> bool:
    """Test if npm package exists without downloading"""
    try:
        response = requests.get(
            f"https://www.npmjs.com/package/{package_name}",
            timeout=5
        )
        return response.status_code == 200
    except:
        return False


def test_docker_image_exists(image_name: str) -> bool:
    """Test if Docker image exists locally or in registry"""

    # Check local first (instant)
    result = subprocess.run(
        ["docker", "images", "-q", image_name],
        capture_output=True,
        text=True
    )
    if result.stdout.strip():
        return True

    # Check registry (lightweight)
    if image_name.startswith("ghcr.io/"):
        org, repo = image_name.replace("ghcr.io/", "").split("/", 1)
        url = f"https://ghcr.io/v2/{org}/{repo}/manifests/latest"
        try:
            response = requests.head(url, timeout=5)
            return response.status_code == 200
        except:
            return False

    return False


def test_http_endpoint(url: str, headers: dict = None) -> bool:
    """Test if HTTP endpoint is reachable"""
    try:
        response = requests.head(url, headers=headers, timeout=5)
        return response.status_code < 500  # Any non-server error is OK
    except:
        return False


@router.post("/quick-test-connection")
async def quick_test_mcp_server_connection(request: ServerHealthRequest) -> Dict:
    """Lightweight test of MCP server without heavy operations"""

    try:
        server_type = request.server_type
        server_params = request.server_params

        if server_type == "StdioServerParams":
            command = server_params.get("command", "")
            args = server_params.get("args", [])

            # Test 1: Command exists
            if not test_command_exists(command):
                return {
                    "server_name": request.server_name,
                    "is_connected": False,
                    "error_message": f"Command '{command}' not found in PATH",
                    "tools_available": []
                }

            # Test 2: For npm packages, check registry
            if command == "npx" and args:
                # Find the package name (first argument that starts with @ or doesn't start with -)
                package_name = None
                for arg in args:
                    if arg.startswith("@") or (not arg.startswith("-") and not arg.startswith("--")):
                        package_name = arg
                        break

                if package_name and not test_npm_package_exists(package_name):
                    return {
                        "server_name": request.server_name,
                        "is_connected": False,
                        "error_message": f"Package '{package_name}' not found in npm registry",
                        "tools_available": []
                    }

            # Test 3: For Docker, check image availability
            if command == "docker" and "run" in args:
                try:
                    run_index = args.index("run")
                    if run_index + 1 < len(args):
                        image_name = args[run_index + 1]
                        if not test_docker_image_exists(image_name):
                            return {
                                "server_name": request.server_name,
                                "is_connected": False,
                                "error_message": f"Docker image '{image_name}' not found locally or in registry",
                                "tools_available": []
                            }
                except (ValueError, IndexError):
                    return {
                        "server_name": request.server_name,
                        "is_connected": False,
                        "error_message": "Invalid Docker command format",
                        "tools_available": []
                    }

            return {
                "server_name": request.server_name,
                "is_connected": True,
                "error_message": None,
                "tools_available": [],
                "warning": "Lightweight test passed. Full connection test recommended for complete verification."
            }

        elif server_type == "SseServerParams":
            url = server_params.get("url", "")
            headers = server_params.get("headers", {})

            if not url:
                return {
                    "server_name": request.server_name,
                    "is_connected": False,
                    "error_message": "URL is required for SSE server",
                    "tools_available": []
                }

            if not test_http_endpoint(url, headers):
                return {
                    "server_name": request.server_name,
                    "is_connected": False,
                    "error_message": f"HTTP endpoint '{url}' is not reachable",
                    "tools_available": []
                }

            return {
                "server_name": request.server_name,
                "is_connected": True,
                "error_message": None,
                "tools_available": [],
                "warning": "Lightweight test passed. Full connection test recommended for complete verification."
            }

        else:
            return {
                "server_name": request.server_name,
                "is_connected": False,
                "error_message": f"Unsupported server type: {server_type}",
                "tools_available": []
            }

    except Exception as e:
        return {
            "server_name": request.server_name,
            "is_connected": False,
            "error_message": str(e),
            "tools_available": []
        }


@router.post("/test-command-exists")
async def test_command_exists(request: ServerDiscoveryRequest) -> Dict:
    """Test if a command exists and can be executed"""

    try:
        # Check if the command exists in PATH
        command_path = shutil.which(request.command)
        if not command_path:
            return {
                "command": request.command,
                "exists": False,
                "error_message": f"Command '{request.command}' not found in PATH",
                "suggestions": []
            }

        # Test if the command can be executed
        try:
            # Try to run the command with --help or --version to test execution
            test_args = request.args + ["--help"]
            result = subprocess.run(
                [request.command] + test_args,
                capture_output=True,
                text=True,
                timeout=5.0
            )

            return {
                "command": request.command,
                "exists": True,
                "path": command_path,
                "error_message": None,
                "suggestions": []
            }

        except subprocess.TimeoutExpired:
            return {
                "command": request.command,
                "exists": True,
                "path": command_path,
                "error_message": "Command timed out during test",
                "suggestions": []
            }
        except subprocess.CalledProcessError as e:
            return {
                "command": request.command,
                "exists": True,
                "path": command_path,
                "error_message": f"Command failed: {e.stderr}",
                "suggestions": []
            }

    except Exception as e:
        return {
            "command": request.command,
            "exists": False,
            "error_message": str(e),
            "suggestions": []
        }


@router.post("/test-connection")
async def test_mcp_server_connection(request: ServerHealthRequest) -> Dict:
    """Test if an MCP server is connected and responding"""

    print("[Debug] test_mcp_server_connection hit")
    try:
        # Convert server params to the correct type
        if request.server_type == "StdioServerParams":
            server_params = StdioServerParams(**request.server_params)
        elif request.server_type == "SseServerParams":
            server_params = SseServerParams(**request.server_params)
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported server type: {request.server_type}")

        # Create named server params
        named_params = NamedMcpServerParams(
            server_name=request.server_name,
            server_params=server_params
        )

        # Test the connection with a timeout
        try:
            # Use asyncio.wait_for to add a timeout
            result = await asyncio.wait_for(
                _test_server_connection(named_params),
                timeout=10.0  # 10 second timeout
            )
            return result
        except asyncio.TimeoutError:
            return {
                "server_name": request.server_name,
                "is_connected": False,
                "error_message": "Connection timeout - server did not respond within 10 seconds",
                "tools_available": []
            }

    except Exception as e:
        return {
            "server_name": request.server_name,
            "is_connected": False,
            "error_message": str(e),
            "tools_available": []
        }


async def _test_server_connection(named_params: NamedMcpServerParams) -> Dict:
    """Test a single MCP server connection"""

    try:
        # Create workbench with just this server
        workbench = AggregateMcpWorkbench([named_params])
        # Start the workbench
        await workbench.start()

        try:
            # Try to list tools - this will test the connection
            tools = await workbench.list_tools()
            tool_names = [tool["name"] for tool in tools]
            print(tool_names)

            return {
                "server_name": named_params.server_name,
                "is_connected": True,
                "error_message": None,
                "tools_available": tool_names
            }

        finally:
            # Always stop the workbench
            await workbench.stop()

    except Exception as e:
        return {
            "server_name": named_params.server_name,
            "is_connected": False,
            "error_message": str(e),
            "tools_available": []
        }
