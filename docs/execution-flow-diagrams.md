# Magentic-UI 执行流程分析

## 系统启动流程

### 1. 应用程序启动序列

```mermaid
sequenceDiagram
    participant User as 用户
    participant CLI as CLI (magentic-ui)
    participant Initializer as AppInitializer
    participant FastAPI as FastAPI Server
    participant DB as Database
    participant Docker as Docker Engine

    User->>CLI: 执行 magentic-ui --port 8081
    CLI->>Initializer: 检查配置和环境
    Initializer->>DB: 初始化数据库连接
    Initializer->>Docker: 检查 Docker 运行状态
    Initializer->>Initializer: 创建必要目录结构
    Initializer->>FastAPI: 启动 FastAPI 服务器
    FastAPI->>User: 服务器启动完成 (http://localhost:8081)
```

### 2. 系统初始化检查流程

```mermaid
flowchart TD
    A[启动 magentic-ui] --> B{检查 Docker 运行状态}
    B -->|Docker 未运行| C[显示错误并退出]
    B -->|Docker 运行中| D{检查 Docker 镜像}
    D -->|镜像不存在| E[拉取 ghcr.io 镜像]
    D -->|镜像存在| F{检查数据库}
    F -->|数据库不存在| G[创建数据库和表]
    F -->|数据库存在| H[启动 FastAPI 服务器]
    G --> H
    E --> H
```

## 代理执行流程

### 3. 任务执行完整流程

```mermaid
sequenceDiagram
    participant User as 用户
    participant Frontend as React Frontend
    participant API as FastAPI API
    participant Session as Session Manager
    participant Team as Task Team
    participant Agents as Multi-Agents
    participant Approval as Approval Guard
    participant Docker as Docker Container

    User->>Frontend: 创建新会话/输入任务
    Frontend->>API: POST /sessions/
    API->>Session: 创建会话记录
    Session->>API: 返回会话ID
    API->>Frontend: 返回会话信息

    User->>Frontend: 输入任务描述
    Frontend->>API: POST /runs/
    API->>Session: 创建运行记录
    Session->>Team: 初始化任务团队
    Team->>Agents: 配置代理 (WebSurfer, Coder, UserProxy等)

    Team->>API: WebSocket 连接
    API->>Frontend: 建立 WebSocket 通信

    loop 任务执行
        Agents->>Team: 执行子任务
        Team->>Approval: 检查是否需要批准
        Approval-->>User: 请求用户批准
        User-->>Approval: 用户决策
        Approval->>Team: 返回批准结果

        alt 需要代码执行
            Team->>Docker: 创建代码执行容器
            Docker->>Team: 执行代码并返回结果
        end

        alt 需要浏览器操作
            Team->>Agents: 启动 WebSurfer
            Agents->>Docker: 启动 Playwright 浏览器
            Docker->>Agents: 浏览器操作结果
            Agents->>Team: 返回网页内容
        end

        Team->>Frontend: 通过 WebSocket 发送进度
        Frontend->>User: 显示任务进度
    end

    Team->>Session: 保存最终结果
    Session->>API: 更新运行状态
    API->>Frontend: 通知任务完成
    Frontend->>User: 显示最终结果
```

### 4. 代理协作流程

```mermaid
graph TD
    A[用户输入任务] --> B[任务分析]
    B --> C{任务类型判断}

    C -->|网页相关任务| D[WebSurfer 代理]
    C -->|代码相关任务| E[CoderAgent 代理]
    C -->|文件相关任务| F[FileSurfer 代理]
    C -->|需要MCP工具| G[MCPAgent 代理]

    D --> H[浏览器自动化]
    E --> I[Docker 代码执行]
    F --> J[文件系统操作]
    G --> K[外部API调用]

    H --> L[Approval Guard 检查]
    I --> L
    J --> L
    K --> L

    L --> M{是否需要用户批准}
    M -->|需要| N[用户批准请求]
    M -->|不需要| O[继续执行]

    N --> P{用户决策}
    P -->|批准| O
    P -->|拒绝| Q[任务终止]

    O --> R[结果处理]
    R --> S[UserProxy 代理]
    S --> T[向用户报告结果]

    Q --> U[错误处理]
    U --> T
```

## 用户交互流程

### 5. 用户界面交互流程

