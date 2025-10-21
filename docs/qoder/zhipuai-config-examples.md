# 智谱AI配置示例集

**项目**: Magentic-UI 智谱AI模型支持  
**文档版本**: v1.0  
**创建日期**: 2025-10-21  
**作者**: ssiagu  

本文档提供各种场景下的智谱AI配置示例,可直接复制使用。

---

## 目录

1. [基础配置](#基础配置)
2. [进阶配置](#进阶配置)
3. [场景配置](#场景配置)
4. [性能优化配置](#性能优化配置)
5. [故障排查配置](#故障排查配置)

---

## 基础配置

### 1. 最简配置

**使用场景**: 快速开始,使用默认配置

```yaml
# config-simple.yaml
model_client_configs:
  orchestrator:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4.6
      base_url: https://open.bigmodel.cn/api/paas/v4/
      api_key: ${ZHIPUAI_API_KEY}
```

**环境变量**:
```bash
export ZHIPUAI_API_KEY=your-api-key
```

**启动命令**:
```bash
magentic-ui --port 8081 --config config-simple.yaml
```

---

### 2. 完整配置

**使用场景**: 所有智能体使用智谱AI

```yaml
# config-full.yaml
# 定义共享配置
zhipuai_base: &zhipuai_base
  provider: OpenAIChatCompletionClient
  config:
    base_url: https://open.bigmodel.cn/api/paas/v4/
    api_key: ${ZHIPUAI_API_KEY}
    max_retries: 10

model_client_configs:
  orchestrator:
    <<: *zhipuai_base
    config:
      <<: *zhipuai_base.config
      model: glm-4.6
      temperature: 0.7
      max_tokens: 6000
  
  web_surfer:
    <<: *zhipuai_base
    config:
      <<: *zhipuai_base.config
      model: glm-4.6
      temperature: 0.5
      max_tokens: 6000
  
  coder:
    <<: *zhipuai_base
    config:
      <<: *zhipuai_base.config
      model: glm-4.6
      temperature: 0.3
      max_tokens: 8000
  
  file_surfer:
    <<: *zhipuai_base
    config:
      <<: *zhipuai_base.config
      model: glm-4.5-air
      temperature: 0.5
      max_tokens: 4000
  
  action_guard:
    <<: *zhipuai_base
    config:
      <<: *zhipuai_base.config
      model: glm-4-flash
      temperature: 0.1
      max_tokens: 2000

# 其他配置
cooperative_planning: true
autonomous_execution: false
max_actions_per_step: 5
max_turns: 20
```

---

### 3. 混合配置

**使用场景**: 同时使用OpenAI和智谱AI

```yaml
# config-hybrid.yaml
model_client_configs:
  # Orchestrator: OpenAI GPT-4o
  orchestrator:
    provider: OpenAIChatCompletionClient
    config:
      model: gpt-4o-2024-08-06
      api_key: ${OPENAI_API_KEY}
      max_retries: 5
  
  # Web Surfer: 智谱AI glm-4.6 (中文网页处理优势)
  web_surfer:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4.6
      base_url: https://open.bigmodel.cn/api/paas/v4/
      api_key: ${ZHIPUAI_API_KEY}
      max_retries: 10
  
  # Coder: 智谱AI glm-4.6 (代码生成)
  coder:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4.6
      base_url: https://open.bigmodel.cn/api/paas/v4/
      api_key: ${ZHIPUAI_API_KEY}
      temperature: 0.3
      max_retries: 10
  
  # File Surfer: 智谱AI glm-4-flash (快速文件操作)
  file_surfer:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4-flash
      base_url: https://open.bigmodel.cn/api/paas/v4/
      api_key: ${ZHIPUAI_API_KEY}
      max_retries: 10
  
  # Action Guard: OpenAI nano (快速安全检查)
  action_guard:
    provider: OpenAIChatCompletionClient
    config:
      model: gpt-4.1-nano-2025-04-14
      api_key: ${OPENAI_API_KEY}
      max_retries: 5
```

**环境变量**:
```bash
export ZHIPUAI_API_KEY=your-zhipuai-key
export OPENAI_API_KEY=your-openai-key
```

---

## 进阶配置

### 4. 高性能配置

**使用场景**: 追求最佳性能,不计成本

```yaml
# config-performance.yaml
model_client_configs:
  orchestrator:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4.6
      base_url: https://open.bigmodel.cn/api/paas/v4/
      api_key: ${ZHIPUAI_API_KEY}
      temperature: 0.7
      max_tokens: 8000
      max_retries: 10
      top_p: 0.95
  
  web_surfer:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4.6
      base_url: https://open.bigmodel.cn/api/paas/v4/
      api_key: ${ZHIPUAI_API_KEY}
      temperature: 0.5
      max_tokens: 8000
      max_retries: 10
  
  coder:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4.6
      base_url: https://open.bigmodel.cn/api/paas/v4/
      api_key: ${ZHIPUAI_API_KEY}
      temperature: 0.2
      max_tokens: 12000
      max_retries: 10
      top_p: 0.9
  
  file_surfer:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4.6
      base_url: https://open.bigmodel.cn/api/paas/v4/
      api_key: ${ZHIPUAI_API_KEY}
      temperature: 0.4
      max_tokens: 6000
      max_retries: 10
  
  action_guard:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4.5-air
      base_url: https://open.bigmodel.cn/api/paas/v4/
      api_key: ${ZHIPUAI_API_KEY}
      temperature: 0.1
      max_tokens: 3000
      max_retries: 5

# 性能优化配置
max_actions_per_step: 10
max_turns: 30
multiple_tools_per_call: true
```

---

### 5. 成本优化配置

**使用场景**: 控制成本,保证基本性能

```yaml
# config-cost-optimized.yaml
model_client_configs:
  orchestrator:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4.5-air
      base_url: https://open.bigmodel.cn/api/paas/v4/
      api_key: ${ZHIPUAI_API_KEY}
      temperature: 0.7
      max_tokens: 4000
      max_retries: 8
  
  web_surfer:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4.5-air
      base_url: https://open.bigmodel.cn/api/paas/v4/
      api_key: ${ZHIPUAI_API_KEY}
      temperature: 0.5
      max_tokens: 4000
      max_retries: 8
  
  coder:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4.6  # 代码质量重要,保持高性能模型
      base_url: https://open.bigmodel.cn/api/paas/v4/
      api_key: ${ZHIPUAI_API_KEY}
      temperature: 0.3
      max_tokens: 6000
      max_retries: 8
  
  file_surfer:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4-flash
      base_url: https://open.bigmodel.cn/api/paas/v4/
      api_key: ${ZHIPUAI_API_KEY}
      temperature: 0.5
      max_tokens: 2000
      max_retries: 5
  
  action_guard:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4-flash
      base_url: https://open.bigmodel.cn/api/paas/v4/
      api_key: ${ZHIPUAI_API_KEY}
      temperature: 0.1
      max_tokens: 1000
      max_retries: 5

# 成本控制配置
max_actions_per_step: 3
max_turns: 15
multiple_tools_per_call: false
```

**预计成本节省**: 60-70% vs 全glm-4.6配置

---

### 6. 视觉任务配置

**使用场景**: 需要处理图像分析的任务

```yaml
# config-vision.yaml
model_client_configs:
  orchestrator:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4.6
      base_url: https://open.bigmodel.cn/api/paas/v4/
      api_key: ${ZHIPUAI_API_KEY}
      temperature: 0.7
      max_tokens: 6000
  
  web_surfer:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4.5v  # 视觉模型,支持图像理解
      base_url: https://open.bigmodel.cn/api/paas/v4/
      api_key: ${ZHIPUAI_API_KEY}
      temperature: 0.5
      max_tokens: 6000
      max_retries: 10
  
  coder:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4.6
      base_url: https://open.bigmodel.cn/api/paas/v4/
      api_key: ${ZHIPUAI_API_KEY}
      temperature: 0.3
      max_tokens: 8000
  
  file_surfer:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4.5-air
      base_url: https://open.bigmodel.cn/api/paas/v4/
      api_key: ${ZHIPUAI_API_KEY}
      max_retries: 10
  
  action_guard:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4-flash
      base_url: https://open.bigmodel.cn/api/paas/v4/
      api_key: ${ZHIPUAI_API_KEY}
      temperature: 0.1
      max_retries: 5
```

---

## 场景配置

### 7. 中文内容处理

**使用场景**: 主要处理中文网页、中文文档

```yaml
# config-chinese.yaml
model_client_configs:
  orchestrator:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4.6
      base_url: https://open.bigmodel.cn/api/paas/v4/
      api_key: ${ZHIPUAI_API_KEY}
      temperature: 0.7
      max_tokens: 6000
  
  web_surfer:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4.6
      base_url: https://open.bigmodel.cn/api/paas/v4/
      api_key: ${ZHIPUAI_API_KEY}
      temperature: 0.5
      max_tokens: 6000
      # 中文优化参数
      top_p: 0.9
      frequency_penalty: 0.1
  
  coder:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4.6
      base_url: https://open.bigmodel.cn/api/paas/v4/
      api_key: ${ZHIPUAI_API_KEY}
      temperature: 0.3
      max_tokens: 8000
  
  file_surfer:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4.5-air
      base_url: https://open.bigmodel.cn/api/paas/v4/
      api_key: ${ZHIPUAI_API_KEY}
      max_tokens: 4000
  
  action_guard:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4-flash
      base_url: https://open.bigmodel.cn/api/paas/v4/
      api_key: ${ZHIPUAI_API_KEY}
      temperature: 0.1

# 允许的网站列表 (可选)
allowed_websites:
  - "*.baidu.com"
  - "*.zhihu.com"
  - "*.csdn.net"
  - "*.bilibili.com"
```

---

### 8. 代码生成优化

**使用场景**: 主要任务是代码生成和调试

```yaml
# config-coding.yaml
model_client_configs:
  orchestrator:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4.6
      base_url: https://open.bigmodel.cn/api/paas/v4/
      api_key: ${ZHIPUAI_API_KEY}
      temperature: 0.6
      max_tokens: 6000
  
  web_surfer:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4.5-air
      base_url: https://open.bigmodel.cn/api/paas/v4/
      api_key: ${ZHIPUAI_API_KEY}
      temperature: 0.5
      max_tokens: 4000
  
  coder:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4.6
      base_url: https://open.bigmodel.cn/api/paas/v4/
      api_key: ${ZHIPUAI_API_KEY}
      # 代码生成优化参数
      temperature: 0.2
      max_tokens: 12000
      top_p: 0.95
      frequency_penalty: 0.2
      presence_penalty: 0.1
      max_retries: 15
  
  file_surfer:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4.5-air
      base_url: https://open.bigmodel.cn/api/paas/v4/
      api_key: ${ZHIPUAI_API_KEY}
      temperature: 0.4
      max_tokens: 6000
  
  action_guard:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4-flash
      base_url: https://open.bigmodel.cn/api/paas/v4/
      api_key: ${ZHIPUAI_API_KEY}
      temperature: 0.1
      max_tokens: 2000

# 代码任务优化配置
max_actions_per_step: 8
max_turns: 25
multiple_tools_per_call: true
```

---

### 9. 数据分析任务

**使用场景**: 数据抓取和分析

```yaml
# config-data-analysis.yaml
model_client_configs:
  orchestrator:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4.6
      base_url: https://open.bigmodel.cn/api/paas/v4/
      api_key: ${ZHIPUAI_API_KEY}
      temperature: 0.5
      max_tokens: 6000
  
  web_surfer:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4.6
      base_url: https://open.bigmodel.cn/api/paas/v4/
      api_key: ${ZHIPUAI_API_KEY}
      temperature: 0.3
      max_tokens: 8000
      max_retries: 12
  
  coder:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4.6
      base_url: https://open.bigmodel.cn/api/paas/v4/
      api_key: ${ZHIPUAI_API_KEY}
      temperature: 0.2
      max_tokens: 10000
  
  file_surfer:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4.5-air
      base_url: https://open.bigmodel.cn/api/paas/v4/
      api_key: ${ZHIPUAI_API_KEY}
      temperature: 0.3
      max_tokens: 6000
  
  action_guard:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4-flash
      base_url: https://open.bigmodel.cn/api/paas/v4/
      api_key: ${ZHIPUAI_API_KEY}
      temperature: 0.1

# 数据分析优化
max_actions_per_step: 10
max_turns: 30
do_bing_search: true  # 启用搜索增强
```

---

## 性能优化配置

### 10. 高并发配置

**使用场景**: 处理大量并发任务

```yaml
# config-concurrent.yaml
model_client_configs:
  orchestrator:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4.5-air
      base_url: https://open.bigmodel.cn/api/paas/v4/
      api_key: ${ZHIPUAI_API_KEY}
      temperature: 0.7
      max_tokens: 4000
      max_retries: 15
      timeout: 120
  
  web_surfer:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4.5-air
      base_url: https://open.bigmodel.cn/api/paas/v4/
      api_key: ${ZHIPUAI_API_KEY}
      temperature: 0.5
      max_tokens: 4000
      max_retries: 15
      timeout: 120
  
  coder:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4.5-air
      base_url: https://open.bigmodel.cn/api/paas/v4/
      api_key: ${ZHIPUAI_API_KEY}
      temperature: 0.3
      max_tokens: 6000
      max_retries: 15
      timeout: 120
  
  file_surfer:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4-flash
      base_url: https://open.bigmodel.cn/api/paas/v4/
      api_key: ${ZHIPUAI_API_KEY}
      max_tokens: 2000
      max_retries: 10
      timeout: 60
  
  action_guard:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4-flash
      base_url: https://open.bigmodel.cn/api/paas/v4/
      api_key: ${ZHIPUAI_API_KEY}
      temperature: 0.1
      max_tokens: 1000
      max_retries: 5
      timeout: 30

# 并发优化
max_actions_per_step: 5
max_turns: 20
multiple_tools_per_call: true
```

---

### 11. 低延迟配置

**使用场景**: 需要快速响应的交互式任务

```yaml
# config-low-latency.yaml
model_client_configs:
  orchestrator:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4-flash
      base_url: https://open.bigmodel.cn/api/paas/v4/
      api_key: ${ZHIPUAI_API_KEY}
      temperature: 0.8
      max_tokens: 2000
      max_retries: 5
      timeout: 30
  
  web_surfer:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4-flash
      base_url: https://open.bigmodel.cn/api/paas/v4/
      api_key: ${ZHIPUAI_API_KEY}
      temperature: 0.6
      max_tokens: 3000
      max_retries: 5
      timeout: 30
  
  coder:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4.5-air
      base_url: https://open.bigmodel.cn/api/paas/v4/
      api_key: ${ZHIPUAI_API_KEY}
      temperature: 0.3
      max_tokens: 4000
      max_retries: 8
      timeout: 60
  
  file_surfer:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4-flash
      base_url: https://open.bigmodel.cn/api/paas/v4/
      api_key: ${ZHIPUAI_API_KEY}
      max_tokens: 1500
      max_retries: 5
      timeout: 20
  
  action_guard:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4-flash
      base_url: https://open.bigmodel.cn/api/paas/v4/
      api_key: ${ZHIPUAI_API_KEY}
      temperature: 0.1
      max_tokens: 500
      max_retries: 3
      timeout: 15

# 低延迟优化
max_actions_per_step: 3
max_turns: 15
cooperative_planning: false
autonomous_execution: true
```

---

## 故障排查配置

### 12. 调试配置

**使用场景**: 开发调试,需要详细日志

```yaml
# config-debug.yaml
model_client_configs:
  orchestrator:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4-flash  # 使用快速模型节省成本
      base_url: https://open.bigmodel.cn/api/paas/v4/
      api_key: ${ZHIPUAI_API_KEY}
      temperature: 0.7
      max_tokens: 3000
      max_retries: 3
      timeout: 60
  
  web_surfer:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4-flash
      base_url: https://open.bigmodel.cn/api/paas/v4/
      api_key: ${ZHIPUAI_API_KEY}
      temperature: 0.5
      max_tokens: 3000
      max_retries: 3
      timeout: 60
  
  coder:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4.5-air
      base_url: https://open.bigmodel.cn/api/paas/v4/
      api_key: ${ZHIPUAI_API_KEY}
      temperature: 0.3
      max_tokens: 4000
      max_retries: 3
      timeout: 60
  
  file_surfer:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4-flash
      base_url: https://open.bigmodel.cn/api/paas/v4/
      api_key: ${ZHIPUAI_API_KEY}
      max_tokens: 2000
      max_retries: 3
  
  action_guard:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4-flash
      base_url: https://open.bigmodel.cn/api/paas/v4/
      api_key: ${ZHIPUAI_API_KEY}
      temperature: 0.1
      max_tokens: 1000
      max_retries: 2

# 调试配置
max_actions_per_step: 2
max_turns: 10
cooperative_planning: true
autonomous_execution: false
```

**启动命令**:
```bash
# 启用详细日志
export LOG_LEVEL=DEBUG
magentic-ui --port 8081 --config config-debug.yaml --debug
```

---

### 13. 网络代理配置

**使用场景**: 需要通过代理访问智谱AI

```yaml
# config-proxy.yaml
model_client_configs:
  orchestrator:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4.6
      base_url: https://open.bigmodel.cn/api/paas/v4/
      api_key: ${ZHIPUAI_API_KEY}
      max_retries: 15
      timeout: 180
  
  web_surfer:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4.6
      base_url: https://open.bigmodel.cn/api/paas/v4/
      api_key: ${ZHIPUAI_API_KEY}
      max_retries: 15
      timeout: 180
  
  coder:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4.6
      base_url: https://open.bigmodel.cn/api/paas/v4/
      api_key: ${ZHIPUAI_API_KEY}
      max_retries: 15
      timeout: 180
  
  file_surfer:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4.5-air
      base_url: https://open.bigmodel.cn/api/paas/v4/
      api_key: ${ZHIPUAI_API_KEY}
      max_retries: 10
      timeout: 120
  
  action_guard:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4-flash
      base_url: https://open.bigmodel.cn/api/paas/v4/
      api_key: ${ZHIPUAI_API_KEY}
      max_retries: 8
      timeout: 90
```

**环境变量**:
```bash
export ZHIPUAI_API_KEY=your-api-key
export HTTP_PROXY=http://proxy.example.com:8080
export HTTPS_PROXY=http://proxy.example.com:8080
export NO_PROXY=localhost,127.0.0.1
```

---

## Docker配置

### 14. Docker Compose配置

**使用场景**: 使用Docker部署

```yaml
# docker-compose.yml
version: '3.8'

services:
  magentic-ui:
    image: magentic-ui:latest
    ports:
      - "8081:8081"
    environment:
      - ZHIPUAI_API_KEY=${ZHIPUAI_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    volumes:
      - ./config.yaml:/app/config.yaml
      - ./data:/app/data
    command: magentic-ui --port 8081 --config /app/config.yaml
```

**config.yaml**:
```yaml
model_client_configs:
  orchestrator:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4.6
      base_url: https://open.bigmodel.cn/api/paas/v4/
      api_key: ${ZHIPUAI_API_KEY}
```

**.env文件**:
```bash
ZHIPUAI_API_KEY=your-zhipuai-api-key
OPENAI_API_KEY=your-openai-api-key
```

**启动命令**:
```bash
docker-compose up -d
```

---

## 使用建议

### 选择配置的指南

| 场景 | 推荐配置 | 原因 |
|------|---------|------|
| 快速开始 | #1 最简配置 | 简单易用 |
| 生产环境 | #2 完整配置 | 全面稳定 |
| 混合部署 | #3 混合配置 | 灵活组合 |
| 高性能 | #4 高性能配置 | 最佳性能 |
| 控制成本 | #5 成本优化配置 | 节省费用 |
| 图像处理 | #6 视觉任务配置 | 支持视觉 |
| 中文任务 | #7 中文内容配置 | 中文优势 |
| 代码生成 | #8 代码生成配置 | 代码质量 |
| 数据分析 | #9 数据分析配置 | 分析优化 |
| 高并发 | #10 高并发配置 | 稳定性 |
| 快速响应 | #11 低延迟配置 | 低延迟 |
| 开发调试 | #12 调试配置 | 详细日志 |
| 网络限制 | #13 代理配置 | 代理支持 |

### 配置调优建议

1. **Temperature** (温度参数)
   - 0.1-0.3: 代码生成、安全检查
   - 0.4-0.6: 数据分析、文件操作
   - 0.7-0.9: 创意任务、对话生成

2. **Max Tokens** (最大token数)
   - 1000-2000: 简单任务
   - 3000-6000: 通用任务
   - 8000-12000: 复杂代码生成

3. **Max Retries** (最大重试次数)
   - 3-5: 调试环境
   - 8-10: 生产环境
   - 15+: 高稳定性要求

4. **Timeout** (超时时间)
   - 15-30s: 快速响应任务
   - 60-120s: 通用任务
   - 180s+: 复杂长任务

---

**文档签名**: ssiagu  
**最后更新**: 2025-10-21
