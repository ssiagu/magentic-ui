# 智谱AI集成技术设计文档

**项目**: Magentic-UI 智谱AI模型支持  
**文档版本**: v1.0  
**创建日期**: 2025-10-21  
**作者**: ssiagu  

## 📋 目录

1. [技术架构](#技术架构)
2. [详细设计](#详细设计)
3. [接口设计](#接口设计)
4. [数据模型](#数据模型)
5. [实现细节](#实现细节)
6. [安全设计](#安全设计)

---

## 技术架构

### 整体架构

智谱AI集成采用**OpenAI兼容层**架构,充分利用现有的`OpenAIChatCompletionClient`,通过配置`base_url`切换到智谱AI服务端点。

```
┌─────────────────────────────────────────────────┐
│              Magentic-UI Frontend               │
│  ┌──────────────────────────────────────────┐   │
│  │      ModelSelector (UI Component)        │   │
│  │  ┌────────────┐  ┌─────────────────┐    │   │
│  │  │  OpenAI    │  │   智谱AI Presets │    │   │
│  │  │  Presets   │  │   - glm-4.6     │    │   │
│  │  └────────────┘  │   - glm-4.5-air │    │   │
│  │                  │   - glm-4-flash │    │   │
│  │                  │   - glm-4.5v    │    │   │
│  │                  └─────────────────┘    │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│             Magentic-UI Backend                 │
│  ┌──────────────────────────────────────────┐   │
│  │      MagenticUIConfig (Pydantic)         │   │
│  │  ┌────────────────────────────────────┐  │   │
│  │  │     ModelClientConfigs             │  │   │
│  │  │  - orchestrator                    │  │   │
│  │  │  - web_surfer                      │  │   │
│  │  │  - coder                           │  │   │
│  │  │  - file_surfer                     │  │   │
│  │  │  - action_guard                    │  │   │
│  │  └────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────┘   │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │   ZhipuAIConfig (Helper Module)          │   │
│  │  - create_client_config()                │   │
│  │  - get_model_presets()                   │   │
│  │  - get_api_key()                         │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│          OpenAI Compatible Layer                │
│  ┌──────────────────────────────────────────┐   │
│  │   OpenAIChatCompletionClient (AutoGen)   │   │
│  │  - Unified API interface                 │   │
│  │  - Configurable base_url                 │   │
│  │  - API key management                    │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
                       │
          ┌────────────┴────────────┐
          ▼                         ▼
┌──────────────────┐      ┌──────────────────┐
│   OpenAI API     │      │  智谱AI API      │
│  api.openai.com  │      │  bigmodel.cn     │
└──────────────────┘      └──────────────────┘
```

### 核心设计原则

1. **零侵入性**: 不修改AutoGen核心代码,仅通过配置实现
2. **向后兼容**: 完全兼容现有OpenAI和Azure配置
3. **灵活配置**: 支持UI、配置文件、环境变量多种配置方式
4. **智能体独立**: 每个智能体可独立配置模型提供商

---

## 详细设计

### 1. 后端设计

#### 1.1 配置辅助模块

**文件**: `src/magentic_ui/providers/zhipuai_config.py`

```python
"""智谱AI配置辅助模块

提供智谱AI模型配置的创建、验证和管理功能。
"""

import os
from typing import Dict, Any, Optional, List
from dataclasses import dataclass


@dataclass
class ModelPreset:
    """模型预设配置"""
    name: str
    description: str
    max_tokens: int
    temperature: float
    supports_vision: bool = False
    supports_function_calling: bool = True


class ZhipuAIConfig:
    """智谱AI配置管理器
    
    提供智谱AI模型配置的创建、验证和管理功能。
    """
    
    # 智谱AI API端点
    DEFAULT_BASE_URL = "https://open.bigmodel.cn/api/paas/v4/"
    
    # 模型预设定义
    MODEL_PRESETS: Dict[str, ModelPreset] = {
        "glm-4.6": ModelPreset(
            name="glm-4.6",
            description="最强性能模型,适合复杂推理任务",
            max_tokens=8000,
            temperature=0.7,
            supports_vision=False,
            supports_function_calling=True
        ),
        "glm-4.5-air": ModelPreset(
            name="glm-4.5-air",
            description="平衡性价比,适合通用任务",
            max_tokens=6000,
            temperature=0.7,
            supports_vision=False,
            supports_function_calling=True
        ),
        "glm-4-flash": ModelPreset(
            name="glm-4-flash",
            description="快速响应,适合轻量级任务",
            max_tokens=4000,
            temperature=0.9,
            supports_vision=False,
            supports_function_calling=True
        ),
        "glm-4.5v": ModelPreset(
            name="glm-4.5v",
            description="视觉理解模型,支持图像分析",
            max_tokens=6000,
            temperature=0.7,
            supports_vision=True,
            supports_function_calling=True
        )
    }
    
    @staticmethod
    def get_api_key() -> Optional[str]:
        """获取智谱AI API Key
        
        优先级:
        1. ZHIPUAI_API_KEY 环境变量
        2. OPENAI_API_KEY 环境变量 (如果配置了智谱AI base_url)
        
        Returns:
            API密钥,如果未配置则返回None
        """
        return os.getenv("ZHIPUAI_API_KEY") or os.getenv("OPENAI_API_KEY")
    
    @staticmethod
    def create_client_config(
        model: str = "glm-4.6",
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        max_retries: int = 10,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None
    ) -> Dict[str, Any]:
        """创建智谱AI客户端配置
        
        Args:
            model: 模型名称,默认"glm-4.6"
            api_key: API密钥,如果为None则从环境变量获取
            base_url: API端点,如果为None则使用默认值
            max_retries: 最大重试次数,默认10
            temperature: 温度参数,如果为None则使用预设值
            max_tokens: 最大token数,如果为None则使用预设值
            
        Returns:
            符合AutoGen规范的客户端配置字典
        """
        # 获取模型预设
        preset = ZhipuAIConfig.MODEL_PRESETS.get(model)
        
        config = {
            "provider": "OpenAIChatCompletionClient",
            "config": {
                "model": model,
                "api_key": api_key or ZhipuAIConfig.get_api_key(),
                "base_url": base_url or ZhipuAIConfig.DEFAULT_BASE_URL,
                "max_retries": max_retries,
            }
        }
        
        # 添加可选参数
        if temperature is not None:
            config["config"]["temperature"] = temperature
        elif preset:
            config["config"]["temperature"] = preset.temperature
            
        if max_tokens is not None:
            config["config"]["max_tokens"] = max_tokens
        elif preset:
            config["config"]["max_tokens"] = preset.max_tokens
        
        return config
    
    @staticmethod
    def get_model_presets() -> Dict[str, Dict[str, Any]]:
        """获取智谱AI模型预设配置
        
        Returns:
            模型预设字典,键为模型名称,值为预设配置
        """
        return {
            name: {
                "description": preset.description,
                "max_tokens": preset.max_tokens,
                "temperature": preset.temperature,
                "supports_vision": preset.supports_vision,
                "supports_function_calling": preset.supports_function_calling
            }
            for name, preset in ZhipuAIConfig.MODEL_PRESETS.items()
        }
    
    @staticmethod
    def is_zhipuai_url(base_url: Optional[str]) -> bool:
        """检查URL是否为智谱AI端点
        
        Args:
            base_url: 要检查的URL
            
        Returns:
            如果是智谱AI URL返回True,否则返回False
        """
        if not base_url:
            return False
        return "bigmodel.cn" in base_url.lower()
    
    @staticmethod
    def validate_config(config: Dict[str, Any]) -> List[str]:
        """验证智谱AI配置
        
        Args:
            config: 要验证的配置字典
            
        Returns:
            错误信息列表,如果配置有效则返回空列表
        """
        errors = []
        
        if "config" not in config:
            errors.append("Missing 'config' field")
            return errors
        
        cfg = config["config"]
        
        # 检查必需字段
        if "model" not in cfg:
            errors.append("Missing 'model' field in config")
        
        # 检查API密钥
        if not cfg.get("api_key") and not ZhipuAIConfig.get_api_key():
            errors.append(
                "API key not found. Please set ZHIPUAI_API_KEY or "
                "OPENAI_API_KEY environment variable, or provide api_key in config"
            )
        
        # 检查base_url
        if cfg.get("base_url") and not ZhipuAIConfig.is_zhipuai_url(cfg["base_url"]):
            errors.append(
                f"Invalid base_url: {cfg['base_url']}. "
                f"Expected: {ZhipuAIConfig.DEFAULT_BASE_URL}"
            )
        
        return errors
    
    @staticmethod
    def get_recommended_config_for_agent(agent_type: str) -> Dict[str, Any]:
        """获取智能体推荐的智谱AI配置
        
        Args:
            agent_type: 智能体类型 (orchestrator, web_surfer, coder, file_surfer, action_guard)
            
        Returns:
            推荐的配置字典
        """
        recommendations = {
            "orchestrator": {
                "model": "glm-4.6",
                "temperature": 0.7,
                "max_tokens": 6000,
            },
            "web_surfer": {
                "model": "glm-4.6",
                "temperature": 0.5,
                "max_tokens": 6000,
            },
            "coder": {
                "model": "glm-4.6",
                "temperature": 0.3,
                "max_tokens": 8000,
            },
            "file_surfer": {
                "model": "glm-4.5-air",
                "temperature": 0.5,
                "max_tokens": 4000,
            },
            "action_guard": {
                "model": "glm-4-flash",
                "temperature": 0.1,
                "max_tokens": 2000,
            }
        }
        
        agent_config = recommendations.get(
            agent_type, 
            {"model": "glm-4.6", "temperature": 0.7, "max_tokens": 6000}
        )
        
        return ZhipuAIConfig.create_client_config(**agent_config)
```

#### 1.2 配置加载增强

**文件**: `src/magentic_ui/backend/web/routes/plans.py` (部分修改)

```python
# 在配置加载部分添加智谱AI支持
import os
from magentic_ui.providers.zhipuai_config import ZhipuAIConfig

def load_plan_learning_client():
    """加载计划学习客户端,支持智谱AI"""
    config_file = os.environ.get("_CONFIG")
    
    # 优先从配置文件加载
    if config_file:
        with open(config_file, "r") as f:
            config = yaml.safe_load(f)
            plan_learning_config = config.get("plan_learning_client")
            if plan_learning_config:
                return ChatCompletionClient.load_component(plan_learning_config)
    
    # 检查是否配置了智谱AI
    if os.environ.get("ZHIPUAI_API_KEY"):
        zhipuai_config = ZhipuAIConfig.create_client_config(
            model="glm-4.6",
            max_retries=10
        )
        return ChatCompletionClient.load_component(zhipuai_config)
    
    # 默认使用OpenAI
    if os.environ.get("OPENAI_BASE_URL") and ZhipuAIConfig.is_zhipuai_url(
        os.environ.get("OPENAI_BASE_URL")
    ):
        # OPENAI_BASE_URL指向智谱AI
        zhipuai_config = ZhipuAIConfig.create_client_config(
            model="glm-4.6",
            base_url=os.environ.get("OPENAI_BASE_URL"),
            max_retries=10
        )
        return ChatCompletionClient.load_component(zhipuai_config)
    
    # 使用默认OpenAI配置
    gpt4o_config = {
        "provider": "OpenAIChatCompletionClient",
        "config": {
            "model": "gpt-4o-2024-08-06",
            "api_key": os.environ.get("OPENAI_API_KEY"),
        },
        "max_retries": 5,
    }
    if os.environ.get("OPENAI_BASE_URL"):
        gpt4o_config["config"]["base_url"] = os.environ.get("OPENAI_BASE_URL")
    
    return ChatCompletionClient.load_component(gpt4o_config)
```

---

### 2. 前端设计

#### 2.1 智谱AI预设配置

**文件**: `frontend/src/components/settings/tabs/agentSettings/modelSelector/ModelSelector.tsx`

在`PROVIDER_FORM_MAP[DEFAULT_OPENAI.provider].presets`中添加:

```typescript
// 智谱AI预设
"ZhipuAI": {
  ...DEFAULT_OPENAI,
  config: {
    ...DEFAULT_OPENAI.config,
    base_url: "https://open.bigmodel.cn/api/paas/v4/"
  }
},
"glm-4.6": {
  ...DEFAULT_OPENAI,
  config: {
    ...DEFAULT_OPENAI.config,
    model: "glm-4.6",
    base_url: "https://open.bigmodel.cn/api/paas/v4/",
    max_retries: 10
  }
},
"glm-4.5-air": {
  ...DEFAULT_OPENAI,
  config: {
    ...DEFAULT_OPENAI.config,
    model: "glm-4.5-air",
    base_url: "https://open.bigmodel.cn/api/paas/v4/",
    max_retries: 10
  }
},
"glm-4-flash": {
  ...DEFAULT_OPENAI,
  config: {
    ...DEFAULT_OPENAI.config,
    model: "glm-4-flash",
    base_url: "https://open.bigmodel.cn/api/paas/v4/",
    max_retries: 10
  }
},
"glm-4.5v": {
  ...DEFAULT_OPENAI,
  config: {
    ...DEFAULT_OPENAI.config,
    model: "glm-4.5v",
    base_url: "https://open.bigmodel.cn/api/paas/v4/",
    max_retries: 10,
    model_info: {
      vision: true,
      function_calling: true,
      json_output: true,
      family: "unknown" as const,
      structured_output: false,
      multiple_system_messages: false,
    }
  }
}
```

#### 2.2 表单增强

**文件**: `frontend/src/components/settings/tabs/agentSettings/modelSelector/modelConfigForms/OpenAIModelConfigForm.tsx`

增强Base URL输入框:

```typescript
<Form.Item 
  label="Base URL" 
  name={["config", "base_url"]} 
  tooltip={
    <div>
      <div>OpenAI: https://api.openai.com/v1</div>
      <div>智谱AI: https://open.bigmodel.cn/api/paas/v4/</div>
      <div>OpenRouter: https://openrouter.ai/api/v1</div>
    </div>
  }
  rules={[
    { 
      required: false, 
      message: "Please enter your Base URL" 
    },
    {
      type: 'url',
      message: 'Please enter a valid URL'
    }
  ]}
>
  <Input 
    placeholder="https://open.bigmodel.cn/api/paas/v4/" 
    allowClear
  />
</Form.Item>
```

增强API Key输入框:

```typescript
<Form.Item 
  label="API Key" 
  name={["config", "api_key"]}
  tooltip={
    <div>
      <div>支持环境变量:</div>
      <div>• OPENAI_API_KEY (OpenAI)</div>
      <div>• ZHIPUAI_API_KEY (智谱AI)</div>
    </div>
  }
  rules={[{ required: false, message: "Please enter your API key" }]}
>
  <Input.Password 
    placeholder="从环境变量读取或手动输入" 
    allowClear
  />
</Form.Item>
```

---

## 接口设计

### 后端API

#### 配置验证端点

**新增**: `POST /api/settings/validate-model-config`

**请求**:
```json
{
  "provider": "OpenAIChatCompletionClient",
  "config": {
    "model": "glm-4.6",
    "base_url": "https://open.bigmodel.cn/api/paas/v4/",
    "api_key": "your-api-key"
  }
}
```

**响应** (成功):
```json
{
  "valid": true,
  "message": "Configuration is valid",
  "model_info": {
    "name": "glm-4.6",
    "description": "最强性能模型,适合复杂推理任务",
    "max_tokens": 8000,
    "supports_vision": false,
    "supports_function_calling": true
  }
}
```

**响应** (失败):
```json
{
  "valid": false,
  "errors": [
    "API key not found",
    "Invalid base_url"
  ]
}
```

---

## 数据模型

### 配置数据结构

#### YAML配置格式

```yaml
# 智谱AI配置示例
model_client_configs:
  orchestrator:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4.6
      api_key: ${ZHIPUAI_API_KEY}  # 从环境变量读取
      base_url: https://open.bigmodel.cn/api/paas/v4/
      temperature: 0.7
      max_tokens: 6000
      max_retries: 10
  
  web_surfer:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4.6
      base_url: https://open.bigmodel.cn/api/paas/v4/
      temperature: 0.5
      max_retries: 10
  
  coder:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4.6
      base_url: https://open.bigmodel.cn/api/paas/v4/
      temperature: 0.3
      max_tokens: 8000
      max_retries: 10
  
  file_surfer:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4.5-air
      base_url: https://open.bigmodel.cn/api/paas/v4/
      max_retries: 10
  
  action_guard:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4-flash
      base_url: https://open.bigmodel.cn/api/paas/v4/
      temperature: 0.1
      max_retries: 5
```

#### 前端数据模型

```typescript
// frontend/src/components/types/zhipuai.ts
export interface ZhipuAIModelConfig extends OpenAIModelConfig {
  config: {
    model: "glm-4.6" | "glm-4.5-air" | "glm-4-flash" | "glm-4.5v";
    base_url: "https://open.bigmodel.cn/api/paas/v4/";
    api_key?: string;
    max_retries?: number;
    temperature?: number;
    max_tokens?: number;
  };
}

export interface ZhipuAIPreset {
  name: string;
  label: string;
  description: string;
  config: ZhipuAIModelConfig;
}
```

---

## 实现细节

### 环境变量处理

#### 优先级顺序

1. **最高优先级**: 配置文件中明确指定的`api_key`
2. **中等优先级**: `ZHIPUAI_API_KEY`环境变量
3. **后备方案**: `OPENAI_API_KEY`环境变量 (当base_url指向智谱AI时)

#### 实现代码

```python
def get_effective_api_key(config: Dict[str, Any]) -> Optional[str]:
    """获取有效的API密钥"""
    # 1. 检查配置中的api_key
    if config.get("config", {}).get("api_key"):
        return config["config"]["api_key"]
    
    # 2. 检查是否为智谱AI URL
    base_url = config.get("config", {}).get("base_url", "")
    if ZhipuAIConfig.is_zhipuai_url(base_url):
        # 优先使用ZHIPUAI_API_KEY
        zhipuai_key = os.getenv("ZHIPUAI_API_KEY")
        if zhipuai_key:
            return zhipuai_key
        # 后备使用OPENAI_API_KEY
        return os.getenv("OPENAI_API_KEY")
    
    # 3. 默认使用OPENAI_API_KEY
    return os.getenv("OPENAI_API_KEY")
```

### 配置合并逻辑

当用户同时通过UI和配置文件设置时,采用以下合并策略:

```python
def merge_configs(
    ui_config: Dict[str, Any],
    file_config: Dict[str, Any]
) -> Dict[str, Any]:
    """合并UI配置和文件配置
    
    优先级: 文件配置 > UI配置
    """
    merged = ui_config.copy()
    
    if file_config:
        # 文件配置覆盖UI配置
        for key, value in file_config.items():
            if isinstance(value, dict) and key in merged:
                # 递归合并嵌套字典
                merged[key] = merge_configs(merged[key], value)
            else:
                merged[key] = value
    
    return merged
```

### 错误处理

#### 配置验证错误

```python
class ConfigValidationError(Exception):
    """配置验证错误"""
    def __init__(self, errors: List[str]):
        self.errors = errors
        super().__init__(f"Configuration validation failed: {', '.join(errors)}")

def validate_and_load_config(config: Dict[str, Any]) -> None:
    """验证并加载配置"""
    errors = ZhipuAIConfig.validate_config(config)
    if errors:
        raise ConfigValidationError(errors)
```

#### API调用错误

```python
from autogen_core.exceptions import (
    APIConnectionError,
    RateLimitError,
    AuthenticationError
)

async def call_with_retry(client, *args, **kwargs):
    """带重试的API调用"""
    max_retries = kwargs.get("max_retries", 10)
    
    for attempt in range(max_retries):
        try:
            return await client.create(*args, **kwargs)
        except RateLimitError as e:
            # 速率限制,指数退避
            wait_time = min(2 ** attempt, 60)
            logger.warning(f"Rate limit hit, waiting {wait_time}s")
            await asyncio.sleep(wait_time)
        except AuthenticationError as e:
            # 认证错误,不重试
            logger.error("Authentication failed")
            raise
        except APIConnectionError as e:
            # 连接错误,重试
            logger.warning(f"Connection error: {e}, attempt {attempt + 1}/{max_retries}")
            await asyncio.sleep(2)
    
    raise Exception(f"Failed after {max_retries} retries")
```

---

## 安全设计

### API密钥管理

#### 最佳实践

1. **永不硬编码**: API密钥不应出现在代码中
2. **环境变量**: 推荐使用环境变量存储
3. **配置文件**: 配置文件应在`.gitignore`中
4. **密钥轮换**: 支持定期更换API密钥

#### 实现

```python
# .env.example
ZHIPUAI_API_KEY=your-zhipuai-api-key-here
OPENAI_API_KEY=your-openai-api-key-here

# .gitignore
.env
config.yaml
```

### 输入验证

#### URL验证

```python
from urllib.parse import urlparse

def validate_base_url(url: str) -> bool:
    """验证base_url格式"""
    try:
        result = urlparse(url)
        return all([result.scheme, result.netloc]) and result.scheme in ["http", "https"]
    except Exception:
        return False
```

#### 模型名称验证

```python
ALLOWED_MODELS = [
    "glm-4.6", "glm-4.5-air", "glm-4-flash", "glm-4.5v",
    "gpt-4.1-2025-04-14", "gpt-4o-2024-08-06", ...
]

def validate_model_name(model: str) -> bool:
    """验证模型名称"""
    return model in ALLOWED_MODELS
```

### 日志脱敏

```python
import re

def sanitize_log(message: str) -> str:
    """脱敏日志消息"""
    # 移除API密钥
    message = re.sub(
        r'(api_key["\s:=]+)([a-zA-Z0-9_-]+)',
        r'\1***REDACTED***',
        message
    )
    return message

# 使用
logger.info(sanitize_log(f"Config: {config}"))
```

---

## 性能优化

### 连接复用

```python
from openai import OpenAI

class ClientPool:
    """客户端连接池"""
    def __init__(self):
        self._clients: Dict[str, OpenAI] = {}
    
    def get_client(self, base_url: str, api_key: str) -> OpenAI:
        """获取或创建客户端"""
        key = f"{base_url}:{hash(api_key)}"
        if key not in self._clients:
            self._clients[key] = OpenAI(
                api_key=api_key,
                base_url=base_url
            )
        return self._clients[key]
```

### 缓存机制

```python
from functools import lru_cache
from typing import Dict, Any

@lru_cache(maxsize=128)
def get_model_info(model: str) -> Dict[str, Any]:
    """缓存模型信息查询"""
    presets = ZhipuAIConfig.get_model_presets()
    return presets.get(model, {})
```

---

## 测试策略

### 单元测试

```python
# tests/test_zhipuai_config.py
import pytest
from magentic_ui.providers.zhipuai_config import ZhipuAIConfig

class TestZhipuAIConfig:
    def test_create_client_config(self):
        """测试创建客户端配置"""
        config = ZhipuAIConfig.create_client_config(
            model="glm-4.6",
            api_key="test_key"
        )
        assert config["provider"] == "OpenAIChatCompletionClient"
        assert config["config"]["model"] == "glm-4.6"
        assert config["config"]["base_url"] == ZhipuAIConfig.DEFAULT_BASE_URL
    
    def test_is_zhipuai_url(self):
        """测试URL检测"""
        assert ZhipuAIConfig.is_zhipuai_url("https://open.bigmodel.cn/api/paas/v4/")
        assert not ZhipuAIConfig.is_zhipuai_url("https://api.openai.com/v1")
    
    def test_validate_config(self):
        """测试配置验证"""
        valid_config = {
            "provider": "OpenAIChatCompletionClient",
            "config": {
                "model": "glm-4.6",
                "api_key": "test_key",
                "base_url": ZhipuAIConfig.DEFAULT_BASE_URL
            }
        }
        errors = ZhipuAIConfig.validate_config(valid_config)
        assert len(errors) == 0
```

### 集成测试

```python
# tests/test_zhipuai_integration.py
import pytest
from magentic_ui.task_team import TaskTeam
from magentic_ui.magentic_ui_config import MagenticUIConfig, ModelClientConfigs

@pytest.mark.asyncio
async def test_zhipuai_task_team():
    """测试使用智谱AI的任务团队"""
    config = MagenticUIConfig(
        model_client_configs=ModelClientConfigs(
            orchestrator={
                "provider": "OpenAIChatCompletionClient",
                "config": {
                    "model": "glm-4.6",
                    "base_url": "https://open.bigmodel.cn/api/paas/v4/"
                }
            }
        )
    )
    
    team = TaskTeam(config=config)
    # 测试任务执行...
```

---

## 部署考虑

### 环境变量设置

```bash
# .env
ZHIPUAI_API_KEY=your-zhipuai-api-key
OPENAI_API_KEY=your-openai-api-key  # 可选,作为后备
```

### Docker配置

```dockerfile
# docker-compose.yml
services:
  magentic-ui:
    environment:
      - ZHIPUAI_API_KEY=${ZHIPUAI_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
```

### 配置文件模板

```yaml
# config.template.yaml
model_client_configs:
  orchestrator:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4.6
      api_key: ${ZHIPUAI_API_KEY}
      base_url: https://open.bigmodel.cn/api/paas/v4/
      max_retries: 10
```

---

**文档签名**: ssiagu  
**最后更新**: 2025-10-21
