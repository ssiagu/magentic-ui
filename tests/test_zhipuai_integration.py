"""智谱AI集成测试

测试智谱AI配置在实际场景中的集成,包括:
- YAML配置加载
- 环境变量优先级
- 混合使用OpenAI和智谱AI
- 配置文件解析
"""

import os
import pytest
import yaml
from pathlib import Path
from unittest.mock import patch, MagicMock
from magentic_ui.magentic_ui_config import MagenticUIConfig, ModelClientConfigs
from magentic_ui.providers import ZhipuAIConfig


class TestZhipuAIYAMLConfig:
    """测试从YAML配置文件加载智谱AI配置"""

    def test_load_simple_zhipuai_config(self, tmp_path):
        """测试加载简单的智谱AI配置"""
        config_content = """
model_client_configs:
  orchestrator:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4.6
      base_url: https://open.bigmodel.cn/api/paas/v4/
      api_key: test_key
      max_retries: 10
"""
        # 创建临时配置文件
        config_file = tmp_path / "test_config.yaml"
        config_file.write_text(config_content)

        # 加载配置
        with open(config_file, "r") as f:
            config_dict = yaml.safe_load(f)

        # 验证配置内容
        orch_config = config_dict["model_client_configs"]["orchestrator"]
        assert orch_config["provider"] == "OpenAIChatCompletionClient"
        assert orch_config["config"]["model"] == "glm-4.6"
        assert (
            orch_config["config"]["base_url"]
            == "https://open.bigmodel.cn/api/paas/v4/"
        )
        assert orch_config["config"]["max_retries"] == 10

    def test_load_full_zhipuai_config_with_anchors(self, tmp_path):
        """测试加载使用YAML锚点的完整智谱AI配置"""
        config_content = """
zhipuai_client: &zhipuai_client
  provider: OpenAIChatCompletionClient
  config:
    base_url: https://open.bigmodel.cn/api/paas/v4/
    api_key: test_key
    max_retries: 10

model_client_configs:
  orchestrator:
    <<: *zhipuai_client
    config:
      <<: *zhipuai_client.config
      model: glm-4.6
      temperature: 0.7
      max_tokens: 6000
  
  web_surfer:
    <<: *zhipuai_client
    config:
      <<: *zhipuai_client.config
      model: glm-4.6
      temperature: 0.5
  
  coder:
    <<: *zhipuai_client
    config:
      <<: *zhipuai_client.config
      model: glm-4.6
      temperature: 0.3
      max_tokens: 8000
"""
        config_file = tmp_path / "test_config.yaml"
        config_file.write_text(config_content)

        with open(config_file, "r") as f:
            config_dict = yaml.safe_load(f)

        # 验证orchestrator配置
        orch = config_dict["model_client_configs"]["orchestrator"]
        assert orch["config"]["model"] == "glm-4.6"
        assert orch["config"]["temperature"] == 0.7
        assert orch["config"]["max_tokens"] == 6000

        # 验证coder配置
        coder = config_dict["model_client_configs"]["coder"]
        assert coder["config"]["temperature"] == 0.3
        assert coder["config"]["max_tokens"] == 8000

    def test_load_mixed_openai_zhipuai_config(self, tmp_path):
        """测试加载混合OpenAI和智谱AI的配置"""
        config_content = """
model_client_configs:
  orchestrator:
    provider: OpenAIChatCompletionClient
    config:
      model: gpt-4o-2024-08-06
      api_key: openai_key
  
  web_surfer:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4.6
      base_url: https://open.bigmodel.cn/api/paas/v4/
      api_key: zhipuai_key
  
  coder:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4.6
      base_url: https://open.bigmodel.cn/api/paas/v4/
      api_key: zhipuai_key
"""
        config_file = tmp_path / "test_config.yaml"
        config_file.write_text(config_content)

        with open(config_file, "r") as f:
            config_dict = yaml.safe_load(f)

        configs = config_dict["model_client_configs"]

        # 验证orchestrator使用OpenAI
        assert configs["orchestrator"]["config"]["model"] == "gpt-4o-2024-08-06"
        assert "base_url" not in configs["orchestrator"]["config"]

        # 验证web_surfer使用智谱AI
        assert configs["web_surfer"]["config"]["model"] == "glm-4.6"
        assert ZhipuAIConfig.is_zhipuai_url(
            configs["web_surfer"]["config"]["base_url"]
        )

        # 验证coder使用智谱AI
        assert configs["coder"]["config"]["model"] == "glm-4.6"
        assert ZhipuAIConfig.is_zhipuai_url(configs["coder"]["config"]["base_url"])


