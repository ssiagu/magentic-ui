# Magentic-UI 用户使用指南

## 概述

Magentic-UI 是一个研究原型，提供了一个以人为中心的界面，由多代理系统驱动，能够浏览和执行网页操作、生成和执行代码、生成和分析文件。

### 核心特性

- **🧑‍🤝‍🧑 协作规划 (Co-Planning)**：通过聊天和计划编辑器协作创建和批准逐步计划
- **🤝 协作任务 (Co-Tasking)**：通过直接使用网络浏览器或通过聊天中断和指导任务执行
- **🛡️ 操作守卫 (Action Guards)**：敏感操作仅在获得明确用户批准后执行
- **🧠 计划学习和检索**：从之前的运行中学习以改进未来的任务自动化
- **🔀 并行任务执行**：可以并行运行多个任务

## 系统要求

### 必要条件

- **Python 3.10+**
- **Docker** (用于代码执行隔离)
- **Node.js** (用于前端开发)
- **足够的磁盘空间** (至少 5GB 用于 Docker 镜像)

### 操作系统支持

- **Windows**: 强烈推荐使用 WSL2 (Windows Subsystem for Linux)
- **macOS**: 使用 Docker Desktop
- **Linux**: 使用 Docker Engine

## 安装指南

### 方法一：PyPI 安装（推荐）

```bash
# 1. 创建虚拟环境
python3 -m venv .venv
source .venv/bin/activate

# 2. 安装 Magentic-UI
pip install magentic-ui --upgrade

# 3. 设置 API 密钥
export OPENAI_API_KEY="your-api-key-here"

# 4. 启动应用
magentic-ui --port 8081
```

### 方法二：使用 uv 包管理器

```bash
# 1. 创建虚拟环境
uv venv --python=3.12 .venv
. .venv/bin/activate

# 2. 安装依赖
uv pip install magentic-ui

# 3. 设置 API 密钥
export OPENAI_API_KEY="your-api-key-here"

# 4. 启动应用
magentic-ui --port 8081
```

### 方法三：从源码构建

此方法适用于需要修改代码或遇到 PyPI 安装问题的用户。

#### 1. 环境准备

确保已安装上述必要条件，并且 Docker 正在运行。

#### 2. 克隆仓库

```bash
git clone https://github.com/microsoft/magentic-ui.git
cd magentic-ui
```

#### 3. 安装 Python 依赖

```bash
uv venv --python=3.12 .venv
uv sync --all-extras
source .venv/bin/activate
```

#### 4. 构建前端

首先安装 Node.js：

```bash
# 安装 nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
nvm install node
```

然后构建前端：

```bash
cd frontend
npm install -g gatsby-cli
npm install --global yarn
yarn install
yarn build
```

#### 5. 运行应用

```bash
magentic-ui --port 8081
```

## 快速开始

### 基本使用

1. **启动应用**：
   ```bash
   magentic-ui --port 8081
   ```

2. **访问界面**：
   打开浏览器访问 http://localhost:8081

3. **创建会话**：
   - 点击左侧面板的"New Session"按钮
   - 输入您的任务描述
   - 可以上传文件进行分析

### 界面介绍

#### 左侧面板 - 会话导航器
- **🔴 需要输入**：会话等待用户输入
- **✅ 任务完成**：任务已成功完成
- **↺ 任务进行中**：任务正在执行中

#### 右侧面板 - 会话显示
- **左侧**：计划展示、任务进度和操作批准请求
- **右侧**：浏览器视图，实时查看代理操作
- **顶部**：进度条显示任务进展

## 高级配置

### 模型客户端配置

您可以使用不同的 AI 模型提供商：

#### 配置文件方式

创建 `config.yaml` 文件：

```yaml
gpt4o_client: &gpt4o_client
    provider: OpenAIChatCompletionClient
    config:
      model: gpt-4o-2024-08-06
      api_key: null
      base_url: null
      max_retries: 5

orchestrator_client: *gpt4o_client
coder_client: *gpt4o_client
web_surfer_client: *gpt4o_client
file_surfer_client: *gpt4o_client
action_guard_client: *gpt4o_client
plan_learning_client: *gpt4o_client
```

启动时指定配置文件：

```bash
magentic-ui --port 8081 --config config.yaml
```

#### Azure OpenAI 配置

```bash
# 安装 Azure 支持
pip install magentic-ui[azure]
```

配置文件示例：

```yaml
azure_client: &azure_client
    provider: AzureOpenAIChatCompletionClient
    config:
      model: gpt-4
      azure_endpoint: your-endpoint
      api_version: 2024-02-01
      api_key: your-api-key
```

#### Ollama 配置

```bash
# 安装 Ollama 支持
pip install magentic-ui[ollama]
```

### MCP 服务器配置

您可以扩展 Magentic-UI 的功能，添加自定义 MCP 代理：

