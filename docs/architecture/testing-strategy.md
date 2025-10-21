# Testing Strategy

### Testing Pyramid
```
    E2E Tests
    /        \
Integration Tests
/            \
Frontend Unit  Backend Unit
```

### Test Organization

#### Frontend Tests
```
frontend/src/
├── components/
│   ├── __tests__/           # 组件测试
│   │   ├── ChatComponent.test.tsx
│   │   └── PlanEditor.test.tsx
│   └── ...
├── hooks/
│   ├── __tests__/           # Hook测试
│   │   ├── useWebSocket.test.ts
│   │   └── useAuth.test.ts
│   └── ...
├── services/
│   ├── __tests__/           # 服务测试
│   │   ├── api.test.ts
│   │   └── websocket.test.ts
│   └── ...
├── utils/
│   ├── __tests__/           # 工具函数测试
│   │   └── helpers.test.ts
│   └── ...
└── __mocks__/               # Mock文件
    ├── api.ts
    └── websocket.ts
```

#### Backend Tests
```
tests/
├── unit/                    # 单元测试
│   ├── test_agents/
│   │   ├── test_web_surfer.py
│   │   └── test_coder.py
│   ├── test_backend/
│   │   ├── test_teammanager.py
│   │   └── test_routes.py
│   └── test_tools/
│       └── test_playwright.py
├── integration/             # 集成测试
│   ├── test_api_integration.py
│   ├── test_agent_integration.py
│   └── test_database_integration.py
├── e2e/                     # 端到端测试
│   ├── test_full_workflows.py
│   └── test_user_scenarios.py
├── fixtures/                # 测试数据
│   ├── sample_runs.json
│   └── mock_responses.json
└── conftest.py              # pytest配置
```

#### E2E Tests
```
tests/e2e/
├── scenarios/               # 测试场景
│   ├── web_automation.py
│   ├── code_generation.py
│   └── file_operations.py
├── pages/                   # 页面对象模式
│   ├── dashboard_page.py
│   ├── chat_page.py
│   └── settings_page.py
├── utils/                   # 测试工具
│   ├── browser_helpers.py
│   └── test_data_helpers.py
└── conftest.py              # Playwright配置
```

### Test Examples

#### Frontend Component Test
```typescript
// frontend/src/components/__tests__/ChatComponent.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatComponent } from '../ChatComponent';
import { WebSocketProvider } from '../../contexts/WebSocketContext';

// Mock WebSocket
jest.mock('../../hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    sendMessage: jest.fn(),
    lastMessage: null,
    isConnected: true
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

  test('renders chat interface', () => {
    render(
      <WebSocketProvider>
        <ChatComponent {...defaultProps} />
      </WebSocketProvider>
    );

    expect(screen.getByPlaceholderText('输入消息...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '发送' })).toBeInTheDocument();
  });

  test('sends message on form submit', async () => {
    const mockSendMessage = jest.fn();
    jest.doMock('../../hooks/useWebSocket', () => ({
      useWebSocket: () => ({
        sendMessage: mockSendMessage,
        lastMessage: null,
        isConnected: true
      })
    }));

    render(
      <WebSocketProvider>
        <ChatComponent {...defaultProps} />
      </WebSocketProvider>
    );

    const input = screen.getByPlaceholderText('输入消息...');
    const sendButton = screen.getByRole('button', { name: '发送' });

    fireEvent.change(input, { target: { value: 'Hello, World!' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Hello, World!',
          sender: 'user'
        })
      );
    });

    expect(defaultProps.onMessageSend).toHaveBeenCalledWith('Hello, World!');
  });

  test('displays received messages', async () => {
    const mockMessage = {
      id: 'test-message-id',
      content: 'Test response',
      sender: 'assistant',
      timestamp: '2023-01-01T00:00:00Z',
      messageType: 'text'
    };

    jest.doMock('../../hooks/useWebSocket', () => ({
      useWebSocket: () => ({
        sendMessage: jest.fn(),
        lastMessage: mockMessage,
        isConnected: true
      })
    }));

    render(
      <WebSocketProvider>
        <ChatComponent {...defaultProps} />
      </WebSocketProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Test response')).toBeInTheDocument();
      expect(screen.getByText('assistant:')).toBeInTheDocument();
    });
  });
});
```

