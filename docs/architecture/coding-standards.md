# Magentic-UI 编码标准

**Author**: ssiagu
**Email**: ssiagu@gmail.com
**Document Signature**: ssiagu
**最后更新**: 2025-10-21
**版本**: v1.0

## 📋 概述

本文档定义了Magentic-UI项目的编码标准和最佳实践，确保代码质量、一致性和可维护性。这些标准适用于所有参与项目的开发者和AI编码助手。

## 🎯 核心原则

### 1. 类型安全优先
- **前端**: 所有代码必须使用TypeScript，禁止使用`any`类型
- **后端**: 使用Pydantic进行数据验证，确保类型安全
- **API设计**: 所有API接口必须有明确的类型定义

### 2. 异步操作规范
- 所有I/O操作必须使用`async/await`模式
- 避免阻塞操作，使用异步库和框架
- 正确处理异步异常和取消令牌

### 3. 错误处理标准
- 每个API端点必须有适当的错误处理
- 使用结构化错误响应格式
- 记录详细的错误日志用于调试

### 4. 安全性要求
- 所有用户输入必须经过验证和清理
- 使用参数化查询防止SQL注入
- 敏感信息必须通过环境变量管理

### 5. 测试覆盖要求
- 新功能必须包含单元测试
- 关键业务逻辑需要集成测试
- API变更需要更新相关测试

## 🐍 Python后端编码标准

### 代码格式化
```python
# 使用Black进行代码格式化
black src/ tests/ samples

# 使用Ruff进行代码检查和自动修复
ruff check src/ --fix
ruff format src/
```

### 命名约定
```python
# 类名：PascalCase
class WebSurferAgent:
    pass

# 函数和变量：snake_case
def process_web_page(url: str) -> dict:
    page_content = fetch_page(url)
    return page_content

# 常量：UPPER_SNAKE_CASE
MAX_RETRIES = 10
DEFAULT_TIMEOUT = 30

# 私有方法：前缀下划线
def _validate_input(self, data: dict) -> bool:
    return True
```

### 类型注解
```python
from typing import List, Dict, Optional, Union, Callable, Any
from pydantic import BaseModel

# 明确的类型注解
def create_agent(
    name: str,
    config: Dict[str, Any],
    callback: Optional[Callable[[str], None]] = None
) -> Agent:
    return Agent(name=name, config=config)

# 数据模型使用Pydantic
class AgentConfig(BaseModel):
    name: str
    model: str = "gpt-4"
    temperature: float = 0.7
    max_tokens: int = 4000
    tools: List[str] = []
```

### 异步编程
```python
import asyncio
from typing import AsyncGenerator

# 正确的异步函数定义
async def process_message(message: dict) -> dict:
    try:
        # 异步操作
        result = await api_call(message["content"])
        return {"status": "success", "data": result}
    except Exception as e:
        logger.error(f"Message processing failed: {e}")
        return {"status": "error", "message": str(e)}

# 异步生成器
async def stream_responses(messages: List[dict]) -> AsyncGenerator[dict, None]:
    for message in messages:
        response = await process_message(message)
        yield response
        await asyncio.sleep(0.1)  # 避免阻塞
```

### 错误处理
```python
from fastapi import HTTPException, status
from .exceptions import MagenticUIException

# 自定义异常
class AgentException(MagenticUIException):
    def __init__(self, message: str, agent_name: str):
        super().__init__(
            message=message,
            code="AGENT_ERROR",
            details={"agent_name": agent_name}
        )

# 错误处理模式
async def execute_agent_task(agent_name: str, task: dict) -> dict:
    try:
        agent = get_agent(agent_name)
        if not agent:
            raise AgentException(f"Agent {agent_name} not found", agent_name)

        result = await agent.execute(task)
        return result

    except AgentException:
        raise  # 重新抛出已知异常
    except Exception as e:
        logger.exception(f"Unexpected error in agent {agent_name}")
        raise MagenticUIException(
            message=f"Agent execution failed: {str(e)}",
            code="EXECUTION_ERROR"
        )
```