```yaml
mcp_agent_configs:
  - name: airbnb_surfer
    description: "The airbnb_surfer has direct access to AirBnB."
    model_client:
      provider: OpenAIChatCompletionClient
      config:
        model: gpt-4.1-2025-04-14
      max_retries: 10
    system_message: |-
      You are AirBnb Surfer, a helpful digital assistant that can help users access AirBnB.
    reflect_on_tool_use: false
    mcp_servers:
      - server_name: AirBnB
        server_params:
          type: StdioServerParams
          command: npx
          args:
            - -y
            - "@openbnb/mcp-server-airbnb"
            - --ignore-robots-txt
```

## 开发模式

### 前端开发模式

如果您正在修改前端代码，可以运行开发模式：

1. **打开新终端**：
   ```bash
   cd frontend
   ```

2. **创建开发环境文件**：
   ```bash
   cp .env.default .env.development
   ```

3. **启动前端服务器**：
   ```bash
   npm run start
   ```

4. **运行后端**：
   ```bash
   magentic-ui --port 8081
   ```

- 开发模式前端：http://localhost:8000
- 生产模式前端：http://localhost:8081

### 后端开发模式

如果您正在修改后端代码，可以使用热重载模式：

#### 方法一：使用热重载（推荐）

1. **启动后端开发服务器**：
   ```bash
   magentic-ui --port 8081 --reload
   ```

2. **修改代码后**：
   - 后端会自动检测 Python 代码更改并重启
   - 前端刷新页面即可看到更改

#### 方法二：手动重启

1. **停止当前运行的服务**：
   ```bash
   # 按 Ctrl+C 停止服务
   ```

2. **重新启动服务**：
   ```bash
   magentic-ui --port 8081
   ```

#### 方法三：直接运行 Python 模块

1. **激活虚拟环境**：
   ```bash
   source .venv/bin/activate
   ```

2. **运行 FastAPI 应用**：
   ```bash
   # 使用 uvicorn 运行
   uvicorn magentic_ui.backend.web.app:app --reload --port 8081

   # 或使用 python -m
   python -m uvicorn magentic_ui.backend.web.app:app --reload --port 8081
   ```

#### 后端开发注意事项

1. **代码更改生效**：
   - Python 代码更改：使用 `--reload` 选项自动重启
   - 数据库模型更改：需要手动运行数据库迁移
   - 配置文件更改：需要重启服务

2. **数据库迁移**：
   ```bash
   # 如果修改了数据模型，运行迁移
   cd src/magentic_ui/backend
   alembic upgrade head
   ```

3. **调试模式**：
   ```bash
   # 启用详细日志
   export LOG_LEVEL=DEBUG
   magentic-ui --port 8081 --reload
   ```

4. **开发工具**：
   ```bash
   # 运行代码质量检查
   poe check

   # 仅运行类型检查
   poe mypy
   poe pyright

   # 格式化代码
   poe fmt
   ```

#### 常见开发场景

1. **修改 API 端点**：
   ```bash
   magentic-ui --reload --port 8081
   ```
   - 修改 `src/magentic_ui/backend/web/routes/` 下的文件
   - 更改会自动生效

2. **修改代理逻辑**：
   ```bash
   magentic-ui --reload --port 8081
   ```
   - 修改 `src/magentic_ui/agents/` 下的文件
   - 更改会自动生效

3. **修改配置**：
   ```bash
   # 需要完全重启
   magentic-ui --port 8081 --config config.yaml
   ```

4. **数据库模式更改**：
   ```bash
   # 1. 修改模型文件
   # 2. 生成迁移
   cd src/magentic_ui/backend
   alembic revision --autogenerate -m "描述"
   # 3. 应用迁移
   alembic upgrade head
   # 4. 重启服务
   magentic-ui --port 8081
   ```

#### 全栈开发模式

如果您同时修改前端和后端：

1. **终端 1 - 前端开发服务器**：
   ```bash
   cd frontend
   npm run start
   ```

2. **终端 2 - 后端开发服务器**：
   ```bash
   magentic-ui --port 8081 --reload
   ```

3. **访问地址**：
   - 前端开发：http://localhost:8000
   - 后端 API：http://localhost:8081
   - API 文档：http://localhost:8081/docs

这样您可以同时开发前端和后端，所有更改都会自动生效。

### 代码质量控制

```bash
# 格式化代码
poe fmt
poe format

# 代码检查
poe lint

# 类型检查
poe mypy
poe pyright

# 运行测试
poe test

# 运行所有检查
poe check
```

## 运行选项

### 基本运行选项

```bash
# 指定端口
magentic-ui --port 8081

# 指定主机
magentic-ui --host 0.0.0.0 --port 8081

# 使用自定义工作目录
magentic-ui --appdir /path/to/workspace

# 使用自定义数据库
magentic-ui --database-uri "postgresql://user:pass@localhost/dbname"

# 启动时升级数据库
magentic-ui --upgrade-database

# 使用配置文件
magentic-ui --config config.yaml
```

### 高级运行选项

```bash
# 运行多个工作进程
magentic-ui --workers 4

# 开启热重载（开发模式）
magentic-ui --reload

# 禁用 API 文档
magentic-ui --docs false

# 无 Docker 模式（功能受限）
magentic-ui --run-without-docker
```

