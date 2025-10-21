# Data Models

### Run

**Purpose:** 表示智能体执行的一次运行记录，包含运行状态、配置和结果

**Key Attributes:**
- id: UUID - 唯一标识符
- session_id: UUID - 会话标识符
- user_id: UUID - 用户标识符
- task: string - 任务描述
- status: string - 运行状态 (running, completed, failed)
- created_at: datetime - 创建时间
- updated_at: datetime - 更新时间

#### TypeScript Interface
```typescript
interface Run {
  id: string;
  session_id: string;
  user_id: string;
  task: string;
  status: 'running' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
  config?: RunConfig;
  result?: RunResult;
}
```

#### Relationships
- 一个Run属于一个Session
- 一个Run包含多个Message
- 一个Run可以包含多个File

### Session

**Purpose:** 表示用户的一次会话，包含会话配置和状态

**Key Attributes:**
- id: UUID - 唯一标识符
- user_id: UUID - 用户标识符
- title: string - 会话标题
- created_at: datetime - 创建时间
- updated_at: datetime - 更新时间

#### TypeScript Interface
```typescript
interface Session {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  config?: SessionConfig;
  runs: Run[];
}
```

#### Relationships
- 一个Session属于一个User
- 一个Session包含多个Run

### Team

**Purpose:** 表示智能体团队配置和状态

**Key Attributes:**
- id: UUID - 唯一标识符
- name: string - 团队名称
- config: JSON - 团队配置
- status: string - 团队状态

#### TypeScript Interface
```typescript
interface Team {
  id: string;
  name: string;
  config: TeamConfig;
  status: 'active' | 'inactive' | 'error';
  participants: AgentConfig[];
}
```

#### Relationships
- 一个Team包含多个Agent
- 一个Team可以参与多个Run

### Message

**Purpose:** 表示智能体之间的消息传递

**Key Attributes:**
- id: UUID - 唯一标识符
- run_id: UUID - 运行标识符
- sender: string - 发送者
- content: string - 消息内容
- message_type: string - 消息类型
- timestamp: datetime - 时间戳

#### TypeScript Interface
```typescript
interface Message {
  id: string;
  run_id: string;
  sender: string;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'system';
  timestamp: string;
  metadata?: Record<string, any>;
}
```

#### Relationships
- 一个Message属于一个Run
- 一个Message可以有一个Sender (Agent)

### Settings

**Purpose:** 存储系统和用户配置

**Key Attributes:**
- id: UUID - 唯一标识符
- user_id: UUID - 用户标识符
- key: string - 配置键
- value: JSON - 配置值

#### TypeScript Interface
```typescript
interface Settings {
  id: string;
  user_id: string;
  key: string;
  value: any;
  created_at: string;
  updated_at: string;
}
```

#### Relationships
- 一个Settings属于一个User