#### Backend API Test
```python
# tests/unit/test_backend/test_routes.py
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from unittest.mock import Mock, patch

from magentic_ui.backend.web.app import app
from magentic_ui.backend.datamodel.db import User, Run, Session
from magentic_ui.backend.deps import get_current_user

client = TestClient(app)

@pytest.fixture
def mock_user():
    return User(
        id="test-user-id",
        username="testuser",
        email="test@example.com",
        is_active=True
    )

@pytest.fixture
def mock_db():
    return Mock(spec=Session)

@pytest.fixture
def override_auth(mock_user):
    def override_get_current_user():
        return mock_user

    app.dependency_overrides[get_current_user] = override_get_current_user
    yield
    app.dependency_overrides.clear()

class TestRunsAPI:
    def test_get_runs_empty(self, override_auth, mock_db):
        """测试获取空的运行列表"""
        with patch('magentic_ui.backend.web.routes.get_db', return_value=mock_db):
            mock_db.query.return_value.filter.return_value.count.return_value = 0
            mock_db.query.return_value.filter.return_value.offset.return_value.limit.return_value.all.return_value = []

            response = client.get("/api/runs")

            assert response.status_code == 200
            data = response.json()
            assert data["runs"] == []
            assert data["total"] == 0

    def test_get_runs_with_data(self, override_auth, mock_db):
        """测试获取包含数据的运行列表"""
        mock_run = Run(
            id="test-run-id",
            session_id="test-session-id",
            user_id="test-user-id",
            task="Test task",
            status="running"
        )

        with patch('magentic_ui.backend.web.routes.get_db', return_value=mock_db):
            mock_db.query.return_value.filter.return_value.count.return_value = 1
            mock_db.query.return_value.filter.return_value.offset.return_value.limit.return_value.all.return_value = [mock_run]

            response = client.get("/api/runs")

            assert response.status_code == 200
            data = response.json()
            assert len(data["runs"]) == 1
            assert data["runs"][0]["id"] == "test-run-id"
            assert data["total"] == 1

    def test_create_run_success(self, override_auth, mock_db):
        """测试成功创建运行"""
        run_data = {
            "session_id": "test-session-id",
            "task": "Test new task",
            "config": {"model": "gpt-4"}
        }

        with patch('magentic_ui.backend.web.routes.get_db', return_value=mock_db):
            with patch('magentic_ui.backend.web.routes.get_team_manager') as mock_tm:
                mock_tm.return_value.run_stream = Mock()

                response = client.post("/api/runs", json=run_data)

                assert response.status_code == 201
                data = response.json()
                assert data["task"] == "Test new task"
                assert data["status"] == "running"

    def test_get_run_not_found(self, override_auth, mock_db):
        """测试获取不存在的运行"""
        with patch('magentic_ui.backend.web.routes.get_db', return_value=mock_db):
            mock_db.query.return_value.filter.return_value.first.return_value = None

            response = client.get("/api/runs/non-existent-id")

            assert response.status_code == 404
            assert "Run not found" in response.json()["detail"]

    def test_unauthorized_access(self):
        """测试未授权访问"""
        app.dependency_overrides.clear()

        response = client.get("/api/runs")
        assert response.status_code == 401
```