```mermaid
sequenceDiagram
    participant User as 用户
    participant UI as React UI
    participant WebSocket as WebSocket
    participant API as REST API
    participant State as 状态管理

    User->>UI: 打开浏览器访问 http://localhost:8081
    UI->>API: GET / 获取前端资源
    API->>UI: 返回 React 应用

    UI->>State: 初始化应用状态
    State->>UI: 渲染主界面

    User->>UI: 创建新会话
    UI->>API: POST /sessions/
    API->>State: 保存会话信息
    State->>UI: 更新会话列表

    User->>UI: 输入任务描述
    UI->>API: POST /runs/
    API->>State: 创建运行记录
    State->>UI: 建立WebSocket连接

    UI->>WebSocket: 连接 /runs/{run_id}
    WebSocket->>State: 推送实时状态
    State->>UI: 更新任务进度显示

    loop 实时更新
        WebSocket->>UI: 推送代理消息
        UI->>User: 显示代理思考和行动
        WebSocket->>UI: 推送浏览器状态
        UI->>User: 显示浏览器视图
    end

    alt 需要用户批准
        WebSocket->>UI: 推送批准请求
        UI->>User: 显示批准对话框
        User->>UI: 点击批准/拒绝
        UI->>WebSocket: 发送用户决策
        WebSocket->>API: 传递用户决策
    end

    WebSocket->>UI: 推送任务完成
    UI->>User: 显示最终结果
```

### 6. 批准系统流程

```mermaid
flowchart LR
    A[代理请求操作] --> B[Approval Guard 检查]
    B --> C{操作风险评估}

    C -->|高风险操作| D[Always 需要批准]
    C -->|中风险操作| E[Maybe 需要批准]
    C -->|低风险操作| F[Never 需要批准]

    D --> G[显示批准对话框]
    E --> G
    F --> H[直接执行]

    G --> I{用户决策}
    I -->|批准| H
    I -->|拒绝| J[操作取消]

    H --> K[执行操作]
    K --> L[记录操作日志]
    L --> M[返回执行结果]

    J --> N[记录拒绝日志]
    N --> O[返回拒绝信息]
```

## 数据流架构

### 7. 数据流向图

```mermaid
graph TB
    subgraph "Frontend Layer"
        A[React UI] --> B[WebSocket Client]
        A --> C[REST API Client]
        B --> D[实时通信]
        C --> E[HTTP 请求]
    end

    subgraph "Backend Layer"
        F[FastAPI Server] --> G[WebSocket Manager]
        F --> H[REST Router]
        G --> I[Connection Manager]
        H --> J[Database Manager]
        I --> K[Session Management]
        J --> L[PostgreSQL Database]
    end

    subgraph "Agent Layer"
        M[Task Team] --> N[WebSurfer Agent]
        M --> O[CoderAgent]
        M --> P[FileSurfer Agent]
        M --> Q[UserProxy Agent]

        N --> R[Playwright Browser]
        O --> S[Docker Container]
        P --> T[File System]
        Q --> U[Approval Guard]
    end

    D --> G
    E --> H
    K --> M
    L --> J
    R --> S
    S --> T
    U --> Q
```

### 8. 错误处理流程

```mermaid
flowchart TD
    A[错误发生] --> B{错误类型}

    B -->|Docker 相关错误| C[Docker 错误处理]
    B -->|数据库错误| D[数据库错误处理]
    B -->|代理执行错误| E[代理错误处理]
    B -->|网络错误| F[网络错误处理]

    C --> G[显示 Docker 故障排除指南]
    D --> H[数据库连接重试]
    E --> I[代理重启机制]
    F --> J[WebSocket 重连]

    G --> K[用户提示解决步骤]
    H --> L{重试成功}
    I --> M{代理恢复成功}
    J --> N{连接恢复成功}

    L -->|成功| O[继续执行]
    L -->|失败| P[提示用户检查数据库]

    M -->|成功| O
    M -->|失败| Q[记录错误日志]

    N -->|成功| O
    N -->|失败| R[显示连接问题]

    P --> S[任务暂停]
    Q --> S
    R --> S

    S --> T[等待用户干预]
```

这些流程图展示了 Magentic-UI 的完整执行流程，包括系统启动、代理协作、用户交互和错误处理等关键环节。每个流程都体现了系统的设计特点和架构模式。