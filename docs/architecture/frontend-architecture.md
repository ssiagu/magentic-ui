# Frontend Architecture

### Component Architecture

#### Component Organization
```
src/
├── components/           # 可复用UI组件
│   ├── common/          # 通用组件
│   │   ├── Button/
│   │   ├── Modal/
│   │   └── Loading/
│   ├── layout/          # 布局组件
│   │   ├── Header/
│   │   ├── Sidebar/
│   │   └── Footer/
│   └── features/        # 功能组件
│       ├── Chat/
│       ├── PlanEditor/
│       └── FileManager/
├── pages/               # 页面组件
│   ├── Dashboard/
│   ├── Sessions/
│   ├── Runs/
│   └── Settings/
├── hooks/               # 自定义React Hooks
│   ├── useWebSocket.ts
│   ├── useAuth.ts
│   └── useApi.ts
├── services/            # API客户端服务
│   ├── api.ts
│   ├── websocket.ts
│   └── auth.ts
├── stores/              # 状态管理
│   ├── authStore.ts
│   ├── sessionStore.ts
│   └── runStore.ts
├── types/               # TypeScript类型定义
│   ├── api.ts
│   ├── auth.ts
│   └── models.ts
├── utils/               # 工具函数
│   ├── helpers.ts
│   ├── constants.ts
│   └── validators.ts
└── styles/              # 样式文件
    ├── globals.css
    └── components.css
```

#### Component Template
```typescript
import React, { useState, useEffect } from 'react';
import { Button, Modal } from 'antd';
import { useWebSocket } from '../../hooks/useWebSocket';
import { Message } from '../../types/models';

interface ChatComponentProps {
  sessionId: string;
  onMessageSend?: (message: string) => void;
}

export const ChatComponent: React.FC<ChatComponentProps> = ({
  sessionId,
  onMessageSend
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { sendMessage, lastMessage } = useWebSocket(sessionId);

  useEffect(() => {
    if (lastMessage) {
      setMessages(prev => [...prev, lastMessage]);
    }
  }, [lastMessage]);

  const handleSendMessage = () => {
    if (inputValue.trim()) {
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
    }
  };

  return (
    <div className="chat-component">
      <div className="messages-container">
        {messages.map(message => (
          <div key={message.id} className="message">
            <span className="sender">{message.sender}:</span>
            <span className="content">{message.content}</span>
          </div>
        ))}
      </div>

      <div className="input-container">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="输入消息..."
        />
        <Button
          type="primary"
          onClick={handleSendMessage}
          loading={isLoading}
        >
          发送
        </Button>
      </div>
    </div>
  );
};
```

### State Management Architecture

#### State Structure
```typescript
interface RootState {
  auth: AuthState;
  sessions: SessionState;
  runs: RunState;
  settings: SettingsState;
  ui: UIState;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

interface SessionState {
  currentSession: Session | null;
  sessions: Session[];
  loading: boolean;
  error: string | null;
}

interface RunState {
  currentRun: Run | null;
  runs: Run[];
  messages: Message[];
  files: File[];
  isRunning: boolean;
  loading: boolean;
  error: string | null;
}

interface SettingsState {
  modelClientConfigs: ModelClientConfigs;
  mcpAgentConfigs: McpAgentConfig[];
  loading: boolean;
  error: string | null;
}

interface UIState {
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark';
  notifications: Notification[];
}
```

#### State Management Patterns
- 使用React Context + useReducer进行全局状态管理
- 每个功能模块独立的Context和Reducer
- 使用自定义Hooks封装状态逻辑
- 实现状态持久化到localStorage

### Routing Architecture

#### Route Organization
```
/                           # 首页/仪表板
/dashboard                  # 仪表板页面
/sessions                   # 会话管理
/sessions/new              # 创建新会话
/sessions/:id              # 会话详情
/sessions/:id/edit         # 编辑会话
/runs                      # 运行历史
/runs/:id                  # 运行详情
/runs/:id/edit             # 编辑运行
/settings                  # 系统设置
/settings/models           # 模型配置
/settings/mcp              # MCP配置
/settings/ui               # 界面设置
/gallery                   # 画廊页面
/profile                   # 用户资料
/login                     # 登录页面
/logout                    # 退出登录
```

#### Protected Route Pattern
```typescript
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole = []
}) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole.length > 0 && user && !requiredRole.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};
```

### Frontend Services Layer

#### API Client Setup
```typescript
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
    // 请求拦截器 - 添加认证token
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

    // 响应拦截器 - 处理错误
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

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete(url, config);
    return response.data;
  }
}

export const apiClient = new ApiClient();
```

#### Service Example
```typescript
import { apiClient } from './api';
import { Run, RunCreateRequest, RunUpdateRequest } from '../types/models';

export class RunService {
  async getRuns(params?: {
    limit?: number;
    offset?: number;
    status?: string;
  }): Promise<{ runs: Run[]; total: number }> {
    return apiClient.get('/api/runs', { params });
  }

  async getRun(id: string): Promise<Run> {
    return apiClient.get(`/api/runs/${id}`);
  }

  async createRun(data: RunCreateRequest): Promise<Run> {
    return apiClient.post('/api/runs', data);
  }

  async updateRun(id: string, data: RunUpdateRequest): Promise<Run> {
    return apiClient.put(`/api/runs/${id}`, data);
  }

  async deleteRun(id: string): Promise<void> {
    return apiClient.delete(`/api/runs/${id}`);
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