#### E2E Test
```python
# tests/e2e/test_full_workflows.py
import pytest
import asyncio
from playwright.async_api import async_playwright, Page, Browser

class TestWebAutomationWorkflow:
    @pytest.mark.asyncio
    async def test_complete_web_automation_workflow(self):
        """测试完整的Web自动化工作流"""
        async with async_playwright() as p:
            browser = await p.chromium.launch()
            page = await browser.new_page()

            # 1. 导航到应用
            await page.goto("http://localhost:3000")

            # 2. 登录（如果需要）
            await page.fill('[data-testid="username-input"]', "testuser")
            await page.fill('[data-testid="password-input"]', "testpass")
            await page.click('[data-testid="login-button"]')

            # 3. 创建新会话
            await page.click('[data-testid="new-session-button"]')
            await page.fill('[data-testid="session-title"]', "Test Web Automation")
            await page.click('[data-testid="create-session-button"]')

            # 4. 启动Web自动化任务
            await page.fill('[data-testid="task-input"]', "访问 https://example.com 并获取页面标题")
            await page.click('[data-testid="start-task-button"]')

            # 5. 等待任务完成
            await page.wait_for_selector('[data-testid="task-completed"]', timeout=60000)

            # 6. 验证结果
            messages = await page.query_selector_all('[data-testid="message"]')
            assert len(messages) > 0

            # 检查是否包含页面标题
            page_content = await page.content()
            assert "Example Domain" in page_content or "example.com" in page_content

            await browser.close()

    @pytest.mark.asyncio
    async def test_code_generation_and_execution(self):
        """测试代码生成和执行工作流"""
        async with async_playwright() as p:
            browser = await p.chromium.launch()
            page = await browser.new_page()

            await page.goto("http://localhost:3000")

            # 创建代码生成任务
            await page.fill('[data-testid="task-input"]', "生成一个Python函数来计算斐波那契数列")
            await page.click('[data-testid="start-task-button"]')

            # 等待代码生成
            await page.wait_for_selector('[data-testid="code-block"]', timeout=60000)

            # 验证生成的代码
            code_element = await page.query_selector('[data-testid="code-block"]')
            code_content = await code_element.inner_text()
            assert "def fibonacci" in code_content or "def fib" in code_content
            assert "return" in code_content

            # 检查执行结果
            await page.wait_for_selector('[data-testid="execution-result"]', timeout=30000)
            result_element = await page.query_selector('[data-testid="execution-result"]')
            result_content = await result_element.inner_text()

            # 验证计算结果
            assert "0" in result_content or "1" in result_content or "55" in result_content

            await browser.close()

    @pytest.mark.asyncio
    async def test_multi_agent_collaboration(self):
        """测试多智能体协作"""
        async with async_playwright() as p:
            browser = await p.chromium.launch()
            page = await browser.new_page()

            await page.goto("http://localhost:3000")

            # 创建复杂任务，需要多个智能体协作
            complex_task = """
            访问 https://news.ycombinator.com，获取前3个热门新闻标题，
            然后为每个标题生成一个简短的摘要，
            最后将结果保存到文件中。
            """

            await page.fill('[data-testid="task-input"]', complex_task)
            await page.click('[data-testid="start-task-button"]')

            # 监控智能体协作过程
            agent_messages = {}

            for _ in range(10):  # 最多等待10次
                await page.wait_for_timeout(5000)  # 等待5秒

                # 获取所有消息
                messages = await page.query_selector_all('[data-testid="message"]')
                for message in messages:
                    sender = await message.get_attribute('data-sender')
                    content = await message.inner_text()

                    if sender and sender not in agent_messages:
                        agent_messages[sender] = []
                    if sender:
                        agent_messages[sender].append(content)

                # 检查是否包含多个智能体的消息
                if len(agent_messages) >= 2:  # 至少需要2个智能体协作
                    break

            # 验证多智能体参与
            assert len(agent_messages) >= 2, f"Expected at least 2 agents, got {len(agent_messages)}"

            # 验证关键智能体参与
            expected_agents = ["web_surfer", "coder", "file_surfer"]
            participating_agents = list(agent_messages.keys())

            has_web_surfer = any("web" in agent.lower() for agent in participating_agents)
            has_file_agent = any("file" in agent.lower() for agent in participating_agents)

            assert has_web_surfer, "WebSurfer agent should participate"
            assert has_file_agent, "FileSurfer agent should participate"

            # 检查任务完成
            await page.wait_for_selector('[data-testid="task-completed"]', timeout=120000)

            # 验证文件生成
            files = await page.query_selector_all('[data-testid="generated-file"]')
            assert len(files) > 0, "Should generate at least one file"

            await browser.close()
```
