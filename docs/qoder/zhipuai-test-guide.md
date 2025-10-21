# 智谱AI集成测试指南

**文档版本**: v1.0  
**创建日期**: 2025-10-21  
**作者**: ssiagu  

本文档提供智谱AI集成测试的完整指南,包括单元测试、集成测试和手动测试。

---

## 📋 目录

1. [测试概述](#测试概述)
2. [环境准备](#环境准备)
3. [单元测试](#单元测试)
4. [集成测试](#集成测试)
5. [手动测试](#手动测试)
6. [测试结果](#测试结果)

---

## 测试概述

### 测试文件

| 文件 | 类型 | 测试内容 |
|------|------|---------|
| `tests/test_zhipuai_config.py` | 单元测试 | ZhipuAIConfig类的各项功能 |
| `tests/test_zhipuai_integration.py` | 集成测试 | YAML配置、环境变量、实际场景 |

### 测试覆盖

- ✅ 配置创建和验证
- ✅ 环境变量处理
- ✅ YAML配置加载
- ✅ 模型预设功能
- ✅ URL检测
- ✅ 推荐配置
- ✅ 真实使用场景

---

## 环境准备

### 1. 安装测试依赖

```bash
# 激活虚拟环境
source .venv/bin/activate

# 安装pytest和相关依赖
pip install pytest pytest-asyncio pytest-mock
```

### 2. 设置环境变量(可选)

```bash
# 如果要测试实际API调用
export ZHIPUAI_API_KEY=your-zhipuai-api-key
export OPENAI_API_KEY=your-openai-api-key
```

---

## 单元测试

### 测试文件: `tests/test_zhipuai_config.py`

#### 测试类1: TestZhipuAIConfig

**测试内容**:
- API密钥获取(环境变量)
- 客户端配置创建
- 模型预设
- URL检测
- 配置验证
- 推荐配置
- 模型信息查询

#### 测试类2: TestZhipuAIConfigIntegration

**测试内容**:
- 完整配置创建工作流
- 所有智能体配置创建

### 运行单元测试

```bash
# 运行所有单元测试
pytest tests/test_zhipuai_config.py -v

# 运行特定测试
pytest tests/test_zhipuai_config.py::TestZhipuAIConfig::test_create_client_config_basic -v

# 显示详细输出
pytest tests/test_zhipuai_config.py -v -s

# 生成覆盖率报告
pytest tests/test_zhipuai_config.py --cov=magentic_ui.providers --cov-report=html
```

### 预期结果

```
tests/test_zhipuai_config.py::TestZhipuAIConfig::test_get_api_key_from_zhipuai_env PASSED
tests/test_zhipuai_config.py::TestZhipuAIConfig::test_get_api_key_fallback_to_openai PASSED
tests/test_zhipuai_config.py::TestZhipuAIConfig::test_get_api_key_priority PASSED
tests/test_zhipuai_config.py::TestZhipuAIConfig::test_create_client_config_basic PASSED
tests/test_zhipuai_config.py::TestZhipuAIConfig::test_create_client_config_with_preset PASSED
...
======================== XX passed in X.XXs ========================
```

---

## 集成测试

### 测试文件: `tests/test_zhipuai_integration.py`

#### 测试类1: TestZhipuAIYAMLConfig

**测试内容**:
- 简单YAML配置加载
- 使用YAML锚点的完整配置
- 混合OpenAI和智谱AI配置

#### 测试类2: TestZhipuAIEnvironmentVariables

**测试内容**:
- API密钥优先级
- Base URL检测
- 环境变量插值

#### 测试类3: TestZhipuAIMagenticUIConfig

**测试内容**:
- MagenticUIConfig集成
- 混合提供商配置

#### 测试类4: TestZhipuAIConfigValidation

**测试内容**:
- 完整配置验证
- 所有参数验证

#### 测试类5: TestZhipuAIRealWorldScenarios

**测试内容**:
- 中文内容处理场景
- 代码生成场景
- 成本优化场景
- 视觉任务场景

### 运行集成测试

```bash
# 运行所有集成测试
pytest tests/test_zhipuai_integration.py -v

# 运行特定测试类
pytest tests/test_zhipuai_integration.py::TestZhipuAIYAMLConfig -v

# 运行真实场景测试
pytest tests/test_zhipuai_integration.py::TestZhipuAIRealWorldScenarios -v
```

### 预期结果

```
tests/test_zhipuai_integration.py::TestZhipuAIYAMLConfig::test_load_simple_zhipuai_config PASSED
tests/test_zhipuai_integration.py::TestZhipuAIYAMLConfig::test_load_full_zhipuai_config_with_anchors PASSED
tests/test_zhipuai_integration.py::TestZhipuAIYAMLConfig::test_load_mixed_openai_zhipuai_config PASSED
...
======================== XX passed in X.XXs ========================
```

---

## 手动测试

### 测试清单

#### 1. 环境变量配置测试

**步骤**:
```bash
# 1. 设置智谱AI API Key
export ZHIPUAI_API_KEY=your-actual-api-key

# 2. 启动Magentic-UI
magentic-ui --port 8081

# 3. 检查日志
tail -f logs/magentic-ui.log
```

**验证点**:
- [ ] 启动无错误
- [ ] 日志显示使用智谱AI配置
- [ ] 可以正常访问UI

---

#### 2. UI配置测试

**步骤**:
1. 访问 `http://localhost:8081`
2. 点击右上角设置图标 ⚙️
3. 进入 "Agent Settings" 标签
4. 在 Provider 下拉框中选择 "OpenAI"
5. 在 Preset 下拉框中查看智谱AI预设

**验证点**:
- [ ] 可以看到 "ZhipuAI" 预设
- [ ] 可以看到 "glm-4.6" 预设
- [ ] 可以看到 "glm-4.5-air" 预设
- [ ] 可以看到 "glm-4-flash" 预设
- [ ] 可以看到 "glm-4.5v" 预设

**步骤**:
6. 选择 "glm-4.6" 预设
7. 展开配置面板
8. 检查自动填充的值

**验证点**:
- [ ] Model 字段显示 "glm-4.6"
- [ ] Base URL 显示 "https://open.bigmodel.cn/api/paas/v4/"
- [ ] Max Retries 显示 "10"

---

#### 3. 配置文件测试

**步骤**:
```bash
# 1. 创建配置文件
cat > config_zhipuai_test.yaml << EOF
model_client_configs:
  orchestrator:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4.6
      base_url: https://open.bigmodel.cn/api/paas/v4/
      api_key: \${ZHIPUAI_API_KEY}
      max_retries: 10
  
  web_surfer:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4.6
      base_url: https://open.bigmodel.cn/api/paas/v4/
      api_key: \${ZHIPUAI_API_KEY}
      max_retries: 10
EOF

# 2. 设置环境变量
export ZHIPUAI_API_KEY=your-actual-api-key

# 3. 使用配置文件启动
magentic-ui --port 8081 --config config_zhipuai_test.yaml
```

**验证点**:
- [ ] 启动成功
- [ ] 日志显示加载配置文件
- [ ] 配置正确应用

---

#### 4. 简单任务测试

**步骤**:
1. 在UI中输入简单任务: "请介绍一下智谱AI"
2. 启动任务执行
3. 观察执行过程

**验证点**:
- [ ] 任务开始执行
- [ ] 看到智能体对话
- [ ] 任务成功完成
- [ ] 返回结果正确

---

#### 5. 混合配置测试

**步骤**:
```bash
# 创建混合配置
cat > config_mixed_test.yaml << EOF
model_client_configs:
  orchestrator:
    provider: OpenAIChatCompletionClient
    config:
      model: gpt-4o-2024-08-06
      api_key: \${OPENAI_API_KEY}
  
  web_surfer:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4.6
      base_url: https://open.bigmodel.cn/api/paas/v4/
      api_key: \${ZHIPUAI_API_KEY}
  
  coder:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4.6
      base_url: https://open.bigmodel.cn/api/paas/v4/
      api_key: \${ZHIPUAI_API_KEY}
EOF

# 设置两个API Key
export OPENAI_API_KEY=your-openai-key
export ZHIPUAI_API_KEY=your-zhipuai-key

# 启动
magentic-ui --port 8081 --config config_mixed_test.yaml
```

**验证点**:
- [ ] 启动成功
- [ ] Orchestrator使用OpenAI
- [ ] Web Surfer使用智谱AI
- [ ] Coder使用智谱AI
- [ ] 任务可以正常执行

---

#### 6. 错误处理测试

**测试场景1: 无效API Key**

```bash
export ZHIPUAI_API_KEY=invalid_key
magentic-ui --port 8081
# 尝试执行任务
```

**验证点**:
- [ ] 显示认证错误
- [ ] 错误信息清晰
- [ ] 不会崩溃

**测试场景2: 错误的Base URL**

在UI中手动设置错误的base_url,观察错误提示

**验证点**:
- [ ] 配置验证失败
- [ ] 错误提示准确

**测试场景3: 速率限制**

如果触发API速率限制:

**验证点**:
- [ ] 自动重试
- [ ] 日志记录重试过程
- [ ] 最终成功或优雅失败

---

## 测试结果

### 单元测试结果模板

```
===================== test session starts =====================
platform linux -- Python 3.12.x, pytest-x.x.x
collected XX items

tests/test_zhipuai_config.py::TestZhipuAIConfig::test_get_api_key_from_zhipuai_env PASSED [ X%]
tests/test_zhipuai_config.py::TestZhipuAIConfig::test_get_api_key_fallback_to_openai PASSED [ X%]
...

===================== XX passed in X.XXs ======================

---------- coverage: platform linux, python 3.12.x -----------
Name                                      Stmts   Miss  Cover
-------------------------------------------------------------
magentic_ui/providers/__init__.py            2      0   100%
magentic_ui/providers/zhipuai_config.py    XXX      X    XX%
-------------------------------------------------------------
TOTAL                                      XXX      X    XX%
```

### 集成测试结果模板

```
===================== test session starts =====================
collected XX items

tests/test_zhipuai_integration.py::TestZhipuAIYAMLConfig::test_load_simple_zhipuai_config PASSED
tests/test_zhipuai_integration.py::TestZhipuAIYAMLConfig::test_load_full_zhipuai_config_with_anchors PASSED
...

===================== XX passed in X.XXs ======================
```

### 手动测试结果表

| 测试项 | 状态 | 备注 |
|--------|------|------|
| 环境变量配置 | ⏸️ 待测试 | |
| UI配置 | ⏸️ 待测试 | |
| 配置文件 | ⏸️ 待测试 | |
| 简单任务 | ⏸️ 待测试 | |
| 混合配置 | ⏸️ 待测试 | |
| 错误处理 | ⏸️ 待测试 | |

---

## 故障排查

### 常见问题

#### 1. 测试失败: "No module named 'magentic_ui.providers'"

**原因**: 未安装项目包

**解决**:
```bash
pip install -e .
```

#### 2. 测试失败: "API key not found"

**原因**: 环境变量未设置

**解决**:
```bash
export ZHIPUAI_API_KEY=your-key
```

#### 3. 集成测试超时

**原因**: 实际API调用可能很慢

**解决**:
```bash
pytest tests/test_zhipuai_integration.py -v --timeout=300
```

---

## 持续集成

### GitHub Actions配置示例

```yaml
# .github/workflows/test-zhipuai.yml
name: ZhipuAI Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.12'
    
    - name: Install dependencies
      run: |
        pip install -e .
        pip install pytest pytest-cov
    
    - name: Run unit tests
      run: |
        pytest tests/test_zhipuai_config.py -v --cov=magentic_ui.providers
    
    - name: Run integration tests
      run: |
        pytest tests/test_zhipuai_integration.py -v
```

---

## 总结

本测试指南提供了完整的测试流程:

1. **单元测试** - 验证ZhipuAIConfig类的所有功能
2. **集成测试** - 验证YAML配置、环境变量和实际场景
3. **手动测试** - 在实际环境中验证端到端功能

**测试覆盖率目标**: > 80%

**下一步**: 
1. 在实际环境中运行所有测试
2. 记录测试结果
3. 修复发现的问题
4. 更新文档

---

**文档签名**: ssiagu  
**最后更新**: 2025-10-21