### 数据库操作
```python
from sqlalchemy.orm import Session
from .datamodel.db import Run, Message

# Repository模式
class RunRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_run(self, run_data: dict, user_id: str) -> Run:
        run = Run(
            user_id=user_id,
            task=run_data["task"],
            config=run_data.get("config", {}),
            status="running"
        )
        self.db.add(run)
        self.db.commit()
        self.db.refresh(run)
        return run

    def get_user_runs(self, user_id: str, limit: int = 20) -> List[Run]:
        return (
            self.db.query(Run)
            .filter(Run.user_id == user_id)
            .order_by(Run.created_at.desc())
            .limit(limit)
            .all()
        )

# 使用依赖注入
def get_run_repository(db: Session = Depends(get_db)) -> RunRepository:
    return RunRepository(db)
```

### API路由设计
```python
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List

router = APIRouter(prefix="/api/runs", tags=["runs"])

@router.get("/", response_model=List[RunResponse])
async def get_runs(
    limit: int = 20,
    offset: int = 0,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    repo: RunRepository = Depends(get_run_repository)
) -> List[RunResponse]:
    """获取运行列表"""
    try:
        runs = repo.get_user_runs(current_user.id, limit, offset, status)
        return [RunResponse.from_orm(run) for run in runs]
    except Exception as e:
        logger.error(f"Failed to get runs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve runs"
        )

@router.post("/", response_model=RunResponse, status_code=status.HTTP_201_CREATED)
async def create_run(
    run_data: RunCreate,
    current_user: User = Depends(get_current_user),
    repo: RunRepository = Depends(get_run_repository)
) -> RunResponse:
    """创建新运行"""
    try:
        run = repo.create_run(run_data.dict(), current_user.id)
        return RunResponse.from_orm(run)
    except Exception as e:
        logger.error(f"Failed to create run: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create run"
        )
```

## ⚛️ React/TypeScript前端编码标准

### 组件设计
```typescript
// 使用函数组件和Hooks
import React, { useState, useEffect, useCallback } from 'react';
import { Button, message } from 'antd';
import { useWebSocket } from '../hooks/useWebSocket';
import { Message } from '../types/models';

interface ChatComponentProps {
  sessionId: string;
  onMessageSend?: (message: string) => void;
  className?: string;
}

export const ChatComponent: React.FC<ChatComponentProps> = ({
  sessionId,
  onMessageSend,
  className
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { sendMessage, isConnected, lastMessage } = useWebSocket(sessionId);

  // 使用useCallback优化性能
  const handleSendMessage = useCallback(() => {
    if (inputValue.trim() && isConnected) {
      const message: Message = {
        id: generateId(),
        sessionId,
        content: inputValue,
        sender: 'user',
        timestamp: new Date().toISOString(),
        messageType: 'text'
      };

      sendMessage(message);
      setInputValue('');
      onMessageSend?.(inputValue);
    } else if (!isConnected) {
      message.error('连接已断开，请刷新页面重试');
    }
  }, [inputValue, isConnected, sessionId, sendMessage, onMessageSend]);

  // 处理WebSocket消息
  useEffect(() => {
    if (lastMessage) {
      setMessages(prev => [...prev, lastMessage]);
    }
  }, [lastMessage]);

  return (
    <div className={`chat-component ${className || ''}`}>
      {/* 消息列表 */}
      <div className="messages-container">
        {messages.map(message => (
          <MessageItem key={message.id} message={message} />
        ))}
      </div>

      {/* 输入区域 */}
      <div className="input-container">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="输入消息..."
          disabled={!isConnected}
        />
        <Button
          type="primary"
          onClick={handleSendMessage}
          loading={isLoading}
          disabled={!isConnected || !inputValue.trim()}
        >
          发送
        </Button>
      </div>
    </div>
  );
};
```

