# Unified Project Structure

```text
magentic-ui/
├── .github/                    # CI/CD workflows
│   └── workflows/
│       ├── ci.yaml
│       └── deploy.yaml
├── src/                        # 源代码目录
│   └── magentic_ui/            # 主包
│       ├── __init__.py
│       ├── agents/             # 智能体实现
│       │   ├── __init__.py
│       │   ├── _coder.py
│       │   ├── web_surfer/
│       │   ├── file_surfer/
│       │   ├── mcp/
│       │   └── users/
│       ├── backend/            # 后端服务
│       │   ├── __init__.py
│       │   ├── web/            # FastAPI应用
│       │   │   ├── app.py
│       │   │   ├── routes/
│       │   │   ├── middleware/
│       │   │   ├── deps.py
│       │   │   └── config.py
│       │   ├── teammanager/    # 团队管理器
│       │   ├── datamodel/      # 数据模型
│       │   └── database/       # 数据库操作
│       ├── tools/              # 工具集成
│       │   ├── playwright/
│       │   └── mcp/
│       ├── eval/               # 评估框架
│       └── learning/           # 学习系统
├── frontend/                   # 前端应用
│   ├── src/
│   │   ├── components/         # UI组件
│   │   ├── pages/              # 页面组件
│   │   ├── hooks/              # React Hooks
│   │   ├── services/           # API客户端
│   │   ├── stores/             # 状态管理
│   │   ├── types/              # TypeScript类型
│   │   ├── utils/              # 工具函数
│   │   └── styles/             # 样式文件
│   ├── public/                 # 静态资源
│   ├── tests/                  # 前端测试
│   └── package.json
├── docker/                     # Docker配置
│   ├── browser/
│   ├── python/
│   └── docker-compose.yml
├── scripts/                    # 构建和部署脚本
│   ├── build.sh
│   ├── deploy.sh
│   └── setup-dev.sh
├── docs/                       # 文档
│   ├── prd.md
│   ├── architecture.md
│   └── api/
├── tests/                      # 后端测试
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .env.example                # 环境变量模板
├── pyproject.toml              # Python项目配置
├── docker-compose.yml          # 开发环境编排
└── README.md
```
