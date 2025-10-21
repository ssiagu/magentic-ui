# OpenAI API 兼容

智谱AI 提供与 OpenAI API 兼容的接口，这意味着您可以使用现有的 OpenAI SDK 代码，只需要简单修改 API 密钥和基础 URL，就能无缝切换到 智谱AI 的模型服务。这种兼容性让您能够：

* 快速迁移现有的 OpenAI 应用
* 使用熟悉的开发模式和工具
* 享受智谱AI 模型的强大能力
* 保持代码的一致性和可维护性

某些场景下智谱AI 与 OpenAI 接口仍存在差异，但不影响整体兼容性。

## 核心优势

### 零学习成本
如果您已经熟悉 OpenAI SDK，可以立即上手使用

### 快速迁移
现有 OpenAI 应用可以快速迁移到 智谱AI 平台

### 生态兼容
兼容 OpenAI 生态系统中的各种工具和框架

### 持续更新
跟随 OpenAI SDK 更新，保持最新功能支持

## 环境要求

### Python 版本
Python 3.7.1 或更高版本

### OpenAI SDK
OpenAI SDK 版本不低于 1.0.0

请确保使用 OpenAI SDK 1.0.0 或更高版本，旧版本可能存在兼容性问题。

## 安装 OpenAI SDK

### 使用 pip 安装

```bash
# 安装或升级到最新版本
pip install --upgrade 'openai>=1.0'

# 验证安装
python -c "import openai; print(openai.__version__)"
```

### 使用 poetry 安装

```bash
poetry add "openai>=1.0"
```

## 快速开始

### 获取 API Key