### Hooks设计
```typescript
// 自定义Hook示例
import { useState, useEffect, useCallback, useRef } from 'react';
import { message } from 'antd';

interface UseWebSocketOptions {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  reconnectAttempts?: number;
  reconnectInterval?: number;
}

interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

export const useWebSocket = (
  sessionId: string,
  options: UseWebSocketOptions = {}
) => {
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    error: null
  });

  const [lastMessage, setLastMessage] = useState<any>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);

  const {
    onConnect,
    onDisconnect,
    onError,
    reconnectAttempts = 5,
    reconnectInterval = 3000
  } = options;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    const ws = new WebSocket(`ws://localhost:8000/ws/${sessionId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setState(prev => ({ ...prev, isConnected: true, isConnecting: false }));
      reconnectCountRef.current = 0;
      onConnect?.();
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setLastMessage(data);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      setState(prev => ({ ...prev, isConnected: false, isConnecting: false }));
      onDisconnect?.();

      // 自动重连
      if (reconnectCountRef.current < reconnectAttempts) {
        reconnectCountRef.current++;
        setTimeout(connect, reconnectInterval);
      }
    };

    ws.onerror = (error) => {
      setState(prev => ({ ...prev, error: 'WebSocket连接错误' }));
      onError?.(error);
    };
  }, [sessionId, onConnect, onDisconnect, onError, reconnectAttempts, reconnectInterval]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      message.error('WebSocket未连接');
    }
  }, []);

  useEffect(() => {
    connect();
    return disconnect;
  }, [connect, disconnect]);

  return {
    ...state,
    lastMessage,
    sendMessage,
    connect,
    disconnect
  };
};
```

### 类型定义
```typescript
// 统一的类型定义
export interface Message {
  id: string;
  sessionId: string;
  content: string;
  sender: string;
  timestamp: string;
  messageType: 'text' | 'image' | 'file' | 'system' | 'tool_call' | 'tool_result';
  metadata?: Record<string, any>;
}

export interface Run {
  id: string;
  sessionId: string;
  userId: string;
  task: string;
  status: 'running' | 'completed' | 'failed' | 'paused';
  config: Record<string, any>;
  result?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

// API响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
    timestamp: string;
    requestId: string;
  };
}

// 分页响应类型
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}
```

### 服务层设计
```typescript
// API客户端
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // 请求拦截器
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // 响应拦截器
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post(url, data, config);
    return response.data;
  }
}

export const apiClient = new ApiClient();

// 服务类
export class RunService {
  async getRuns(params?: {
    limit?: number;
    offset?: number;
    status?: string;
  }): Promise<PaginatedResponse<Run>> {
    return apiClient.get('/api/runs', { params });
  }

  async getRun(id: string): Promise<Run> {
    return apiClient.get(`/api/runs/${id}`);
  }

  async createRun(data: {
    sessionId: string;
    task: string;
    config?: Record<string, any>;
  }): Promise<Run> {
    return apiClient.post('/api/runs', data);
  }

  async pauseRun(id: string): Promise<void> {
    return apiClient.post(`/api/runs/${id}/pause`);
  }

  async resumeRun(id: string): Promise<void> {
    return apiClient.post(`/api/runs/${id}/resume`);
  }
}

export const runService = new RunService();
```

## 🧪 测试标准

### 后端测试
```python
# 单元测试示例
import pytest
from unittest.mock import Mock, patch
from magentic_ui.backend.services.run_service import RunService
from magentic_ui.backend.datamodel.db import Run

class TestRunService:
    @pytest.fixture
    def mock_db(self):
        return Mock()

    @pytest.fixture
    def run_service(self, mock_db):
        return RunService(mock_db)

    def test_create_run_success(self, run_service, mock_db):
        # Arrange
        run_data = {
            "session_id": "test-session",
            "task": "Test task",
            "config": {"model": "gpt-4"}
        }
        user_id = "test-user"

        mock_run = Run(
            id="test-id",
            session_id=run_data["session_id"],
            user_id=user_id,
            task=run_data["task"],
            config=run_data["config"]
        )
        mock_db.add.return_value = None
        mock_db.commit.return_value = None
        mock_db.refresh.return_value = None

        # Act
        result = run_service.create_run(run_data, user_id)

        # Assert
        assert result.session_id == run_data["session_id"]
        assert result.user_id == user_id
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_run_stream_with_error(self, run_service):
        # Arrange
        with patch.object(run_service, '_execute_task') as mock_execute:
            mock_execute.side_effect = Exception("Test error")

            # Act & Assert
            with pytest.raises(Exception, match="Test error"):
                async for _ in run_service.run_stream("test-task"):
                    pass
