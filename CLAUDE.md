# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Magentic-UI is a research prototype of a human-centered interface powered by a multi-agent system that can browse and perform actions on the web, generate and execute code, and generate and analyze files. It combines a Python backend with a web frontend to provide an interactive AI assistant interface.

## Development Commands

### Common Development Tasks
```bash
# Format code
poe fmt
poe format

# Lint code
poe lint

# Type checking
poe mypy
poe pyright

# Run tests (installs playwright and runs pytest)
poe test

# Run all checks
poe check
```

### Running the Application
```bash
# Install and run with Docker (recommended)
pip install magentic-ui
export OPENAI_API_KEY="your-api-key"
magentic-ui --port 8081

# Run without Docker (limited functionality)
magentic-ui --run-without-docker --port 8081

# Development mode from source
uv sync
python -m magentic_ui.backend.cli --port 8081
```

## Architecture

### Core Components

1. **Backend (`src/magentic_ui/backend/`)**
   - FastAPI web server providing REST API
   - WebSocket endpoint for real-time communication
   - Database layer with SQLModel/PostgreSQL
   - Team management for orchestrating multiple agents

2. **Agents (`src/magentic_ui/agents/`)**
   - **Web Surfer**: Browser automation using Playwright
   - **File Surfer**: File system navigation and code analysis
   - **MCP Agents**: Integration with Model Context Protocol servers
   - **User Proxy**: Human-in-the-loop interaction patterns

3. **Frontend (`frontend/`)**
   - React-based web interface
   - Real-time chat and visualization
   - File upload and management
   - Agent coordination UI

4. **Configuration (`src/magentic_ui/teams/`)**
   - Orchestrator team definitions
   - Agent team configurations
   - Task routing and coordination

### Key Architecture Patterns

- **Multi-Agent System**: Uses Microsoft AutoGen framework for agent orchestration
- **Docker Isolation**: Code execution happens in isolated Docker containers
- **Event-Driven**: WebSocket-based real-time communication
- **Approval Guards**: Human oversight for sensitive operations
- **MCP Integration**: Extensible via Model Context Protocol servers

## Development Environment

### Prerequisites
- Python 3.10+
- Docker (for code execution isolation)
- Node.js (for frontend development)
- uv package manager

### Setup
```bash
# Clone and setup environment
git clone https://github.com/microsoft/magentic-ui.git
cd magentic-ui
python3 -m venv .venv
source .venv/bin/activate
uv sync

# Install Playwright browsers
poe test
```

### Testing
- Tests are in `tests/` directory
- Use `poe test` to run the full test suite
- Playwright browsers are automatically installed before testing
- Coverage reports generated in XML format

### Type Safety
- Uses both mypy and pyright for type checking
- Strict type checking mode enabled
- Configuration in `pyproject.toml`

## Configuration

### Environment Variables
- `OPENAI_API_KEY`: Required for AI model access
- `DATABASE_URL`: PostgreSQL connection string
- `MAGENTIC_UI_CONFIG_PATH`: Path to configuration file

### Docker Integration
- Uses Docker containers for safe code execution
- Images available on GitHub Container Registry (GHCR)
- Can run without Docker but with limited functionality

### MCP Servers
- Supports Model Context Protocol servers
- Configuration in `src/magentic_ui/agents/mcp/`
- Dynamic server loading and management

## Code Style and Quality

- **Formatting**: Ruff formatter with standard Python conventions
- **Linting**: Ruff linter with custom rules
- **Type Safety**: Strict mypy and pyright configuration
- **Testing**: pytest with coverage reporting
- **Documentation**: Sphinx with auto-generated type hints

## Important Notes

- This is a research prototype, not production software
- Windows users should use WSL2 for Docker functionality
- Code execution requires Docker for security isolation
- The UI runs on localhost by default (port 8081)
- All operations require human approval by default for safety