1. 访问 [智谱AI 开放平台](https://bigmodel.cn)
2. 注册并登录您的账户
3. 在 [API Keys](https://bigmodel.cn/usercenter/proj-mgmt/apikeys) 管理页面创建 API Key
4. 复制您的 API Key 以供使用

建议将 API Key 设置为环境变量：`export ZAI_API_KEY=your-api-key`

### 创建客户端

#### 基础配置
```python
from openai import OpenAI

# 创建智谱AI 客户端
client = OpenAI(
    api_key="your-zhipuai-api-key",
    base_url="https://open.bigmodel.cn/api/paas/v4/"
)
```

## 基础使用示例

### 简单对话

```python
from openai import OpenAI

client = OpenAI(
    api_key="your-zhipuai-api-key",
    base_url="https://open.bigmodel.cn/api/paas/v4/"
)

completion = client.chat.completions.create(
    model="glm-4.6",
    messages=[
        {"role": "system", "content": "你是一个聪明且富有创造力的小说作家"},
        {"role": "user", "content": "请你作为童话故事大王，写一篇短篇童话故事"}
    ],
    top_p=0.7,
    temperature=0.9
)

print(completion.choices[0].message.content)
```

### 流式响应

```python
stream = client.chat.completions.create(
    model="glm-4.6",
    messages=[
        {"role": "user", "content": "写一首关于人工智能的诗"}
    ],
    stream=True,
    temperature=0.8
)

for chunk in stream:
    if chunk.choices[0].delta.content is not None:
        print(chunk.choices[0].delta.content, end="", flush=True)

print()  # 换行
```

### 多轮对话

```python
class ChatBot:
    def __init__(self, api_key: str):
        self.client = OpenAI(
            api_key=api_key,
            base_url="https://open.bigmodel.cn/api/paas/v4/"
        )
        self.conversation = [
            {"role": "system", "content": "你是一个有用的 AI 助手"}
        ]

    def chat(self, user_input: str) -> str:
        # 添加用户消息
        self.conversation.append({"role": "user", "content": user_input})

        # 调用 API
        response = self.client.chat.completions.create(
            model="glm-4.6",
            messages=self.conversation,
            temperature=0.7
        )

        # 获取 AI 回复
        ai_response = response.choices[0].message.content

        # 添加到对话历史
        self.conversation.append({"role": "assistant", "content": ai_response})

        return ai_response

    def clear_history(self):
        """清除对话历史，保留系统提示"""
        self.conversation = self.conversation[:1]

# 使用示例
bot = ChatBot("your-api-key")
print(bot.chat("你好，请介绍一下自己"))
print(bot.chat("你能帮我写代码吗？"))
print(bot.chat("写一个 Python 的快速排序算法"))
```

## 高级功能

### 推理（thinking）

在思考模式下，GLM-4.5 和 GLM-4.5-Air 可以解决复杂的推理问题，包括数学、科学和逻辑问题。

```python
import os
from openai import OpenAI

client = OpenAI(api_key='your-api-key', base_url='https://open.bigmodel.cn/api/paas/v4')
response = client.chat.completions.create(
        model='glm-4.6',
        messages=[
            {"role": "system", "content": "you are a helpful assistant"},
            {"role": "user", "content": "what is the revolution of llm?"}
        ],
        stream=True,
        extra_body={
            "thinking": {
                "type": "enabled",
            },
        }
    )
for chunk in response:
    if chunk.choices[0].delta.reasoning_content:
        print(chunk.choices[0].delta.reasoning_content, end='')
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end='')
```

### 函数调用 (Function Calling)

```python
import json

def get_weather(location: str) -> str:
    """获取指定地点的天气信息"""
    # 这里应该调用真实的天气 API
    return f"{location} 的天气：晴天，温度 25°C"

# 定义函数描述
tools = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "获取指定地点的天气信息",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "地点名称，例如：北京、上海"
                    }
                },
                "required": ["location"]
            }
        }
    }
]

# 调用带函数的对话
response = client.chat.completions.create(
    model="glm-4.6",
    messages=[
        {"role": "user", "content": "北京今天天气怎么样？"}
    ],
    tools=tools,
    tool_choice="auto"
)

# 处理函数调用
message = response.choices[0].message
if message.tool_calls:
    for tool_call in message.tool_calls:
        if tool_call.function.name == "get_weather":
            args = json.loads(tool_call.function.arguments)
            result = get_weather(args["location"])
            print(f"函数调用结果: {result}")
```

### 图像理解

```python
import base64
from PIL import Image
import io

def encode_image(image_path: str) -> str:
    """将图像编码为 base64 字符串"""
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

# 图像理解示例
image_base64 = encode_image("path/to/your/image.jpg")

response = client.chat.completions.create(
    model="glm-4.5v",
    messages=[
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "请描述这张图片的内容"
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{image_base64}"
                    }
                }
            ]
        }
    ],
    temperature=0.7
)

print(response.choices[0].message.content)
```

## 参数配置

### 常用参数说明

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| model | string | 必填 | 要使用的模型名称 |
| messages | array | 必填 | 对话消息列表 |
| temperature | float | 0.6 | 控制输出的随机性 (0-1) |
| top_p | float | 0.95 | 核采样参数 (0-1) |
| max_tokens | integer | - | 最大输出 token 数 |
| stream | boolean | false | 是否使用流式输出 |
| stop | string/array | - | 停止生成的标记 |

注意：temperature 参数的区间为 (0,1)，do_sample = False (temperature = 0) 在 OpenAI 调用中并不适用。

## 实践建议

### 性能优化
* 使用连接池和会话复用
* 合理设置超时时间
* 实施异步调用处理高并发
* 缓存常用的响应结果

### 成本控制
* 合理设置 max_tokens 限制
* 使用合适的模型（不要过度使用强模型）
* 实施请求去重机制
* 监控 API 使用量

### 安全性
* 使用环境变量存储 API 密钥
* 实施输入验证和过滤
* 记录和监控 API 调用
* 定期轮换 API 密钥

### 可靠性
* 实施重试机制和错误处理
* 设置合理的超时时间
* 监控 API 状态和响应时间
* 准备降级方案

## 迁移指南

### 从 OpenAI 迁移

如果您已经在使用 OpenAI API，迁移到智谱AI 非常简单：

```python
# 原来的 OpenAI 代码
from openai import OpenAI

client = OpenAI(
    api_key="sk-...",  # OpenAI API Key
    # base_url 使用默认值
)

# 迁移到智谱AI，只需要修改两个地方
client = OpenAI(
    api_key="your-zhipuai-api-key",  # 替换为智谱AI API Key
    base_url="https://open.bigmodel.cn/api/paas/v4/"  # 添加智谱AI base_url
)

# 其他代码保持不变
response = client.chat.completions.create(
    model="glm-4.6",  # 使用智谱AI 模型
    messages=[{"role": "user", "content": "Hello!"}]
)
```

### 模型映射

| OpenAI 模型 | 智谱AI 对应模型 | 说明 |
| --- | --- | --- |
| gpt-5 | glm-4.6 | 最强性能模型 |
| gpt-4-turbo | glm-4.5-air | 平衡性能和成本 |
| gpt-4-vision | glm-4.5v | 视觉理解模型 |

## 错误处理

调用智谱AI API 时，可能会遇到各种错误。错误响应由 HTTP 状态码和业务错误码组成，提供了详细的错误信息。

### HTTP 状态错误码

| 状态码 | 原因 | 解决方法 |
| --- | --- | --- |
| 200 | 业务处理成功 | - |
| 400 | 参数错误 | 检查接口参数是否正确 |
| 400 | 文件内容异常 | 检查 jsonl 文件内容是否符合要求 |
| 401 | 鉴权失败或 Token 超时 | 确认 API KEY 和鉴权 token 是否正确生成 |
| 404 | 微调功能未开放 | 联系客服以开通此功能 |
| 404 | 微调任务不存在 | 确保微调任务 ID 正确 |
| 429 | 接口请求并发超额 | 调整请求频率或联系商务扩大并发数 |
| 429 | 上传文件频率过快 | 短暂等待后重新请求 |
| 429 | 账户余额已用完 | 进行账户充值以确保余额充足 |
| 429 | 账户异常 | 账户存违规行为，请联系平台客服或service@zhipuai.cn解除相关锁定 |
| 429 | 终端账号异常 | 终端用户存在违规行为，账号已被锁定 |
| 434 | 暂无 API 权限，微调 API 及文件管理 API 为内测阶段，我们会尽快开放 | 等待接口正式开放或请联系平台客服申请内测 |
| 435 | 文件大小超过 100MB | 使用小于 100MB 的 jsonl 文件或分批上传 |
| 500 | 服务器处理请求时发生错误 | 稍后重试或联系客服 |

### 业务错误码

| 错误分类 | 错误码 | 错误信息 |
| --- | --- | --- |
| 基础错误 | 500 | 内部错误 |
| 身份验证错误 | 1000 | 身份验证失败 |
| | 1001 | Header 中未收到 Authentication 参数，无法进行身份验证 |
| | 1002 | Authentication Token 非法，请确认 Authentication Token 正确传递 |
| | 1003 | Authentication Token 已过期，请重新生成/获取 |
| | 1004 | 通过 Authentication Token 的验证失败 |
| | 1100 | 账户读写 |
| 账户错误 | 1110 | 您的账户当前处于非活动状态。请检查账户信息 |
| | 1111 | 您的账户不存在 |
| | 1112 | 您的账户已被锁定，请联系客服解锁 |
| | 1113 | 您的账户已欠费，请充值后重试 |
| | 1120 | 无法成功访问您的账户，请稍后重试 |
| | 1121 | 账户存违规行为，账号已被锁定 |
| API 调用错误 | 1200 | API 调用错误 |
| | 1210 | API 调用参数有误，请检查文档 |
| | 1211 | 模型不存在，请检查模型代码 |
| | 1212 | 当前模型不支持 `${method}` 调用方式 |
| | 1213 | 未正常接收到 `${field}` 参数 |
| | 1214 | `${field}` 参数非法。请检查文档 |
| | 1215 | `${field1}` 与 `${field2}` 不能同时设置，请检查文档 |
| | 1220 | 您无权访问 `${API_name}` |
| | 1221 | API `${API_name}` 已下线 |
| | 1222 | API `${API_name}` 不存在 |
| | 1230 | API 调用流程出错 |
| | 1231 | 您已有请求：`${request_id}` |
| | 1234 | 网络错误，错误id：`${error_id}`，请联系客服 |
| API 策略阻止错误 | 1300 | API 调用被策略阻止 |
| | 1301 | 系统检测到输入或生成内容可能包含不安全或敏感内容，请您避免输入易产生敏感内容的提示语，感谢您的配合 |
| | 1302 | 您当前使用该 API 的并发数过高，请降低并发，或联系客服增加限额 |
| | 1303 | 您当前使用该 API 的频率过高，请降低频率，或联系客服增加限额 |
| | 1304 | 该 API 已达今日调用次数限额，如有更多需求，请联系客服购买 |
| | 1308 | 已达到 `${number}` `${unit}` 的使用上限。您的限额将在 `${next_flush_time}` 重置。 |
| | 1309 | 您的 GLM Coding Plan 套餐已到期，暂无法使用，前往官方续订后即可恢复 <https://bigmodel.cn/claude-code> |

### 错误响应示例

以下是 curl 请求的响应报文，其中 401 是 HTTP 状态码，1002 是业务错误码：

```bash
* We are completely uploaded and fine
< HTTP/2 401
< date: Wed, 20 Mar 2024 03:06:05 GMT
< content-type: application/json
< set-cookie: acw_tc=76b20****a0e42;path=/;HttpOnly;Max-Age=1800
< server: nginx/1.21.6
< vary: Origin
< vary: Access-Control-Request-Method
< vary: Access-Control-Request-Headers
<
* Connection #0 to host open.bigmodel.cn left intact
{"error":{"code":"1002","message":"Authorization Token非法，请确认Authorization Token正确传递。"}}
```

> **注：** 使用流式（SSE）调用时，如果 API 在推理过程中异常终止，不会返回上述错误码，而是在响应体的 `finish_reason` 参数中返回异常原因，详情请参考 `finish_reason` 的参数说明。

## 更多资源

### 智谱AI API 文档
查看智谱AI 完整的 API 文档：/cn/api/introduction

### OpenAI 官方文档
参考 OpenAI 官方文档了解更多用法：https://platform.openai.com/docs

智谱AI 致力于保持与 OpenAI API 的兼容性，如果您在迁移过程中遇到任何问题，请联系我们的技术支持团队。

---
**文档来源**: 智谱AI开放文档 (https://docs.bigmodel.cn/cn/guide/develop/openai/introduction, https://docs.bigmodel.cn/cn/faq/api-code)
**转换时间**: 2025-10-21
**转换工具**: markitdown