```

### 前端测试
```typescript
// 组件测试示例
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatComponent } from '../ChatComponent';
import { WebSocketProvider } from '../../contexts/WebSocketContext';

// Mock WebSocket hook
jest.mock('../../hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    sendMessage: jest.fn(),
    isConnected: true,
    lastMessage: null,
    error: null
  })
}));

describe('ChatComponent', () => {
  const defaultProps = {
    sessionId: 'test-session-id',
    onMessageSend: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders chat interface correctly', () => {
    render(
      <WebSocketProvider>
        <ChatComponent {...defaultProps} />
      </WebSocketProvider>
    );

    expect(screen.getByPlaceholderText('输入消息...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '发送' })).toBeInTheDocument();
  });

  test('sends message when form is submitted', async () => {
    const user = userEvent.setup();

    render(
      <WebSocketProvider>
        <ChatComponent {...defaultProps} />
      </WebSocketProvider>
    );

    const input = screen.getByPlaceholderText('输入消息...');
    const sendButton = screen.getByRole('button', { name: '发送' });

    await user.type(input, 'Hello, World!');
    await user.click(sendButton);

    await waitFor(() => {
      expect(defaultProps.onMessageSend).toHaveBeenCalledWith('Hello, World!');
    });

    expect(input).toHaveValue('');
  });

  test('disables send button when disconnected', () => {
    jest.doMock('../../hooks/useWebSocket', () => ({
      useWebSocket: () => ({
        sendMessage: jest.fn(),
        isConnected: false,  // 模拟断开连接
        lastMessage: null,
        error: null
      })
    }));

    render(
      <WebSocketProvider>
        <ChatComponent {...defaultProps} />
      </WebSocketProvider>
    );

    const sendButton = screen.getByRole('button', { name: '发送' });
    expect(sendButton).toBeDisabled();
  });
});
```

## 📁 文件和目录命名规范

### 后端目录结构
```
src/magentic_ui/
├── agents/                   # 智能体实现
│   ├── web_surfer/          # Web浏览智能体 (snake_case)
│   ├── file_surfer/         # 文件操作智能体
│   └── mcp/                 # MCP相关
├── backend/                  # 后端服务
│   ├── web/                 # Web API
│   │   ├── routes/          # API路由 (复数形式)
│   │   ├── middleware/      # 中间件
│   │   └── deps.py          # 依赖注入
│   ├── teammanager/         # 团队管理器
│   └── datamodel/           # 数据模型
├── tools/                    # 工具集成
└── eval/                     # 评估框架
```

### 前端目录结构
```
frontend/src/
├── components/               # 可复用组件 (复数形式)
│   ├── common/              # 通用组件
│   ├── features/            # 功能组件
│   └── layout/              # 布局组件
├── pages/                    # 页面组件 (复数形式)
├── hooks/                    # 自定义Hooks (复数形式，use前缀)
├── services/                 # API服务 (复数形式)
├── stores/                   # 状态管理 (复数形式)
├── types/                    # TypeScript类型 (复数形式)
├── utils/                    # 工具函数 (复数形式)
└── styles/                   # 样式文件 (复数形式)
```

### 文件命名约定
```
# Python文件
web_surfer.py          # 模块名：snake_case
run_service.py         # 服务名：snake_case + 后缀
test_web_surfer.py     # 测试文件：test_前缀

# TypeScript文件
ChatComponent.tsx      # 组件：PascalCase
useWebSocket.ts        # Hook：use前缀 + PascalCase
runService.ts          # 服务：camelCase + Service后缀
types.ts               # 类型文件：复数形式或具体描述

# 配置文件
docker-compose.yml     # Docker编排
pyproject.toml         # Python项目配置
package.json           # Node.js依赖配置
.env.example           # 环境变量模板
```

## 🔧 开发工具配置

### Python配置
```toml
# pyproject.toml
[tool.ruff]
line-length = 100
target-version = "py312"
select = ["E", "F", "W", "I", "N", "B", "C90"]
ignore = ["E501"]  # 忽略行长度限制

[tool.ruff.format]
quote-style = "double"
indent-style = "space"

[tool.mypy]
python_version = "3.12"
strict = true
warn_return_any = true
warn_unused_configs = true

[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = ["test_*.py", "*_test.py"]
python_classes = ["Test*"]
python_functions = ["test_*"]
addopts = [
    "--strict-markers",
    "--strict-config",
    "--cov=src",
    "--cov-report=term-missing",
    "--cov-report=html"
]
```

### TypeScript配置
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["DOM", "DOM.Iterable", "ES6"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/components/*": ["src/components/*"],
      "@/hooks/*": ["src/hooks/*"],
      "@/services/*": ["src/services/*"],
      "@/types/*": ["src/types/*"]
    }
  },
  "include": [
    "src/**/*"
  ],
  "exclude": [
    "node_modules"
  ]
}
```

### ESLint配置
```json
// .eslintrc.json
{
  "extends": [
    "react-app",
    "react-app/jest"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
    "no-console": "warn",
    "prefer-const": "error"
  },
  "overrides": [
    {
      "files": ["**/*.test.ts", "**/*.test.tsx"],
      "rules": {
        "@typescript-eslint/no-explicit-any": "off"
      }
    }
  ]
}
```

## 🚀 代码质量检查

### 预提交钩子
```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/psf/black
    rev: 23.3.0
    hooks:
      - id: black
        language_version: python3.12

  - repo: https://github.com/charliermarsh/ruff-pre-commit
    rev: v0.0.272
    hooks:
      - id: ruff
        args: [--fix]

  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.3.0
    hooks:
      - id: mypy
        additional_dependencies: [types-all]

  - repo: https://github.com/pre-commit/mirrors-eslint
    rev: v8.39.0
    hooks:
      - id: eslint
        files: \.(js|ts|tsx)$
        types: [file]
```

### CI/CD质量检查
```yaml
# .github/workflows/quality-check.yml
name: Code Quality Check

on: [push, pull_request]

jobs:
  quality-check:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.12'

      - name: Install dependencies
        run: |
          pip install -e .
          pip install black ruff mypy pytest pytest-cov

      - name: Check code formatting
        run: |
          black --check src/ tests/
          ruff check src/

      - name: Type checking
        run: mypy src/

      - name: Run tests
        run: pytest tests/ --cov=src --cov-fail-under=80

      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install frontend dependencies
        working-directory: ./frontend
        run: npm ci

      - name: Check frontend code
        working-directory: ./frontend
        run: |
          npm run lint
          npm run type-check
          npm test -- --coverage --watchAll=false
```

## 📝 提交信息规范

### 提交信息格式
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### 类型说明
- `feat`: 新功能
- `fix`: 修复bug
- `docs`: 文档更新
- `style`: 代码格式化（不影响功能）
- `refactor`: 重构代码
- `test`: 添加或修改测试
- `chore`: 构建过程或辅助工具的变动

### 示例
```
feat(web-surfer): add support for dynamic content loading

- Implement JavaScript execution wait mechanism
- Add timeout handling for page loads
- Update error messages for better debugging

Closes #123
```

## 🔍 代码审查清单

### 后端代码审查
- [ ] 是否有适当的类型注解？
- [ ] 是否正确处理异步操作？
- [ ] 错误处理是否完整？
- [ ] 数据库操作是否使用Repository模式？
- [ ] 是否有相应的单元测试？
- [ ] 是否遵循Python编码规范？

### 前端代码审查
- [ ] 是否使用TypeScript严格模式？
- [ ] 组件是否可复用和可测试？
- [ ] 是否正确处理加载状态和错误状态？
- [ ] 是否有适当的性能优化（useCallback, useMemo）？
- [ ] 是否有相应的组件测试？
- [ ] 是否遵循React最佳实践？

### 通用审查要点
- [ ] 代码是否清晰易读？
- [ ] 是否有适当的注释和文档？
- [ ] 是否遵循安全最佳实践？
- [ ] 是否考虑了可访问性（a11y）？
- [ ] 是否处理了边界情况？
- [ ] 是否有适当的日志记录？

---

**注意**: 这些编码标准是项目的最低要求。所有开发者和AI助手都应该努力超越这些标准，编写高质量、可维护的代码。

**Author**: ssiagu
**Email**: ssiagu@gmail.com
**Document Signature**: ssiagu
**最后更新**: 2025-10-21