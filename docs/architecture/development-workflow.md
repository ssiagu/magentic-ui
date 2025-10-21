# Development Workflow

### Local Development Setup

#### Prerequisites
```bash
# 检查Python版本
python --version  # 应该是3.10+

# 检查Node.js版本
node --version    # 应该是18+

# 检查Docker
docker --version
docker-compose --version

# 检查Git
git --version
```

#### Initial Setup
```bash
# 克隆仓库
git clone https://github.com/microsoft/magentic-ui.git
cd magentic-ui

# 创建Python虚拟环境
python -m venv venv
source venv/bin/activate  # Linux/Mac
# 或 venv\Scripts\activate  # Windows

# 安装后端依赖
pip install -e .

# 安装前端依赖
cd frontend
npm install
cd ..

# 复制环境变量模板
cp .env.example .env

# 设置OpenAI API密钥
echo "OPENAI_API_KEY=your_api_key_here" >> .env

# 构建前端
npm run build

# 启动Docker服务（浏览器容器）
docker-compose up -d

# 初始化数据库
magentic-ui db init
```

#### Development Commands
```bash
# 启动所有服务
magentic-ui start

# 启动前端开发服务器
cd frontend && npm run dev

# 启动后端开发服务器
uvicorn magentic_ui.backend.web.app:app --reload

# 运行测试
pytest tests/                 # 后端测试
cd frontend && npm test       # 前端测试

# 代码格式化
ruff format src/
black src/
cd frontend && npm run format

# 代码检查
ruff check src/
mypy src/
cd frontend && npm run lint
```

### Environment Configuration

#### Required Environment Variables
```bash
# 前端 (.env.local)
REACT_APP_API_URL=http://localhost:8000
REACT_APP_WS_URL=ws://localhost:8000
REACT_APP_ENV=development

# 后端 (.env)
DATABASE_URL=sqlite:///./magentic_ui.db
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# OpenAI配置
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=2000
OPENAI_TEMPERATURE=0.7

# Docker配置
INSIDE_DOCKER=false
BROWSER_HEADLESS=false
PLAYWRIGHT_PORT=-1
NOVNC_PORT=-1

# 日志配置
LOG_LEVEL=INFO
LOG_FILE=./logs/magentic_ui.log

# 共享
NODE_ENV=development
```
