# 智谱AI集成用户指南

**项目**: Magentic-UI 智谱AI模型支持  
**文档版本**: v1.0  
**创建日期**: 2025-10-21  
**作者**: ssiagu  

## 📋 目录

1. [简介](#简介)
2. [快速开始](#快速开始)
3. [配置方式](#配置方式)
4. [使用场景](#使用场景)
5. [常见问题](#常见问题)
6. [故障排查](#故障排查)

---

## 简介

### 什么是智谱AI?

智谱AI是由清华大学和智谱华章联合开发的大语言模型服务平台,提供GLM系列模型。GLM-4系列模型在中文理解、代码生成、逻辑推理等方面表现优异。

### 为什么使用智谱AI?

- ✅ **中文优势**: 在中文理解和生成方面表现出色
- ✅ **成本效益**: 相比OpenAI具有更好的价格性能比
- ✅ **API兼容**: 完全兼容OpenAI API,迁移成本低
- ✅ **本地化**: 国内访问速度快,服务稳定

### Magentic-UI对智谱AI的支持

Magentic-UI通过OpenAI兼容层支持智谱AI,您可以:

- 在UI中选择智谱AI模型
- 通过配置文件配置智谱AI
- 混合使用OpenAI和智谱AI模型
- 为不同智能体配置不同的模型

---

## 快速开始

### 前置条件

1. **获取智谱AI API Key**
   - 访问 [智谱AI开放平台](https://bigmodel.cn)
   - 注册并登录账户
   - 在 [API Keys管理](https://bigmodel.cn/usercenter/proj-mgmt/apikeys) 创建API Key

2. **安装Magentic-UI**
   ```bash
   pip install magentic-ui
   # 或从源码安装
   git clone https://github.com/microsoft/magentic-ui.git
   cd magentic-ui
   pip install -e .
   ```

### 5分钟快速配置

#### 方式1: 环境变量配置 (推荐)

```bash
# 设置智谱AI API Key
export ZHIPUAI_API_KEY=your-zhipuai-api-key

# 启动Magentic-UI
magentic-ui --port 8081
```

#### 方式2: UI配置

1. 启动Magentic-UI: `magentic-ui --port 8081`
2. 打开浏览器访问: `http://localhost:8081`
3. 点击右上角设置图标 ⚙️
4. 进入"Agent Settings"标签
5. 选择"OpenAI"提供商
6. 选择预设: `glm-4.6`
7. 保存配置

#### 方式3: 配置文件

创建`config.yaml`:

```yaml
# Define ZhipuAI client base configuration (using YAML anchor)
zhipuai_base_config: &zhipuai_base_config
  base_url: https://open.bigmodel.cn/api/paas/v4/
  api_key: ${ZHIPUAI_API_KEY}
  max_retries: 10

# Configure models for each agent
orchestrator_client:
  provider: OpenAIChatCompletionClient
  config:
    <<: *zhipuai_base_config
    model: glm-4.6
    model_info:
      provider: "zhipuai"
      family: "glm"
      type: "chat_completion"
      vision: false
      function_calling: true
      json_output: true
      structured_output: true
    temperature: 0.7
    max_tokens: 6000

web_surfer_client:
  provider: OpenAIChatCompletionClient
  config:
    <<: *zhipuai_base_config
    model: glm-4.6
    model_info:
      provider: "zhipuai"
      family: "glm"
      type: "chat_completion"
      vision: false
      function_calling: true
      json_output: true
      structured_output: true
    temperature: 0.5
    max_tokens: 6000

coder_client:
  provider: OpenAIChatCompletionClient
  config:
    <<: *zhipuai_base_config
    model: glm-4.6
    model_info:
      provider: "zhipuai"
      family: "glm"
      type: "chat_completion"
      vision: false
      function_calling: true
      json_output: true
      structured_output: true
    temperature: 0.3
    max_tokens: 8000

file_surfer_client:
  provider: OpenAIChatCompletionClient
  config:
    <<: *zhipuai_base_config
    model: glm-4.5-air
    model_info:
      provider: "zhipuai"
      family: "glm"
      type: "chat_completion"
      vision: false
      function_calling: true
      json_output: true
      structured_output: true
    temperature: 0.5
    max_tokens: 4000

action_guard_client:
  provider: OpenAIChatCompletionClient
  config:
    <<: *zhipuai_base_config
    model: glm-4-flash
    model_info:
      provider: "zhipuai"
      family: "glm"
      type: "chat_completion"
      vision: false
      function_calling: true
      json_output: true
      structured_output: true
    temperature: 0.1
    max_tokens: 2000

plan_learning_client:
  provider: OpenAIChatCompletionClient
  config:
    <<: *zhipuai_base_config
    model: glm-4.6
    model_info:
      provider: "zhipuai"
      family: "glm"
      type: "chat_completion"
      vision: false
      function_calling: true
      json_output: true
      structured_output: true
    temperature: 0.7
    max_tokens: 6000

# Other Magentic-UI configuration
cooperative_planning: true
autonomous_execution: false
max_actions_per_step: 5
max_turns: 20
approval_policy: auto-conservative
allow_for_replans: true
do_bing_search: false
websurfer_loop: false
```

启动:
```bash
magentic-ui --port 8081 --config config.yaml
```

---

## 配置方式

### 智谱AI模型列表

| 模型名称 | 描述 | 适用场景 | Max Tokens |
|---------|------|---------|------------|
| glm-4.6 | 最强性能模型 | 复杂推理、代码生成、任务规划 | 8000 |
| glm-4.5-air | 平衡性价比 | 通用对话、文本生成 | 6000 |
| glm-4-flash | 快速响应 | 轻量级任务、简单问答 | 4000 |
| glm-4.5v | 视觉理解 | 图像分析、多模态任务 | 6000 |

### 环境变量配置

#### 基础配置

```bash
# 智谱AI API Key
export ZHIPUAI_API_KEY=your-zhipuai-api-key

# 可选: 设置base_url (如果需要自定义端点)
export OPENAI_BASE_URL=https://open.bigmodel.cn/api/paas/v4/
```

#### Windows PowerShell

```powershell
$env:ZHIPUAI_API_KEY="your-zhipuai-api-key"
$env:OPENAI_BASE_URL="https://open.bigmodel.cn/api/paas/v4/"
```

#### Windows CMD

```cmd
set ZHIPUAI_API_KEY=your-zhipuai-api-key
set OPENAI_BASE_URL=https://open.bigmodel.cn/api/paas/v4/
```

#### Docker环境

```bash
docker run -e ZHIPUAI_API_KEY=your-key magentic-ui
```

### UI配置详解

#### 步骤1: 打开设置

1. 启动Magentic-UI
2. 点击右上角齿轮图标 ⚙️
3. 进入"Agent Settings"标签

#### 步骤2: 选择提供商和预设

1. **Provider**: 选择 `OpenAI`
2. **Preset**: 选择以下之一
   - `ZhipuAI` - 使用默认智谱AI配置
   - `glm-4.6` - 最强性能模型
   - `glm-4.5-air` - 平衡型模型
   - `glm-4-flash` - 快速响应模型
   - `glm-4.5v` - 视觉理解模型

#### 步骤3: 自定义配置 (可选)

展开配置面板,可以自定义:

- **Model**: 模型名称
- **Base URL**: API端点 (`https://open.bigmodel.cn/api/paas/v4/`)
- **API Key**: API密钥 (留空则从环境变量读取)
- **Max Retries**: 最大重试次数 (建议10)
- **Temperature**: 温度参数 (0-1)
- **Max Tokens**: 最大token数

#### 步骤4: 为不同智能体配置

Magentic-UI支持为5个智能体独立配置:

- **Orchestrator** (编排器): 负责任务规划
- **Web Surfer** (网页浏览器): 负责Web自动化
- **Coder** (编程器): 负责代码生成和执行
- **File Surfer** (文件浏览器): 负责文件操作
- **Action Guard** (动作守卫): 负责安全检查

#### 推荐配置

```yaml
# 高性能配置
Orchestrator: glm-4.6      # 需要复杂推理
Web Surfer: glm-4.6        # 需要理解网页内容
Coder: glm-4.6             # 需要生成高质量代码
File Surfer: glm-4.5-air   # 文件操作相对简单
Action Guard: glm-4-flash  # 快速安全检查

# 成本优化配置
Orchestrator: glm-4.5-air
Web Surfer: glm-4.5-air
Coder: glm-4.6             # 代码质量重要,保持高性能
File Surfer: glm-4-flash
Action Guard: glm-4-flash
```

### 配置文件详解

#### 完整配置示例

```yaml
# config.yaml - 智谱AI完整配置示例

# Define ZhipuAI client base configuration (using YAML anchor)
zhipuai_base_config: &zhipuai_base_config
  base_url: https://open.bigmodel.cn/api/paas/v4/
  api_key: ${ZHIPUAI_API_KEY}  # 从环境变量读取
  max_retries: 10

# Configure models for each agent
orchestrator_client:
  provider: OpenAIChatCompletionClient
  config:
    <<: *zhipuai_base_config
    model: glm-4.6
    model_info:
      provider: "zhipuai"
      family: "glm"
      type: "chat_completion"
      vision: false
      function_calling: true
      json_output: true
      structured_output: true
    temperature: 0.7
    max_tokens: 6000

web_surfer_client:
  provider: OpenAIChatCompletionClient
  config:
    <<: *zhipuai_base_config
    model: glm-4.6
    model_info:
      provider: "zhipuai"
      family: "glm"
      type: "chat_completion"
      vision: false
      function_calling: true
      json_output: true
      structured_output: true
    temperature: 0.5
    max_tokens: 6000

coder_client:
  provider: OpenAIChatCompletionClient
  config:
    <<: *zhipuai_base_config
    model: glm-4.6
    model_info:
      provider: "zhipuai"
      family: "glm"
      type: "chat_completion"
      vision: false
      function_calling: true
      json_output: true
      structured_output: true
    temperature: 0.3
    max_tokens: 8000

file_surfer_client:
  provider: OpenAIChatCompletionClient
  config:
    <<: *zhipuai_base_config
    model: glm-4.5-air
    model_info:
      provider: "zhipuai"
      family: "glm"
      type: "chat_completion"
      vision: false
      function_calling: true
      json_output: true
      structured_output: true
    temperature: 0.5
    max_tokens: 4000

action_guard_client:
  provider: OpenAIChatCompletionClient
  config:
    <<: *zhipuai_base_config
    model: glm-4-flash
    model_info:
      provider: "zhipuai"
      family: "glm"
      type: "chat_completion"
      vision: false
      function_calling: true
      json_output: true
      structured_output: true
    temperature: 0.1
    max_tokens: 2000

plan_learning_client:
  provider: OpenAIChatCompletionClient
  config:
    <<: *zhipuai_base_config
    model: glm-4.6
    model_info:
      provider: "zhipuai"
      family: "glm"
      type: "chat_completion"
      vision: false
      function_calling: true
      json_output: true
      structured_output: true
    temperature: 0.7
    max_tokens: 6000

# Other Magentic-UI configuration
cooperative_planning: true
autonomous_execution: false
max_actions_per_step: 5
max_turns: 20
approval_policy: auto-conservative
allow_for_replans: true
do_bing_search: false
websurfer_loop: false
```

#### 混合配置示例

```yaml
# 混合使用OpenAI和智谱AI
model_client_configs:
  # Orchestrator使用OpenAI
  orchestrator:
    provider: OpenAIChatCompletionClient
    config:
      model: gpt-4o-2024-08-06
      api_key: ${OPENAI_API_KEY}
      max_retries: 5
  
  # Web Surfer使用智谱AI
  web_surfer:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4.6
      base_url: https://open.bigmodel.cn/api/paas/v4/
      api_key: ${ZHIPUAI_API_KEY}
      max_retries: 10
  
  # Coder使用智谱AI
  coder:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4.6
      base_url: https://open.bigmodel.cn/api/paas/v4/
      api_key: ${ZHIPUAI_API_KEY}
      max_retries: 10
```

---

## 使用场景

### 场景1: 中文任务处理

**问题**: 需要处理大量中文内容的任务

**解决方案**: 使用智谱AI的glm-4.6模型

```yaml
model_client_configs:
  orchestrator:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4.6
      base_url: https://open.bigmodel.cn/api/paas/v4/
  
  web_surfer:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4.6
      base_url: https://open.bigmodel.cn/api/paas/v4/
```

**优势**:
- 更好的中文理解能力
- 更准确的中文生成
- 更低的成本

### 场景2: 成本优化

**问题**: 需要降低API调用成本

**解决方案**: 根据智能体重要性分配不同模型

```yaml
model_client_configs:
  orchestrator: glm-4.6        # 核心任务,使用最强模型
  web_surfer: glm-4.5-air      # 降级为平衡型
  coder: glm-4.6               # 代码质量重要,保持高性能
  file_surfer: glm-4-flash     # 简单任务,使用快速模型
  action_guard: glm-4-flash    # 安全检查,快速即可
```

**成本节省**: 约50-70%

### 场景3: 混合部署

**问题**: 某些任务需要OpenAI,某些需要智谱AI

**解决方案**: 混合配置

```yaml
model_client_configs:
  orchestrator:
    config:
      model: gpt-4o-2024-08-06  # OpenAI,任务规划
      api_key: ${OPENAI_API_KEY}
  
  web_surfer:
    config:
      model: glm-4.6            # 智谱AI,中文网页处理
      base_url: https://open.bigmodel.cn/api/paas/v4/
      api_key: ${ZHIPUAI_API_KEY}
```

### 场景4: 视觉任务

**问题**: 需要处理图像分析任务

**解决方案**: 使用glm-4.5v视觉模型

```yaml
model_client_configs:
  web_surfer:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4.5v
      base_url: https://open.bigmodel.cn/api/paas/v4/
```

**支持功能**:
- 网页截图分析
- 图像内容理解
- OCR文字识别
- 图像问答

---

## 常见问题

### Q1: 智谱AI和OpenAI可以同时使用吗?

**A**: 可以。您可以为不同的智能体配置不同的模型提供商。

```yaml
orchestrator: OpenAI gpt-4o
web_surfer: 智谱AI glm-4.6
coder: 智谱AI glm-4.6
```

### Q2: API Key如何安全存储?

**A**: 推荐使用环境变量:

```bash
# 创建.env文件
ZHIPUAI_API_KEY=your-api-key

# 在.gitignore中添加
.env
config.yaml
```

### Q3: 如何切换回OpenAI?

**A**: 三种方式:

1. **UI**: 选择OpenAI预设
2. **环境变量**: 删除`ZHIPUAI_API_KEY`,使用`OPENAI_API_KEY`
3. **配置文件**: 修改`base_url`或删除该字段

### Q4: 智谱AI支持哪些功能?

**A**: 支持的功能:

- ✅ Chat Completions
- ✅ Function Calling
- ✅ Streaming
- ✅ Vision (glm-4.5v)
- ✅ JSON Mode
- ❌ Embeddings (需要单独配置)
- ❌ Fine-tuning (通过智谱AI平台)

### Q5: 如何查看当前使用的模型?

**A**: 
1. UI: 设置页面查看
2. 日志: 查看启动日志
3. API: `/api/settings`端点

### Q6: 智谱AI的速率限制是多少?

**A**: 根据订阅级别不同:

- 免费版: 100 QPM (每分钟请求数)
- 基础版: 1000 QPM
- 专业版: 5000+ QPM

建议设置`max_retries: 10`以应对限流。

### Q7: 如何优化成本?

**A**: 成本优化建议:

1. **模型选择**: 简单任务使用glm-4-flash
2. **Token限制**: 设置合理的`max_tokens`
3. **缓存**: 启用响应缓存
4. **批处理**: 合并相似请求
5. **监控**: 跟踪使用量

### Q8: 支持代理配置吗?

**A**: 支持。设置环境变量:

```bash
export HTTP_PROXY=http://proxy.example.com:8080
export HTTPS_PROXY=http://proxy.example.com:8080
```

---

## 故障排查

### 问题1: 认证失败

**错误信息**:
```
AuthenticationError: Invalid API key
```

**解决方案**:
1. 检查API Key是否正确
2. 确认环境变量已设置: `echo $ZHIPUAI_API_KEY`
3. 验证API Key在智谱AI平台是否有效
4. 检查base_url是否正确

### 问题2: 连接超时

**错误信息**:
```
APIConnectionError: Connection timeout
```

**解决方案**:
1. 检查网络连接
2. 验证base_url: `curl https://open.bigmodel.cn/api/paas/v4/`
3. 增加超时时间: `timeout: 120`
4. 检查代理设置

### 问题3: 速率限制

**错误信息**:
```
RateLimitError: Rate limit exceeded
```

**解决方案**:
1. 增加重试次数: `max_retries: 15`
2. 降低并发请求数
3. 升级智谱AI订阅
4. 实现请求队列

### 问题4: 模型不存在

**错误信息**:
```
Model 'xxx' not found
```

**解决方案**:
1. 确认模型名称拼写正确
2. 使用支持的模型: glm-4.6, glm-4.5-air, glm-4-flash, glm-4.5v
3. 检查智谱AI账户权限

### 问题5: Base URL错误

**错误信息**:
```
Invalid base_url
```

**解决方案**:
1. 使用正确的URL: `https://open.bigmodel.cn/api/paas/v4/`
2. 注意结尾斜杠 `/`
3. 检查协议是否为https

### 问题6: 响应格式错误

**错误信息**:
```
Invalid response format
```

**解决方案**:
1. 确认使用的是智谱AI支持的模型
2. 检查请求参数格式
3. 查看智谱AI API文档
4. 联系智谱AI技术支持

### 调试技巧

#### 1. 启用详细日志

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

#### 2. 验证配置

```bash
# 启动时检查配置
magentic-ui --config config.yaml --debug
```

#### 3. 测试API连接

```python
from openai import OpenAI

client = OpenAI(
    api_key="your-key",
    base_url="https://open.bigmodel.cn/api/paas/v4/"
)

response = client.chat.completions.create(
    model="glm-4.6",
    messages=[{"role": "user", "content": "测试"}]
)
print(response)
```

#### 4. 查看日志文件

```bash
# 日志位置
tail -f ~/.magentic-ui/logs/magentic-ui.log
```

---

## 附录

### A. 环境变量完整列表

| 变量名 | 说明 | 示例 |
|--------|------|------|
| ZHIPUAI_API_KEY | 智谱AI API密钥 | `your-zhipuai-key` |
| OPENAI_API_KEY | OpenAI API密钥 (后备) | `your-openai-key` |
| OPENAI_BASE_URL | 自定义API端点 | `https://open.bigmodel.cn/api/paas/v4/` |
| HTTP_PROXY | HTTP代理 | `http://proxy:8080` |
| HTTPS_PROXY | HTTPS代理 | `http://proxy:8080` |

### B. 智谱AI资源链接

- 官方网站: https://bigmodel.cn
- API文档: https://docs.bigmodel.cn
- 开发者社区: https://community.bigmodel.cn
- API Keys管理: https://bigmodel.cn/usercenter/proj-mgmt/apikeys
- 使用量监控: https://bigmodel.cn/usercenter/usage

### C. 示例配置文件

完整的配置文件示例请参考:
- `experiments/endpoint_configs/config_zhipuai_example.yaml`
- `experiments/endpoint_configs/config_template.yaml`

### D. 更多帮助

- 📖 技术设计文档: `docs/qoder/zhipuai-technical-design.md`
- 📋 实施计划: `docs/qoder/zhipuai-integration-plan.md`
- 🏗️ 架构文档: `docs/architecture.md`
- 💬 社区讨论: GitHub Issues

---

**文档签名**: ssiagu  
**最后更新**: 2025-10-21