## 命令行界面

除了 Web 界面，Magentic-UI 还提供命令行界面：

```bash
# 使用 CLI
magentic-cli --work-dir /path/to/store/data
```

## 故障排除

### 常见问题

1. **Docker 未运行**
   ```
   Docker is not running. Please start Docker and try again.
   ```
   解决方案：启动 Docker Desktop 或 Docker 服务

2. **端口被占用**
   ```
   Port 8081 is already in use
   ```
   解决方案：使用其他端口 `magentic-ui --port 8082`

3. **镜像拉取失败**
   ```
   Failed to pull Docker image
   ```
   解决方案：检查网络连接，或手动构建镜像：
   ```bash
   cd docker
   sh build-all.sh
   ```

4. **前端构建失败**
   ```
   Frontend build failed
   ```
   解决方案：清理 node_modules 并重新安装：
   ```bash
   cd frontend
   rm -rf node_modules
   yarn install
   yarn build
   ```

### 日志和调试

- **应用日志**：查看终端输出
- **浏览器控制台**：F12 打开开发者工具
- **Docker 日志**：`docker logs <container_id>`

### 性能优化

1. **首次启动较慢**：需要下载 Docker 镜像（约 2-4GB）
2. **内存使用**：建议至少 8GB 内存
3. **磁盘空间**：确保有足够空间存储 Docker 镜像和文件

## 安全考虑

### 数据安全

- **本地处理**：所有数据处理都在本地完成
- **Docker 隔离**：代码执行在隔离的容器中进行
- **用户批准**：敏感操作需要用户明确批准

### API 密钥安全

- 使用环境变量存储 API 密钥
- 不要在配置文件中硬编码密钥
- 定期轮换 API 密钥

## 最佳实践

### 任务优化

1. **明确任务描述**：提供清晰、具体的任务说明
2. **分步执行**：复杂任务分解为多个简单步骤
3. **文件管理**：及时清理不需要的文件
4. **并行处理**：利用多会话并行执行独立任务

### 开发工作流

1. **使用版本控制**：定期提交代码更改
2. **测试驱动**：编写测试用例验证功能
3. **代码审查**：使用 `poe check` 确保代码质量
4. **文档更新**：及时更新相关文档

## 扩展和定制

### 添加新代理

在 `src/magentic_ui/agents/` 目录下创建新的代理类：

```python
from autogen_agentchat.agents import AssistantAgent

class CustomAgent(AssistantAgent):
    def __init__(self, name: str, **kwargs):
        super().__init__(name=name, **kwargs)
        # 自定义逻辑
```

### 添加新工具

在 `src/magentic_ui/tools/` 目录下添加新工具：

```python
from autogen_ext.tools import BaseTool

class CustomTool(BaseTool):
    def __init__(self):
        super().__init__(
            name="custom_tool",
            description="Custom tool description"
        )

    def run_impl(self, args: dict) -> str:
        # 工具实现
        return "Tool result"
```

## 社区和支持

### 获取帮助

- **GitHub Issues**: [https://github.com/microsoft/magentic-ui/issues](https://github.com/microsoft/magentic-ui/issues)
- **文档**: 查看 `docs/` 目录下的详细文档
- **示例**: 查看 `samples/` 目录下的配置示例

### 贡献指南

欢迎贡献代码和建议！请参考 [CONTRIBUTING.md](../CONTRIBUTING.md) 了解更多信息。

## 附录

### 环境变量参考

| 变量名 | 描述 | 默认值 |
|--------|------|--------|
| `OPENAI_API_KEY` | OpenAI API 密钥 | 必须设置 |
| `DATABASE_URI` | 数据库连接字符串 | 自动创建 |
| `_APPDIR` | 应用目录 | `~/.magentic_ui` |
| `_CONFIG` | 配置文件路径 | `config.yaml` |

### 配置文件完整示例

```yaml
# 基础模型配置
base_client: &base_client
  provider: OpenAIChatCompletionClient
  config:
    model: gpt-4o-mini
    api_key: null
    base_url: null
    max_retries: 5
    temperature: 0.7

# 代理配置
orchestrator_client: *base_client
coder_client: *base_client
web_surfer_client: *base_client
file_surfer_client: *base_client
action_guard_client: *base_client
plan_learning_client: *base_client

# MCP 代理配置
mcp_agent_configs:
  - name: filesystem_agent
    description: "File system operations"
    model_client: *base_client
    system_message: "You are a file system expert."
    mcp_servers:
      - server_name: filesystem
        server_params:
          type: StdioServerParams
          command: npx
          args: ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed/dir"]
```

### 性能基准

- **启动时间**：首次启动 2-5 分钟，后续启动 10-30 秒
- **内存使用**：基础运行 1-2GB，任务执行时 2-4GB
- **磁盘空间**：Docker 镜像约 2-4GB
- **网络带宽**：首次下载约 500MB-2GB

---

**Author**: ssiagu
**Email**: ssiagu@gmail.com
**Document Signature**: ssiagu

---

*最后更新：2025-10-09*