class TestZhipuAIEnvironmentVariables:
    """测试智谱AI环境变量配置"""

    def test_zhipuai_api_key_priority(self):
        """测试ZHIPUAI_API_KEY优先级高于OPENAI_API_KEY"""
        with patch.dict(
            os.environ,
            {
                "ZHIPUAI_API_KEY": "zhipuai_priority_key",
                "OPENAI_API_KEY": "openai_fallback_key",
            },
        ):
            api_key = ZhipuAIConfig.get_api_key()
            assert api_key == "zhipuai_priority_key"

    def test_openai_base_url_detection(self):
        """测试OPENAI_BASE_URL指向智谱AI时的检测"""
        zhipuai_url = "https://open.bigmodel.cn/api/paas/v4/"

        with patch.dict(os.environ, {"OPENAI_BASE_URL": zhipuai_url}):
            assert ZhipuAIConfig.is_zhipuai_url(os.environ.get("OPENAI_BASE_URL"))

    def test_environment_variable_interpolation(self, tmp_path):
        """测试YAML配置中环境变量插值"""
        # 注意: 实际的环境变量插值需要在应用层处理
        # 这里测试配置文件中使用${VAR}语法的情况

        config_content = """
model_client_configs:
  orchestrator:
    provider: OpenAIChatCompletionClient
    config:
      model: glm-4.6
      base_url: https://open.bigmodel.cn/api/paas/v4/
      api_key: ${ZHIPUAI_API_KEY}
"""
        config_file = tmp_path / "test_config.yaml"
        config_file.write_text(config_content)

        with open(config_file, "r") as f:
            config_dict = yaml.safe_load(f)

        # 验证配置中包含环境变量引用
        api_key_value = config_dict["model_client_configs"]["orchestrator"]["config"][
            "api_key"
        ]
        assert "${ZHIPUAI_API_KEY}" in str(api_key_value)


class TestZhipuAIMagenticUIConfig:
    """测试智谱AI与MagenticUIConfig的集成"""

    def test_create_magentic_ui_config_with_zhipuai(self):
        """测试创建包含智谱AI配置的MagenticUIConfig"""
        config = MagenticUIConfig(
            model_client_configs=ModelClientConfigs(
                orchestrator={
                    "provider": "OpenAIChatCompletionClient",
                    "config": {
                        "model": "glm-4.6",
                        "base_url": "https://open.bigmodel.cn/api/paas/v4/",
                        "api_key": "test_key",
                    },
                }
            )
        )

        assert config.model_client_configs.orchestrator is not None

    def test_magentic_ui_config_with_mixed_providers(self):
        """测试混合使用OpenAI和智谱AI的MagenticUIConfig"""
        config = MagenticUIConfig(
            model_client_configs=ModelClientConfigs(
                orchestrator={
                    "provider": "OpenAIChatCompletionClient",
                    "config": {"model": "gpt-4o-2024-08-06", "api_key": "openai_key"},
                },
                web_surfer={
                    "provider": "OpenAIChatCompletionClient",
                    "config": {
                        "model": "glm-4.6",
                        "base_url": "https://open.bigmodel.cn/api/paas/v4/",
                        "api_key": "zhipuai_key",
                    },
                },
                coder={
                    "provider": "OpenAIChatCompletionClient",
                    "config": {
                        "model": "glm-4.6",
                        "base_url": "https://open.bigmodel.cn/api/paas/v4/",
                        "api_key": "zhipuai_key",
                    },
                },
            )
        )

        # 验证配置创建成功
        assert config.model_client_configs.orchestrator is not None
        assert config.model_client_configs.web_surfer is not None
        assert config.model_client_configs.coder is not None


