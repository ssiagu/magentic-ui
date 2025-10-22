# Magentic-UI 开发指南

**Author**: ssiagu
**Email**: ssiagu@gmail.com
**Document Signature**: ssiagu
**最后更新**: 2025-10-21

## 📋 目录

1. [项目概览](#项目概览)
2. [开发环境设置](#开发环境设置)
3. [项目结构详解](#项目结构详解)
4. [开发工作流程](#开发工作流程)
5. [前端开发指南](#前端开发指南)
6. [后端开发指南](#后端开发指南)
7. [测试策略](#测试策略)
8. [版本发布流程](#版本发布流程)
9. [部署配置](#部署配置)
10. [故障排除](#故障排除)

## 🏗️ 项目概览

### 技术栈

**前端技术栈**:
- React 18.2+ + TypeScript 5.3+
- Gatsby 5.14+ (静态站点生成)
- Ant Design 5.22+ (UI组件库)
- Tailwind CSS 3.4+ (样式框架)
- React Flow 12.3+ (流程图编辑器)
- Monaco Editor 4.6+ (代码编辑器)

**后端技术栈**:
- Python 3.10+ (主要编程语言)
- FastAPI 0.104+ (Web框架)
- SQLModel + PostgreSQL (数据层)
- AutoGen 0.5.7 (多智能体框架)
- Playwright 1.51+ (浏览器自动化)
- Docker (容器化部署)

**开发工具**:
- npm/yarn (前端包管理)
- Poetry/uv (Python包管理)
- pytest (后端测试)
- Jest (前端测试)
- Docker Compose (容器编排)

### 核心架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   前端界面      │    │   API网关       │    │   智能体层      │
│   React/Gatsby  │◄──►│   FastAPI       │◄──►│   AutoGen       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   数据存储      │    │   工具集成      │
                       │   PostgreSQL    │    │   Playwright    │
                       └─────────────────┘    └─────────────────┘
```

## 🛠️ 开发环境设置

### 系统要求

- **操作系统**: Windows 10+ (推荐使用WSL2), macOS, Linux
- **Python**: 3.10 或更高版本
- **Node.js**: 18.0 或更高版本
- **Docker**: 20.10+ 和 Docker Compose 2.0+
- **Git**: 2.30+

### 初始化开发环境

#### 1. 克隆项目

```bash
git clone https://github.com/microsoft/magentic-ui.git
cd magentic-ui
```

#### 2. 设置Python环境

```bash
# 创建虚拟环境
python3 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# 安装项目依赖（开发模式）
pip install -e .

# 或使用uv (推荐的现代Python包管理器)
uv pip install -e .

# 构建后端
uv build  # 构建后端
```

#### 3. 设置前端环境

```bash
cd frontend

# 安装依赖
npm install
# 或使用yarn
yarn install

cd ..
```

#### 4. 环境变量配置

创建环境变量文件：

```bash
# 开发环境
cp .env.example .env.development

# 生产环境
cp .env.example .env.production
```

必要的环境变量：

```env
# OpenAI API配置
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_BASE_URL=https://api.openai.com/v1

# 数据库配置
DATABASE_URL=postgresql://user:password@localhost:5432/magentic_ui

# 前端配置
PREFIX_PATH_VALUE=
NODE_ENV=development

# 智谱AI配置（可选）
ZHIPUAI_API_KEY=your-zhipuai-api-key-here
ZHIPUAI_BASE_URL=https://open.bigmodel.cn/api/paas/v4
```

#### 5. 数据库设置

```bash
# 启动PostgreSQL（如果使用Docker）
docker run --name magentic-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=magentic_ui \
  -p 5432:5432 \
  -d postgres:15

# 运行数据库迁移
alembic upgrade head
```

## 📁 项目结构详解

```
magentic-ui/
├── frontend/                    # 前端应用
│   ├── src/
│   │   ├── components/         # React组件
│   │   │   ├── features/      # 功能组件
│   │   │   ├── settings/      # 设置组件
│   │   │   └── views/         # 页面视图
│   │   ├── pages/             # Gatsby页面
│   │   ├── styles/            # 样式文件
│   │   └── types/             # TypeScript类型定义
│   ├── package.json           # 前端依赖配置
│   └── gatsby-config.ts       # Gatsby配置
├── src/
│   └── magentic_ui/           # 后端源码
│       ├── agents/            # 智能体实现
│       ├── backend/           # Web后端
│       │   ├── datamodel/     # 数据模型
│       │   ├── web/           # Web API
│       │   └── cli.py         # 命令行接口
│       ├── providers/         # AI模型提供商
│       └── tools/             # 工具集成
├── docker/                    # Docker配置
│   ├── magentic-ui-browser-docker/  # 浏览器容器
│   └── magentic-ui-python-env/      # Python环境容器
├── docs/                      # 文档
│   ├── architecture/          # 架构文档
│   ├── prd/                   # 产品需求文档
│   └── qa/                    # 质量保证文档
├── tests/                     # 测试文件
├── samples/                   # 示例代码
├── pyproject.toml            # Python项目配置
└── README.md                 # 项目说明
```

## 🔄 开发工作流程

### 日常开发流程

#### 1. 创建功能分支

```bash
# 从main分支创建新功能分支
git checkout main
git pull origin main
git checkout -b feature/your-feature-name

# 或使用fix前缀修复bug
git checkout -b fix/issue-description
```

#### 2. 启动开发服务器

**启动后端开发服务器**:

```bash
# 方式1: 使用CLI命令
magentic-ui --port 8081 --reload

# 方式2: 直接运行Python模块
python -m magentic_ui.backend.web.app --port 8081 --reload

# 方式3: 使用uvicorn
uvicorn magentic_ui.backend.web.app:app --host 0.0.0.0 --port 8081 --reload
```

**启动前端开发服务器**:

```bash
cd frontend

# 启动开发服务器
npm run develop
# 或
yarn develop

# 服务器将在 http://localhost:8000 启动
```

#### 3. 开发过程中的最佳实践

**代码质量检查**:

```bash
# Python代码格式化和检查
poe fmt      # 格式化代码
poe lint     # 代码检查
poe mypy     # 类型检查
poe pyright  # 静态类型检查

# 前端类型检查
cd frontend
npm run typecheck
```

**运行测试**:

```bash
# 后端测试
poe test

# 前端测试
cd frontend
npm test  # 如果配置了测试
```

#### 4. 提交代码

```bash
# 添加修改的文件
git add .

# 提交代码（使用约定式提交）
git commit -m "feat: add new feature description"

# 推送到远程仓库
git push origin feature/your-feature-name
```

### 代码提交规范

使用[约定式提交](https://www.conventionalcommits.org/zh-hans/)格式：

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**类型说明**:
- `feat`: 新功能
- `fix`: 修复bug
- `docs`: 文档更新
- `style`: 代码格式化（不影响功能）
- `refactor`: 重构代码
- `test`: 添加或修改测试
- `chore`: 构建过程或辅助工具的变动

**示例**:
```bash
git commit -m "feat(agent): add zhipuai model support"
git commit -m "fix(frontend): resolve model selector display issue"
git commit -m "docs: update api documentation"
```

## 🎨 前端开发指南

### 组件开发规范

#### 1. 组件结构

```typescript
// src/components/features/ExampleComponent/ExampleComponent.tsx
import React from 'react';
import { Button } from 'antd';
import styles from './ExampleComponent.module.css';

interface ExampleComponentProps {
  title: string;
  onSubmit: () => void;
}

export const ExampleComponent: React.FC<ExampleComponentProps> = ({
  title,
  onSubmit
}) => {
  return (
    <div className={styles.container}>
      <h3>{title}</h3>
      <Button type="primary" onClick={onSubmit}>
        提交
      </Button>
    </div>
  );
};

export default ExampleComponent;
```

#### 2. 样式管理

优先使用Tailwind CSS，复杂组件使用CSS Modules：

```typescript
// Tailwind CSS示例
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow">
  <h2 className="text-lg font-semibold text-gray-900">标题</h2>
  <Button type="primary" className="ml-4">
    操作
  </Button>
</div>

// CSS Modules示例
import styles from './Component.module.css';

<div className={styles.container}>
  <h2 className={styles.title}>标题</h2>
</div>
```

#### 3. 状态管理

使用React Context + Hooks进行状态管理：

```typescript
// 创建Context
const AppContext = React.createContext<{
  user: User | null;
  setUser: (user: User | null) => void;
}>({
  user: null,
  setUser: () => {}
});

// Provider组件
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  return (
    <AppContext.Provider value={{ user, setUser }}>
      {children}
    </AppContext.Provider>
  );
};

// 使用Context
const { user, setUser } = useContext(AppContext);
```

### 构建和部署

#### 开发构建

```bash
cd frontend

# 清理并启动开发服务器
npm run develop

# 仅类型检查
npm run typecheck
```

#### 生产构建

```bash
cd frontend

# 生产构建（构建到后端UI目录）
npm run build

# 本地预览构建结果
npm run serve
```

构建过程会将前端资源自动复制到后端的 `src/magentic_ui/backend/web/ui/` 目录。

## 🐍 后端开发指南

### API开发规范

#### 1. FastAPI路由定义

```python
# src/magentic_ui/backend/web/routes/example.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ...datamodel.db import get_db
from .schemas import ExampleCreate, ExampleResponse

router = APIRouter(prefix="/examples", tags=["examples"])

@router.post("/", response_model=ExampleResponse)
async def create_example(
    example: ExampleCreate,
    db: Session = Depends(get_db)
):
    """创建新示例"""
    try:
        db_example = ExampleModel(**example.dict())
        db.add(db_example)
        db.commit()
        db.refresh(db_example)
        return db_example
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/", response_model=List[ExampleResponse])
async def list_examples(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """获取示例列表"""
    examples = db.query(ExampleModel).offset(skip).limit(limit).all()
    return examples
```

#### 2. 数据模型定义

```python
# src/magentic_ui/backend/datamodel/example.py
from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.sql import func
from .base import BaseModel

class ExampleModel(BaseModel):
    __tablename__ = "examples"

    title = Column(String(255), nullable=False)
    description = Column(Text)
    status = Column(String(50), default="active")

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
```

#### 3. Pydantic模式

```python
# src/magentic_ui/backend/web/schemas/example.py
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class ExampleBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: str = "active"

class ExampleCreate(ExampleBase):
    pass

class ExampleUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None

class ExampleResponse(ExampleBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
```

### 智能体开发

#### 1. 创建新智能体

```python
# src/magentic_ui/agents/example_agent.py
from autogen_agentchat.agents import Assistant
from autogen_core import CancellationToken
from autogen_ext.models.openai import OpenAIChatCompletionClient

class ExampleAgent(Assistant):
    """示例智能体"""

    def __init__(self, model_client: OpenAIChatCompletionClient):
        super().__init__(
            name="example_agent",
            system_message="你是一个专业的示例处理智能体。",
            model_client=model_client,
            tools=[self.process_example]
        )

    async def process_example(self, input_data: str) -> str:
        """处理示例数据"""
        # 实现具体的处理逻辑
        return f"处理完成: {input_data}"
```

#### 2. 注册智能体

```python
# src/magentic_ui/backend/agent_manager.py
from ..agents.example_agent import ExampleAgent

class AgentManager:
    def __init__(self):
        self.agents = {}
        self._register_agents()

    def _register_agents(self):
        """注册所有智能体"""
        self.agents["example"] = ExampleAgent

    def get_agent(self, agent_name: str):
        """获取指定智能体"""
        return self.agents.get(agent_name)
```

### 配置管理

使用Pydantic Settings进行配置管理：

```python
# src/magentic_ui/backend/config.py
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # API配置
    api_host: str = "0.0.0.0"
    api_port: int = 8081
    debug: bool = False

    # OpenAI配置
    openai_api_key: str
    openai_base_url: str = "https://api.openai.com/v1"
    openai_model: str = "gpt-4o"

    # 智谱AI配置
    zhipuai_api_key: Optional[str] = None
    zhipuai_base_url: str = "https://open.bigmodel.cn/api/paas/v4"

    # 数据库配置
    database_url: str

    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()
```

## 🧪 测试策略

### 后端测试

#### 1. 单元测试

```python
# tests/test_example.py
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from magentic_ui.backend.web.app import app
from magentic_ui.backend.datamodel.db import get_db, Base
from magentic_ui.backend.datamodel.example import ExampleModel

client = TestClient(app)

@pytest.fixture
def db_session():
    """测试数据库会话"""
    # 创建测试数据库
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

def test_create_example(db_session: Session):
    """测试创建示例"""
    response = client.post(
        "/examples/",
        json={"title": "测试示例", "description": "这是一个测试"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "测试示例"

def test_list_examples(db_session: Session):
    """测试获取示例列表"""
    # 先创建一个示例
    response = client.post(
        "/examples/",
        json={"title": "测试示例"}
    )
    assert response.status_code == 200

    # 获取列表
    response = client.get("/examples/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0
```

#### 2. 集成测试

```python
# tests/integration/test_agent_integration.py
import pytest
from magentic_ui.agents.example_agent import ExampleAgent
from autogen_ext.models.openai import OpenAIChatCompletionClient

@pytest.mark.asyncio
async def test_example_agent_integration():
    """测试智能体集成"""
    model_client = OpenAIChatCompletionClient(
        model="gpt-4o-mini",
        api_key="test-key"
    )

    agent = ExampleAgent(model_client)
    result = await agent.process_example("测试数据")

    assert "处理完成" in result
```

### 前端测试

使用Jest和React Testing Library：

```typescript
// frontend/src/components/__tests__/ExampleComponent.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExampleComponent } from '../features/ExampleComponent/ExampleComponent';

describe('ExampleComponent', () => {
  it('renders title correctly', () => {
    const mockOnSubmit = jest.fn();
    render(
      <ExampleComponent
        title="测试标题"
        onSubmit={mockOnSubmit}
      />
    );

    expect(screen.getByText('测试标题')).toBeInTheDocument();
  });

  it('calls onSubmit when button is clicked', () => {
    const mockOnSubmit = jest.fn();
    render(
      <ExampleComponent
        title="测试标题"
        onSubmit={mockOnSubmit}
      />
    );

    const button = screen.getByText('提交');
    fireEvent.click(button);

    expect(mockOnSubmit).toHaveBeenCalledTimes(1);
  });
});
```

### 运行测试

```bash
# 后端测试
poe test                    # 运行所有测试
pytest tests/unit/         # 运行单元测试
pytest tests/integration/  # 运行集成测试

# 前端测试
cd frontend
npm test                   # 运行测试
npm run test:coverage     # 生成覆盖率报告
```

## 🚀 版本发布流程

### 版本管理策略

使用语义化版本控制 (Semantic Versioning)：
- **主版本号 (MAJOR)**: 不兼容的API修改
- **次版本号 (MINOR)**: 向下兼容的功能性新增
- **修订号 (PATCH)**: 向下兼容的问题修正

### 发布前检查清单

#### 1. 代码质量检查

```bash
# Python代码质量检查
poe check  # 运行所有检查（格式化、lint、类型检查、测试）

# 前端代码质量检查
cd frontend
npm run typecheck
npm run build  # 确保构建成功
```

#### 2. 版本号更新

**更新Python版本**:
```python
# src/magentic_ui/version.py
__version__ = "1.2.3"
```

**更新前端版本**:
```json
// frontend/package.json
{
  "version": "1.2.3"
}
```

#### 3. 更新CHANGELOG

```markdown
# CHANGELOG.md

## [1.2.3] - 2025-10-21

### Added
- 新增智谱AI模型支持
- 添加文件上传功能

### Fixed
- 修复模型选择器显示问题
- 解决WebSocket连接稳定性问题

### Changed
- 优化前端构建性能
- 更新依赖项版本
```

### 发布步骤

#### 1. 创建发布分支

```bash
git checkout main
git pull origin main
git checkout -b release/v1.2.3
```

#### 2. 最终测试

```bash
# 完整的端到端测试
docker-compose -f docker-compose.test.yml up --abort-on-container-exit
```

#### 3. 合并到main并打标签

```bash
# 合并到main分支
git checkout main
git merge release/v1.2.3

# 创建标签
git tag -a v1.2.3 -m "Release version 1.2.3"

# 推送到远程仓库
git push origin main
git push origin v1.2.3

# 删除发布分支
git branch -d release/v1.2.3
```

#### 4. 自动化部署

项目配置了GitHub Actions自动化部署：

- **Docker镜像构建**: 推送到GitHub Container Registry
- **文档部署**: 自动部署到GitHub Pages
- **PyPI包发布**: 自动发布到Python包索引

### 紧急发布流程

对于需要快速修复的紧急问题：

```bash
# 从main分支创建hotfix分支
git checkout main
git pull origin main
git checkout -b hotfix/fix-critical-issue

# 修复问题
# ... 修改代码 ...

# 测试修复
poe test

# 直接合并到main并打标签
git checkout main
git merge hotfix/fix-critical-issue
git tag -a v1.2.4 -m "Hotfix: critical security fix"

git push origin main
git push origin v1.2.4

# 同时合并到develop分支（如果存在）
git checkout develop
git merge hotfix/fix-critical-issue
git push origin develop

git branch -d hotfix/fix-critical-issue
```

## 🐳 部署配置

### Docker容器化

项目使用Docker进行容器化部署，包含两个主要容器：

#### 1. 浏览器容器

```dockerfile
# docker/magentic-ui-browser-docker/Dockerfile
FROM ubuntu:22.04

# 安装依赖和浏览器
RUN apt-get update && apt-get install -y \
    firefox \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

# 复制应用代码
COPY . /app
WORKDIR /app

# 启动脚本
CMD ["./start.sh"]
```

#### 2. Python环境容器

```dockerfile
# docker/magentic-ui-python-env/Dockerfile
FROM python:3.12-slim

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# 安装Python依赖
COPY requirements.txt .
RUN pip install -r requirements.txt

# 复制应用代码
COPY . /app
WORKDIR /app

# 启动命令
CMD ["python", "-m", "magentic_ui.backend.web.app"]
```

### 本地部署

#### 开发环境部署

```bash
# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

#### 生产环境部署

```bash
# 使用生产配置
docker-compose -f docker-compose.prod.yml up -d

# 或使用环境变量
export NODE_ENV=production
export DATABASE_URL=postgresql://prod_user:password@db:5432/magentic_ui_prod
docker-compose up -d
```

### 云端部署

#### GitHub Container Registry

项目配置了自动构建和推送Docker镜像到GHCR：

```yaml
# .github/workflows/docker-build-push.yml
name: Build and Push Docker Images

on:
  workflow_dispatch:
    inputs:
      push_image:
        description: 'Push image to registry'
        required: false
        default: true
        type: boolean

env:
  REGISTRY: ghcr.io

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    # ... 构建和推送逻辑
```

使用镜像：

```bash
# 拉取镜像
docker pull ghcr.io/microsoft/magentic-ui-browser:latest
docker pull ghcr.io/microsoft/magentic-ui-python-env:latest

# 在docker-compose.yml中使用
services:
  browser:
    image: ghcr.io/microsoft/magentic-ui-browser:latest
  python:
    image: ghcr.io/microsoft/magentic-ui-python-env:latest
```

## 🔧 故障排除

### 常见问题及解决方案

#### 1. 前端构建失败

**问题**: `npm run build` 失败
```bash
Error: Build failed with errors
```

**解决方案**:
```bash
# 清理缓存
cd frontend
gatsby clean
rm -rf node_modules package-lock.json
npm install

# 检查TypeScript错误
npm run typecheck

# 重新构建
npm run build
```

#### 2. 后端启动失败

**问题**: FastAPI服务无法启动
```bash
Error: Database connection failed
```

**解决方案**:
```bash
# 检查数据库配置
echo $DATABASE_URL

# 确保数据库运行
docker ps | grep postgres

# 运行数据库迁移
alembic upgrade head

# 检查端口占用
netstat -tulpn | grep 8081
```

#### 3. Docker容器问题

**问题**: 容器无法启动或连接失败

**解决方案**:
```bash
# 查看容器日志
docker-compose logs browser
docker-compose logs python

# 重建容器
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# 检查网络连接
docker network ls
docker network inspect magentic-ui_default
```

#### 4. 智能体连接问题

**问题**: OpenAI API调用失败

**解决方案**:
```bash
# 检查API密钥
echo $OPENAI_API_KEY

# 测试API连接
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
     https://api.openai.com/v1/models

# 检查网络代理设置
env | grep -i proxy
```

### 性能优化建议

#### 1. 前端优化

```typescript
// 使用React.memo优化组件渲染
export const OptimizedComponent = React.memo(({ data }) => {
  return <div>{data}</div>;
});

// 使用useMemo优化计算
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);

// 使用useCallback优化函数引用
const handleClick = useCallback((id) => {
  onItemClick(id);
}, [onItemClick]);
```

#### 2. 后端优化

```python
# 使用数据库连接池
from sqlalchemy import create_engine
from sqlalchemy.pool import QueuePool

engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True
)

# 使用异步操作
from fastapi import FastAPI
from concurrent.futures import ThreadPoolExecutor

app = FastAPI()
executor = ThreadPoolExecutor(max_workers=4)

@app.post("/process")
async def process_data(data: ProcessData):
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(executor, process_sync, data)
    return result
```

### 监控和日志

#### 1. 应用日志

```python
# 配置结构化日志
from loguru import logger
import sys

# 移除默认处理器
logger.remove()

# 添加控制台输出
logger.add(
    sys.stdout,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
    level="INFO"
)

# 添加文件输出
logger.add(
    "logs/magentic-ui.log",
    rotation="10 MB",
    retention="30 days",
    level="DEBUG"
)
```

#### 2. 性能监控

```python
# 添加性能监控中间件
from fastapi import Request
import time

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    logger.info(f"Request: {request.url.path} - Time: {process_time:.4f}s")
    return response
```

## 📚 相关资源

- [项目架构文档](./architecture.md)
- [API规范文档](./architecture/api-specification.md)
- [前端架构文档](./architecture/frontend-architecture.md)
- [后端架构文档](./architecture/backend-architecture.md)
- [部署架构文档](./architecture/deployment-architecture.md)
- [官方文档](https://github.com/microsoft/magentic-ui)
- [AutoGen框架文档](https://microsoft.github.io/autogen/)
- [FastAPI文档](https://fastapi.tiangolo.com/)
- [React文档](https://react.dev/)
- [Gatsby文档](https://www.gatsbyjs.com/docs/)

---

**注意**: 本开发指南会随着项目发展持续更新。如有疑问或建议，请联系项目维护者。

**Author**: ssiagu
**Email**: ssiagu@gmail.com
**Document Signature**: ssiagu