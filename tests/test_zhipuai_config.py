"""智谱AI配置模块单元测试

测试ZhipuAIConfig类的各项功能,包括:
- 配置创建
- 模型预设
- URL检测
- 配置验证
- 推荐配置
"""

import os
import pytest
from unittest.mock import patch
from magentic_ui.providers import ZhipuAIConfig


class TestZhipuAIConfig:
    """ZhipuAIConfig类的单元测试"""

    def test_get_api_key_from_zhipuai_env(self):
        """测试从ZHIPUAI_API_KEY环境变量获取API密钥"""
        with patch.dict(os.environ, {"ZHIPUAI_API_KEY": "test_zhipuai_key"}):
            api_key = ZhipuAIConfig.get_api_key()
            assert api_key == "test_zhipuai_key"

    def test_get_api_key_fallback_to_openai(self):
        """测试从OPENAI_API_KEY环境变量获取API密钥(后备方案)"""
        with patch.dict(os.environ, {"OPENAI_API_KEY": "test_openai_key"}, clear=True):
            api_key = ZhipuAIConfig.get_api_key()
            assert api_key == "test_openai_key"

    def test_get_api_key_priority(self):
        """测试API密钥获取优先级(ZHIPUAI_API_KEY > OPENAI_API_KEY)"""
        with patch.dict(
            os.environ,
            {
                "ZHIPUAI_API_KEY": "zhipuai_key",
                "OPENAI_API_KEY": "openai_key",
            },
        ):
            api_key = ZhipuAIConfig.get_api_key()
            assert api_key == "zhipuai_key"

    def test_create_client_config_basic(self):
        """测试创建基本客户端配置"""
        config = ZhipuAIConfig.create_client_config(
            model="glm-4.6", api_key="test_key"
        )

        assert config["provider"] == "OpenAIChatCompletionClient"
        assert config["config"]["model"] == "glm-4.6"
        assert config["config"]["api_key"] == "test_key"
        assert config["config"]["base_url"] == ZhipuAIConfig.DEFAULT_BASE_URL
        assert config["config"]["max_retries"] == 10

    def test_create_client_config_with_preset(self):
        """测试使用模型预设创建配置"""
        config = ZhipuAIConfig.create_client_config(
            model="glm-4.6", api_key="test_key"
        )

        # 验证预设的temperature和max_tokens
        assert config["config"]["temperature"] == 0.7
        assert config["config"]["max_tokens"] == 8000

    def test_create_client_config_custom_parameters(self):
        """测试使用自定义参数创建配置"""
        config = ZhipuAIConfig.create_client_config(
            model="glm-4.6",
            api_key="test_key",
            base_url="https://custom.url/",
            temperature=0.5,
            max_tokens=5000,
            max_retries=15,
            timeout=120,
        )

        assert config["config"]["base_url"] == "https://custom.url/"
        assert config["config"]["temperature"] == 0.5
        assert config["config"]["max_tokens"] == 5000
        assert config["config"]["max_retries"] == 15
        assert config["config"]["timeout"] == 120

    def test_get_model_presets(self):
        """测试获取模型预设"""
        presets = ZhipuAIConfig.get_model_presets()

        # 验证预设数量
        assert len(presets) == 4

        # 验证每个预设的存在性
        assert "glm-4.6" in presets
        assert "glm-4.5-air" in presets
        assert "glm-4-flash" in presets
        assert "glm-4.5v" in presets

        # 验证glm-4.6预设的内容
        glm46 = presets["glm-4.6"]
        assert glm46["description"] == "最强性能模型,适合复杂推理任务"
        assert glm46["max_tokens"] == 8000
        assert glm46["temperature"] == 0.7
        assert glm46["supports_vision"] is False
        assert glm46["supports_function_calling"] is True

        # 验证glm-4.5v支持视觉
        glm45v = presets["glm-4.5v"]
        assert glm45v["supports_vision"] is True

    def test_is_zhipuai_url(self):
        """测试智谱AI URL检测"""
        # 正确的智谱AI URL
        assert ZhipuAIConfig.is_zhipuai_url(
            "https://open.bigmodel.cn/api/paas/v4/"
        )
        assert ZhipuAIConfig.is_zhipuai_url("https://bigmodel.cn/api/")

        # OpenAI URL
        assert not ZhipuAIConfig.is_zhipuai_url("https://api.openai.com/v1")

        # None或空字符串
        assert not ZhipuAIConfig.is_zhipuai_url(None)
        assert not ZhipuAIConfig.is_zhipuai_url("")

    def test_validate_config_valid(self):
        """测试验证有效配置"""
        valid_config = {
            "provider": "OpenAIChatCompletionClient",
            "config": {
                "model": "glm-4.6",
                "api_key": "test_key",
                "base_url": ZhipuAIConfig.DEFAULT_BASE_URL,
            },
        }

        errors = ZhipuAIConfig.validate_config(valid_config)
        assert len(errors) == 0

    def test_validate_config_missing_config_field(self):
        """测试验证缺少config字段的配置"""
        invalid_config = {"provider": "OpenAIChatCompletionClient"}

        errors = ZhipuAIConfig.validate_config(invalid_config)
        assert len(errors) == 1
        assert "Missing 'config' field" in errors[0]

    def test_validate_config_missing_model(self):
        """测试验证缺少model的配置"""
        invalid_config = {
            "provider": "OpenAIChatCompletionClient",
            "config": {"api_key": "test_key"},
        }

        errors = ZhipuAIConfig.validate_config(invalid_config)
        assert len(errors) == 1
        assert "Missing 'model' field" in errors[0]

    def test_validate_config_missing_api_key(self):
        """测试验证缺少API密钥的配置"""
        with patch.dict(os.environ, {}, clear=True):
            invalid_config = {
                "provider": "OpenAIChatCompletionClient",
                "config": {"model": "glm-4.6"},
            }

            errors = ZhipuAIConfig.validate_config(invalid_config)
            assert any("API key not found" in error for error in errors)

    def test_validate_config_invalid_base_url(self):
        """测试验证无效的base_url"""
        invalid_config = {
            "provider": "OpenAIChatCompletionClient",
            "config": {
                "model": "glm-4.6",
                "api_key": "test_key",
                "base_url": "https://invalid.url/",
            },
        }

        errors = ZhipuAIConfig.validate_config(invalid_config)
        assert any("Invalid base_url" in error for error in errors)

    def test_get_recommended_config_for_orchestrator(self):
        """测试获取Orchestrator的推荐配置"""
        config = ZhipuAIConfig.get_recommended_config_for_agent("orchestrator")

        assert config["config"]["model"] == "glm-4.6"
        assert config["config"]["temperature"] == 0.7
        assert config["config"]["max_tokens"] == 6000

    def test_get_recommended_config_for_coder(self):
        """测试获取Coder的推荐配置"""
        config = ZhipuAIConfig.get_recommended_config_for_agent("coder")

        assert config["config"]["model"] == "glm-4.6"
        assert config["config"]["temperature"] == 0.3  # 低温度,提高代码精确性
        assert config["config"]["max_tokens"] == 8000  # 较大token限制

    def test_get_recommended_config_for_file_surfer(self):
        """测试获取File Surfer的推荐配置"""
        config = ZhipuAIConfig.get_recommended_config_for_agent("file_surfer")

        assert config["config"]["model"] == "glm-4.5-air"  # 使用平衡型模型
        assert config["config"]["temperature"] == 0.5
        assert config["config"]["max_tokens"] == 4000

    def test_get_recommended_config_for_action_guard(self):
        """测试获取Action Guard的推荐配置"""
        config = ZhipuAIConfig.get_recommended_config_for_agent("action_guard")

        assert config["config"]["model"] == "glm-4-flash"  # 使用快速模型
        assert config["config"]["temperature"] == 0.1  # 极低温度,确保一致性
        assert config["config"]["max_tokens"] == 2000

    def test_get_recommended_config_for_unknown_agent(self):
        """测试获取未知智能体的推荐配置(应返回默认值)"""
        config = ZhipuAIConfig.get_recommended_config_for_agent("unknown_agent")

        # 应该返回默认配置
        assert config["config"]["model"] == "glm-4.6"
        assert config["config"]["temperature"] == 0.7
        assert config["config"]["max_tokens"] == 6000

    def test_get_model_info_existing(self):
        """测试获取存在的模型信息"""
        info = ZhipuAIConfig.get_model_info("glm-4.6")

        assert info is not None
        assert info["description"] == "最强性能模型,适合复杂推理任务"
        assert info["max_tokens"] == 8000

    def test_get_model_info_non_existing(self):
        """测试获取不存在的模型信息"""
        info = ZhipuAIConfig.get_model_info("non-existing-model")
        assert info is None


class TestZhipuAIConfigIntegration:
    """ZhipuAIConfig集成测试"""

    def test_full_config_creation_workflow(self):
        """测试完整的配置创建工作流"""
        # 1. 设置环境变量
        with patch.dict(os.environ, {"ZHIPUAI_API_KEY": "integration_test_key"}):
            # 2. 创建配置
            config = ZhipuAIConfig.create_client_config(model="glm-4.6")

            # 3. 验证配置
            errors = ZhipuAIConfig.validate_config(config)
            assert len(errors) == 0

            # 4. 检查API密钥正确设置
            assert config["config"]["api_key"] == "integration_test_key"

    def test_all_agents_config_creation(self):
        """测试为所有智能体创建配置"""
        agents = ["orchestrator", "web_surfer", "coder", "file_surfer", "action_guard"]

        for agent in agents:
            config = ZhipuAIConfig.get_recommended_config_for_agent(agent)

            # 验证每个配置的有效性
            assert config["provider"] == "OpenAIChatCompletionClient"
            assert "model" in config["config"]
            assert "temperature" in config["config"]
            assert "max_tokens" in config["config"]
            assert config["config"]["base_url"] == ZhipuAIConfig.DEFAULT_BASE_URL


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