class TestZhipuAIConfigValidation:
    """测试智谱AI配置验证场景"""

    def test_validate_complete_agent_configs(self):
        """测试验证所有智能体的完整配置"""
        agents = ["orchestrator", "web_surfer", "coder", "file_surfer", "action_guard"]

        for agent in agents:
            config = ZhipuAIConfig.get_recommended_config_for_agent(agent)
            errors = ZhipuAIConfig.validate_config(config)

            # 所有推荐配置都应该是有效的(除了可能缺少API密钥)
            # 过滤掉API密钥相关的错误
            non_api_key_errors = [e for e in errors if "API key" not in e]
            assert len(non_api_key_errors) == 0

    def test_validate_config_with_all_parameters(self):
        """测试验证包含所有参数的配置"""
        config = {
            "provider": "OpenAIChatCompletionClient",
            "config": {
                "model": "glm-4.6",
                "api_key": "test_key",
                "base_url": "https://open.bigmodel.cn/api/paas/v4/",
                "max_retries": 10,
                "temperature": 0.7,
                "max_tokens": 6000,
                "timeout": 60,
            },
        }

        errors = ZhipuAIConfig.validate_config(config)
        assert len(errors) == 0


class TestZhipuAIRealWorldScenarios:
    """测试智谱AI在真实场景中的使用"""

    def test_chinese_content_scenario(self):
        """测试中文内容处理场景的配置"""
        # 为处理中文内容优化的配置
        config = ZhipuAIConfig.create_client_config(
            model="glm-4.6",
            temperature=0.7,  # 适中的创造性
            max_tokens=6000,
            api_key="test_key",
        )

        assert config["config"]["model"] == "glm-4.6"
        errors = ZhipuAIConfig.validate_config(config)
        assert len(errors) == 0

    def test_code_generation_scenario(self):
        """测试代码生成场景的配置"""
        # 为代码生成优化的配置
        config = ZhipuAIConfig.create_client_config(
            model="glm-4.6",
            temperature=0.3,  # 低温度,提高精确性
            max_tokens=8000,  # 较大token限制
            api_key="test_key",
        )

        assert config["config"]["temperature"] == 0.3
        assert config["config"]["max_tokens"] == 8000

    def test_cost_optimization_scenario(self):
        """测试成本优化场景的配置"""
        # 使用不同模型优化成本
        configs = {
            "orchestrator": ZhipuAIConfig.create_client_config(
                model="glm-4.6", api_key="test_key"
            ),
            "web_surfer": ZhipuAIConfig.create_client_config(
                model="glm-4.5-air", api_key="test_key"
            ),
            "coder": ZhipuAIConfig.create_client_config(
                model="glm-4.6", api_key="test_key"
            ),
            "file_surfer": ZhipuAIConfig.create_client_config(
                model="glm-4-flash", api_key="test_key"
            ),
            "action_guard": ZhipuAIConfig.create_client_config(
                model="glm-4-flash", api_key="test_key"
            ),
        }

        # 验证核心任务使用高性能模型
        assert configs["orchestrator"]["config"]["model"] == "glm-4.6"
        assert configs["coder"]["config"]["model"] == "glm-4.6"

        # 验证辅助任务使用轻量级模型
        assert configs["web_surfer"]["config"]["model"] == "glm-4.5-air"
        assert configs["file_surfer"]["config"]["model"] == "glm-4-flash"
        assert configs["action_guard"]["config"]["model"] == "glm-4-flash"

    def test_vision_task_scenario(self):
        """测试视觉任务场景的配置"""
        config = ZhipuAIConfig.create_client_config(
            model="glm-4.5v",  # 视觉模型
            temperature=0.5,
            api_key="test_key",
        )

        assert config["config"]["model"] == "glm-4.5v"

        # 验证glm-4.5v支持视觉
        model_info = ZhipuAIConfig.get_model_info("glm-4.5v")
        assert model_info["supports_vision"] is True


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
