"""智谱AI配置辅助模块

提供智谱AI模型配置的创建、验证和管理功能。
智谱AI完全兼容OpenAI API,因此可以使用OpenAIChatCompletionClient。

示例:
    >>> from magentic_ui.providers import ZhipuAIConfig
    >>> config = ZhipuAIConfig.create_client_config(model="glm-4.6")
    >>> print(config)
    {
        'provider': 'OpenAIChatCompletionClient',
        'config': {
            'model': 'glm-4.6',
            'base_url': 'https://open.bigmodel.cn/api/paas/v4/',
            ...
        }
    }
"""

import os
from dataclasses import dataclass
from typing import Any, Dict, List, Optional


@dataclass
class ModelPreset:
    """模型预设配置
    
    Attributes:
        name: 模型名称
        description: 模型描述
        max_tokens: 最大token数
        temperature: 默认温度参数
        supports_vision: 是否支持视觉理解
        supports_function_calling: 是否支持函数调用
    """
    name: str
    description: str
    max_tokens: int
    temperature: float
    supports_vision: bool = False
    supports_function_calling: bool = True


class ZhipuAIConfig:
    """智谱AI配置管理器
    
    提供智谱AI模型配置的创建、验证和管理功能。
    智谱AI完全兼容OpenAI API,因此使用OpenAIChatCompletionClient。
    
    主要功能:
        - 创建智谱AI客户端配置
        - 获取模型预设信息
        - 验证配置有效性
        - 为不同智能体提供推荐配置
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
        2. OPENAI_API_KEY 环境变量 (作为后备)
        
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
        max_tokens: Optional[int] = None,
        timeout: Optional[int] = None
    ) -> Dict[str, Any]:
        """创建智谱AI客户端配置
        
        Args:
            model: 模型名称,默认"glm-4.6"
            api_key: API密钥,如果为None则从环境变量获取
            base_url: API端点,如果为None则使用默认值
            max_retries: 最大重试次数,默认10
            temperature: 温度参数,如果为None则使用预设值
            max_tokens: 最大token数,如果为None则使用预设值
            timeout: 超时时间(秒),可选
            
        Returns:
            符合AutoGen规范的客户端配置字典
            
        Example:
            >>> config = ZhipuAIConfig.create_client_config(
            ...     model="glm-4.6",
            ...     temperature=0.7
            ... )
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
        
        if timeout is not None:
            config["config"]["timeout"] = timeout
        
        return config
    
    @staticmethod
    def get_model_presets() -> Dict[str, Dict[str, Any]]:
        """获取智谱AI模型预设配置
        
        Returns:
            模型预设字典,键为模型名称,值为预设配置
            
        Example:
            >>> presets = ZhipuAIConfig.get_model_presets()
            >>> print(presets["glm-4.6"]["description"])
            最强性能模型,适合复杂推理任务
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
            
        Example:
            >>> ZhipuAIConfig.is_zhipuai_url("https://open.bigmodel.cn/api/paas/v4/")
            True
            >>> ZhipuAIConfig.is_zhipuai_url("https://api.openai.com/v1")
            False
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
            
        Example:
            >>> config = ZhipuAIConfig.create_client_config("glm-4.6")
            >>> errors = ZhipuAIConfig.validate_config(config)
            >>> print(len(errors))
            0
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
        base_url = cfg.get("base_url")
        if base_url and not ZhipuAIConfig.is_zhipuai_url(base_url):
            errors.append(
                f"Invalid base_url: {base_url}. "
                f"Expected: {ZhipuAIConfig.DEFAULT_BASE_URL}"
            )
        
        return errors
    
    @staticmethod
    def get_recommended_config_for_agent(agent_type: str) -> Dict[str, Any]:
        """获取智能体推荐的智谱AI配置
        
        根据不同智能体的特点推荐最适合的模型和参数配置。
        
        Args:
            agent_type: 智能体类型 (orchestrator, web_surfer, coder, file_surfer, action_guard)
            
        Returns:
            推荐的配置字典
            
        Example:
            >>> config = ZhipuAIConfig.get_recommended_config_for_agent("coder")
            >>> print(config["config"]["model"])
            glm-4.6
            >>> print(config["config"]["temperature"])
            0.3
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
    
    @staticmethod
    def get_model_info(model: str) -> Optional[Dict[str, Any]]:
        """获取指定模型的详细信息
        
        Args:
            model: 模型名称
            
        Returns:
            模型信息字典,如果模型不存在则返回None
            
        Example:
            >>> info = ZhipuAIConfig.get_model_info("glm-4.6")
            >>> print(info["description"])
            最强性能模型,适合复杂推理任务
        """
        presets = ZhipuAIConfig.get_model_presets()
        return presets.get(model)
