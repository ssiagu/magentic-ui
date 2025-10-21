# External APIs

### OpenAI API

- **Purpose:** 为所有智能体提供大语言模型推理能力
- **Documentation:** https://platform.openai.com/docs/api-reference
- **Base URL(s):** https://api.openai.com/v1
- **Authentication:** API Key (Bearer Token)
- **Rate Limits:** 根据订阅级别，通常为每分钟数千请求

**Key Endpoints Used:**
- `POST /chat/completions` - 生成聊天回复，用于智能体推理
- `POST /completions` - 文本补全，用于代码生成和内容创作
- `GET /models` - 获取可用模型列表，用于模型选择

**Integration Notes:**
- 使用重试机制处理API限流和错误
- 实现请求缓存以减少API调用成本
- 支持流式响应以提供实时用户体验
- 集成Azure OpenAI作为备选方案

### Docker API

- **Purpose:** 管理容器化的浏览器和Python执行环境
- **Documentation:** https://docs.docker.com/engine/api/
- **Base URL(s):** unix:///var/run/docker.sock 或 tcp://localhost:2375
- **Authentication:** Unix socket或TLS证书
- **Rate Limits:** 本地API调用，无硬性限制

**Key Endpoints Used:**
- `POST /containers/create` - 创建新容器
- `POST /containers/{id}/start` - 启动容器
- `POST /containers/{id}/stop` - 停止容器
- `GET /containers/{id}/logs` - 获取容器日志
- `DELETE /containers/{id}` - 删除容器

**Integration Notes:**
- 使用Docker Python SDK简化API调用
- 实现容器生命周期管理，避免资源泄漏
- 监控容器资源使用情况
- 支持容器网络配置和端口映射
