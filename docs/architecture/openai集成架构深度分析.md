# OpenAI集成架构深度分析

### OpenAI客户端配置管理

#### 模型客户端配置层次结构
```python
# 默认配置优先级 (从低到高):
# 1. 系统默认配置
# 2. 配置文件设置
# 3. 用户界面设置
# 4. 运行时参数覆盖

class ModelClientConfigs(BaseModel):
    # 编排器模型 - 负责任务规划和智能体协调
    orchestrator: Optional[Union[ComponentModel, Dict[str, Any]]] = None

    # WebSurfer模型 - 负责Web浏览和页面分析
    web_surfer: Optional[Union[ComponentModel, Dict[str, Any]]] = None

    # Coder模型 - 负责代码生成和执行
    coder: Optional[Union[ComponentModel, Dict[str, Any]]] = None

    # FileSurfer模型 - 负责文件操作和分析
    file_surfer: Optional[Union[ComponentModel, Dict[str, Any]]] = None

    # ActionGuard模型 - 负责安全检查和动作验证
    action_guard: Optional[Union[ComponentModel, Dict[str, Any]]] = None

    # 系统默认配置
    default_client_config: ClassVar[Dict[str, Any]] = {
        "provider": "OpenAIChatCompletionClient",
        "config": {
            "model": "gpt-4.1-2025-04-14",  # 使用最新GPT-4版本
            "api_key": None,  # 从环境变量获取
            "organization": None,
            "timeout": 60,
            "max_retries": 10,
            "temperature": 0.7,
            "max_tokens": 4000,
        },
    }

    # 动作守卫使用更小的模型以节省成本
    default_action_guard_config: ClassVar[Dict[str, Any]] = {
        "provider": "OpenAIChatCompletionClient",
        "config": {
            "model": "gpt-4.1-nano-2025-04-14",  # 使用轻量级模型
            "api_key": None,
            "timeout": 30,
            "max_retries": 5,
            "temperature": 0.1,  # 低温度确保一致性
            "max_tokens": 1000,
        },
    }
```

#### 智能体特定的模型配置
```python
class WebSurferConfig(BaseModel):
    name: str = "web_surfer"
    model_client: Union[ComponentModel, Dict[str, Any]]
    browser: BrowserResourceConfig
    max_actions_per_step: int = 5
    multiple_tools_per_call: bool = False

    # WebSurfer特定的模型优化配置
    class Config:
        model_specific_prompts = {
            "system_prompt": """你是一个专业的Web浏览助手，能够：
            1. 分析网页内容和结构
            2. 执行复杂的页面交互操作
            3. 提取关键信息和数据
            4. 处理动态内容和JavaScript渲染
            5. 进行表单填写和提交

            请仔细分析用户需求，提供准确的网页操作建议。""",

            "analysis_prompt": """分析当前页面内容，确定：
            1. 页面主要内容和结构
            2. 可交互元素和操作选项
            3. 用户需求相关信息位置
            4. 下一步最佳操作建议""",

            "action_prompt": """基于页面分析，生成具体的操作步骤：
            1. 选择合适的操作类型
            2. 准确的元素定位器
            3. 操作参数设置
            4. 预期结果验证"""
        }

class CoderAgentConfig(BaseModel):
    name: str = "coder_agent"
    model_client: Union[ComponentModel, Dict[str, Any]]
    work_dir: str
    model_context_token_limit: int = 110000

    # Coder特定的模型配置
    class Config:
        model_specific_prompts = {
            "system_prompt": """你是一个专业的编程助手，擅长：
            1. 多语言代码生成（Python, JavaScript, TypeScript, SQL等）
            2. 代码调试和错误修复
            3. 代码优化和重构
            4. 测试用例编写
            5. 技术文档生成

            请生成高质量、可维护、符合最佳实践的代码。""",

            "generation_prompt": """根据需求生成代码：
            1. 分析需求规格
            2. 选择合适的编程语言和框架
            3. 设计代码结构和逻辑
            4. 编写完整可执行的代码
            5. 添加必要的注释和文档""",

            "debug_prompt": """分析和修复代码错误：
            1. 定位错误源头
            2. 分析错误原因
            3. 提供修复方案
            4. 验证修复效果
            5. 预防类似错误"""
        }
```

### OpenAI API调用生命周期

#### 请求处理流程
```python
class OpenAIClientManager:
    def __init__(self, config: ModelClientConfig):
        self.config = config
        self.client = self._create_client()
        self.rate_limiter = RateLimiter(config.rate_limits)
        self.cache = ResponseCache(config.cache_settings)
        self.metrics_collector = MetricsCollector()

    def _create_client(self) -> OpenAIChatCompletionClient:
        """创建OpenAI客户端实例"""
        client_config = self.config.config.copy()

        # 从环境变量获取API密钥
        if not client_config.get("api_key"):
            client_config["api_key"] = os.getenv("OPENAI_API_KEY")

        # 配置重试机制
        client_config.update({
            "max_retries": client_config.get("max_retries", 10),
            "timeout": client_config.get("timeout", 60),
        })

        return OpenAIChatCompletionClient(**client_config)

    async def generate_response(
        self,
        messages: List[Dict[str, Any]],
        agent_type: str,
        **kwargs
    ) -> str:
        """生成AI响应的完整流程"""
        request_id = str(uuid.uuid4())
        start_time = time.time()

        try:
            # 1. 检查缓存
            cache_key = self._generate_cache_key(messages, agent_type, kwargs)
            cached_response = await self.cache.get(cache_key)
            if cached_response:
                await self.metrics_collector.record_cache_hit(request_id, agent_type)
                return cached_response

            # 2. 应用速率限制
            await self.rate_limiter.acquire(agent_type)

            # 3. 预处理消息
            processed_messages = await self._preprocess_messages(
                messages, agent_type, **kwargs
            )

            # 4. 调用OpenAI API
            response = await self._call_openai_api(
                processed_messages,
                agent_type,
                request_id=request_id
            )

            # 5. 后处理响应
            processed_response = await self._postprocess_response(
                response, agent_type, **kwargs
            )

            # 6. 缓存响应
            await self.cache.set(cache_key, processed_response, ttl=3600)

            # 7. 记录指标
            duration = time.time() - start_time
            await self.metrics_collector.record_request(
                request_id=request_id,
                agent_type=agent_type,
                duration=duration,
                token_usage=response.usage.model_dump() if response.usage else None,
                success=True
            )

            return processed_response

        except Exception as e:
            # 错误处理和指标记录
            duration = time.time() - start_time
            await self.metrics_collector.record_request(
                request_id=request_id,
                agent_type=agent_type,
                duration=duration,
                error=str(e),
                success=False
            )

            logger.error(
                f"OpenAI API call failed for {agent_type}",
                extra={
                    "request_id": request_id,
                    "agent_type": agent_type,
                    "error": str(e),
                    "duration": duration
                }
            )

            raise OpenAIApiException(f"API call failed: {str(e)}")

    async def _call_openai_api(
        self,
        messages: List[Dict[str, Any]],
        agent_type: str,
        request_id: str
    ) -> ChatCompletion:
        """实际调用OpenAI API"""

        # 根据智能体类型优化参数
        api_params = self._get_optimized_params(agent_type)

        # 添加请求追踪信息
        api_params.update({
            "messages": messages,
            "user": request_id,  # 用于OpenAI的监控和滥用检测
            "stream": False,  # 目前使用非流式响应
        })

        # 执行API调用
        response = await self.client.create(**api_params)

        # 验证响应质量
        self._validate_response(response, agent_type)

        return response

    def _get_optimized_params(self, agent_type: str) -> Dict[str, Any]:
        """根据智能体类型获取优化的API参数"""
        base_params = self.config.config.copy()

        agent_specific_configs = {
            "web_surfer": {
                "temperature": 0.3,  # 较低温度确保操作准确性
                "max_tokens": 2000,  # 适中的token限制
                "top_p": 0.9,
                "frequency_penalty": 0.1,
                "presence_penalty": 0.1,
            },
            "coder": {
                "temperature": 0.2,  # 低温度确保代码准确性
                "max_tokens": 4000,  # 较高token限制支持代码生成
                "top_p": 0.95,
                "frequency_penalty": 0.2,  # 减少代码重复
                "presence_penalty": 0.1,
            },
            "file_surfer": {
                "temperature": 0.4,
                "max_tokens": 1500,
                "top_p": 0.9,
                "frequency_penalty": 0.1,
                "presence_penalty": 0.1,
            },
            "orchestrator": {
                "temperature": 0.5,  # 中等温度支持创造性规划
                "max_tokens": 3000,
                "top_p": 0.9,
                "frequency_penalty": 0.1,
                "presence_penalty": 0.2,
            },
            "action_guard": {
                "temperature": 0.1,  # 极低温度确保安全检查一致性
                "max_tokens": 1000,
                "top_p": 0.8,
                "frequency_penalty": 0.0,
                "presence_penalty": 0.0,
            }
        }

        if agent_type in agent_specific_configs:
            base_params.update(agent_specific_configs[agent_type])

        return base_params
```

### 请求缓存和速率限制

#### 智能缓存策略
```python
class ResponseCache:
    def __init__(self, config: Dict[str, Any]):
        self.redis_client = redis.Redis(
            host=config.get("redis_host", "localhost"),
            port=config.get("redis_port", 6379),
            db=config.get("redis_db", 0),
            decode_responses=True
        )
        self.default_ttl = config.get("default_ttl", 3600)

    async def get(self, cache_key: str) -> Optional[str]:
        """获取缓存响应"""
        try:
            cached_data = await self.redis_client.get(cache_key)
            if cached_data:
                # 解析JSON数据
                response_data = json.loads(cached_data)

                # 检查缓存是否过期
                if self._is_cache_valid(response_data):
                    logger.info(f"Cache hit for key: {cache_key}")
                    return response_data["response"]
                else:
                    # 删除过期缓存
                    await self.redis_client.delete(cache_key)

            return None

        except Exception as e:
            logger.warning(f"Cache retrieval failed: {e}")
            return None

    async def set(
        self,
        cache_key: str,
        response: str,
        ttl: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> bool:
        """设置缓存响应"""
        try:
            cache_data = {
                "response": response,
                "timestamp": time.time(),
                "ttl": ttl or self.default_ttl,
                "metadata": metadata or {}
            }

            await self.redis_client.setex(
                cache_key,
                ttl or self.default_ttl,
                json.dumps(cache_data)
            )

            logger.info(f"Cache set for key: {cache_key}, TTL: {ttl}")
            return True

        except Exception as e:
            logger.warning(f"Cache set failed: {e}")
            return False

    def _generate_cache_key(
        self,
        messages: List[Dict[str, Any]],
        agent_type: str,
        **kwargs
    ) -> str:
        """生成缓存键"""
        # 创建消息的标准化表示
        normalized_messages = [
            {
                "role": msg["role"],
                "content": msg["content"][:500]  # 限制内容长度避免键过长
            }
            for msg in messages
        ]

        # 包含影响响应的关键参数
        key_data = {
            "messages": normalized_messages,
            "agent_type": agent_type,
            "temperature": kwargs.get("temperature"),
            "max_tokens": kwargs.get("max_tokens"),
            "model": self.config.config.get("model")
        }

        # 生成哈希
        key_string = json.dumps(key_data, sort_keys=True)
        return hashlib.md5(key_string.encode()).hexdigest()

class RateLimiter:
    def __init__(self, config: Dict[str, Any]):
        self.limits = config.get("limits", {})
        self.redis_client = redis.Redis()

    async def acquire(self, agent_type: str) -> None:
        """获取API调用许可"""
        limits = self.limits.get(agent_type, self.limits.get("default", {}))

        if not limits:
            return

        current_time = int(time.time())
        window_start = current_time - 60  # 1分钟窗口

        # 检查速率限制
        key = f"rate_limit:{agent_type}:{window_start // 60}"
        current_count = await self.redis_client.get(key) or 0

        if int(current_count) >= limits.get("requests_per_minute", 100):
            wait_time = 60 - (current_time % 60)
            raise RateLimitException(
                f"Rate limit exceeded for {agent_type}. "
                f"Please wait {wait_time} seconds."
            )

        # 增加计数器
        await self.redis_client.incr(key)
        await self.redis_client.expire(key, 60)
```

### 成本优化和监控

#### Token使用优化
```python
class TokenOptimizer:
    def __init__(self):
        self.usage_stats = defaultdict(lambda: {
            "total_tokens": 0,
            "prompt_tokens": 0,
            "completion_tokens": 0,
            "cost": 0.0,
            "requests": 0
        })

    async def optimize_messages(
        self,
        messages: List[Dict[str, Any]],
        agent_type: str,
        max_context_length: int = 8000
    ) -> List[Dict[str, Any]]:
        """优化消息以减少token使用"""

        # 1. 计算当前token使用量
        current_tokens = self._estimate_tokens(messages)

        if current_tokens <= max_context_length:
            return messages

        # 2. 应用优化策略
        optimized_messages = []
        tokens_used = 0

        # 保留系统消息
        for msg in messages:
            if msg["role"] == "system":
                optimized_messages.append(msg)
                tokens_used += self._estimate_tokens([msg])

        # 保留最近的对话历史
        for msg in reversed(messages):
            if msg["role"] != "system":
                msg_tokens = self._estimate_tokens([msg])
                if tokens_used + msg_tokens <= max_context_length:
                    optimized_messages.insert(1, msg)  # 系统消息后插入
                    tokens_used += msg_tokens
                else:
                    break

        # 3. 如果仍然超出限制，进一步压缩内容
        if tokens_used > max_context_length:
            optimized_messages = self._compress_messages(
                optimized_messages, max_context_length
            )

        logger.info(
            f"Token optimization: {current_tokens} -> {tokens_used} tokens "
            f"for {agent_type}"
        )

        return optimized_messages

    def _estimate_tokens(self, messages: List[Dict[str, Any]]) -> int:
        """估算消息的token数量"""
        # 使用简单的启发式方法：1 token ≈ 4 字符
        total_chars = sum(len(msg["content"]) for msg in messages)
        return total_chars // 4

    async def track_usage(
        self,
        agent_type: str,
        usage: Dict[str, int],
        model: str
    ) -> None:
        """跟踪token使用情况和成本"""
        stats = self.usage_stats[agent_type]

        stats["prompt_tokens"] += usage.get("prompt_tokens", 0)
        stats["completion_tokens"] += usage.get("completion_tokens", 0)
        stats["total_tokens"] += usage.get("total_tokens", 0)
        stats["requests"] += 1

        # 计算成本（基于GPT-4定价）
        cost_per_1k_prompt = 0.03  # $0.03 per 1K prompt tokens
        cost_per_1k_completion = 0.06  # $0.06 per 1K completion tokens

        prompt_cost = (usage.get("prompt_tokens", 0) / 1000) * cost_per_1k_prompt
        completion_cost = (usage.get("completion_tokens", 0) / 1000) * cost_per_1k_completion

        stats["cost"] += prompt_cost + completion_cost

        # 记录使用统计
        if stats["requests"] % 10 == 0:  # 每10次请求记录一次
            logger.info(
                f"Token usage for {agent_type}: "
                f"Total: {stats['total_tokens']}, "
                f"Cost: ${stats['cost']:.4f}, "
                f"Requests: {stats['requests']}"
            )

class MetricsCollector:
    def __init__(self):
        self.metrics = {
            "request_counts": defaultdict(int),
            "response_times": defaultdict(list),
            "error_counts": defaultdict(int),
            "token_usage": defaultdict(dict),
            "cache_hit_rates": defaultdict(lambda: {"hits": 0, "misses": 0})
        }

    async def record_request(
        self,
        request_id: str,
        agent_type: str,
        duration: float,
        token_usage: Optional[Dict[str, int]] = None,
        error: Optional[str] = None,
        success: bool = True
    ) -> None:
        """记录请求指标"""

        # 记录请求计数
        self.metrics["request_counts"][agent_type] += 1

        # 记录响应时间
        self.metrics["response_times"][agent_type].append(duration)

        # 记录错误
        if not success and error:
            self.metrics["error_counts"][f"{agent_type}:{error}"] += 1

        # 记录token使用
        if token_usage:
            self.metrics["token_usage"][request_id] = {
                "agent_type": agent_type,
                "timestamp": time.time(),
                "usage": token_usage,
                "duration": duration,
                "success": success
            }

        # 定期清理旧数据
        if len(self.metrics["response_times"][agent_type]) > 1000:
            self._cleanup_old_metrics(agent_type)

    def get_performance_summary(self, agent_type: str) -> Dict[str, Any]:
        """获取性能摘要"""
        response_times = self.metrics["response_times"][agent_type]

        if not response_times:
            return {}

        return {
            "agent_type": agent_type,
            "total_requests": len(response_times),
            "avg_response_time": sum(response_times) / len(response_times),
            "min_response_time": min(response_times),
            "max_response_time": max(response_times),
            "p95_response_time": self._percentile(response_times, 95),
            "p99_response_time": self._percentile(response_times, 99),
            "error_rate": self._calculate_error_rate(agent_type),
            "cache_hit_rate": self._calculate_cache_hit_rate(agent_type),
            "avg_tokens_per_request": self._calculate_avg_tokens(agent_type)
        }
```

### 错误处理和重试机制

#### 智能重试策略
```python
class RetryManager:
    def __init__(self, config: Dict[str, Any]):
        self.max_retries = config.get("max_retries", 10)
        self.retry_delays = config.get("retry_delays", [1, 2, 4, 8, 16, 32])
        self.circuit_breaker = CircuitBreaker(config.get("circuit_breaker", {}))

    async def execute_with_retry(
        self,
        api_call: Callable,
        agent_type: str,
        **kwargs
    ) -> Any:
        """执行带重试的API调用"""
        last_exception = None

        for attempt in range(self.max_retries + 1):
            try:
                # 检查熔断器状态
                if self.circuit_breaker.is_open(agent_type):
                    raise CircuitBreakerOpenException(
                        f"Circuit breaker is open for {agent_type}"
                    )

                # 执行API调用
                result = await api_call(**kwargs)

                # 成功时重置熔断器
                self.circuit_breaker.record_success(agent_type)

                if attempt > 0:
                    logger.info(
                        f"API call succeeded for {agent_type} after {attempt} retries"
                    )

                return result

            except Exception as e:
                last_exception = e

                # 判断是否应该重试
                if not self._should_retry(e, attempt):
                    self.circuit_breaker.record_failure(agent_type)
                    raise e

                # 计算重试延迟
                delay = self._calculate_retry_delay(attempt, e)

                logger.warning(
                    f"API call failed for {agent_type}, attempt {attempt + 1}/{self.max_retries + 1}. "
                    f"Retrying in {delay}s. Error: {str(e)}"
                )

                await asyncio.sleep(delay)

        # 所有重试都失败
        self.circuit_breaker.record_failure(agent_type)
        raise MaxRetriesExceededException(
            f"Max retries exceeded for {agent_type}. Last error: {str(last_exception)}"
        )

    def _should_retry(self, exception: Exception, attempt: int) -> bool:
        """判断是否应该重试"""
        if attempt >= self.max_retries:
            return False

        # 不重试的异常类型
        non_retryable_errors = [
            AuthenticationException,
            PermissionException,
            ValidationException,
            RateLimitException,  # 由速率限制器处理
        ]

        if type(exception) in non_retryable_errors:
            return False

        # OpenAI特定错误
        if hasattr(exception, 'code'):
            non_retryable_openai_codes = [
                'invalid_api_key',
                'insufficient_quota',
                'model_not_found',
                'invalid_request',
            ]

            if exception.code in non_retryable_openai_codes:
                return False

        return True

    def _calculate_retry_delay(self, attempt: int, exception: Exception) -> float:
        """计算重试延迟"""
        # 基础延迟
        if attempt < len(self.retry_delays):
            base_delay = self.retry_delays[attempt]
        else:
            base_delay = self.retry_delays[-1] * (2 ** (attempt - len(self.retry_delays)))

        # 添加抖动避免雷群效应
        jitter = base_delay * 0.1 * (0.5 + random.random())

        # 根据异常类型调整延迟
        if hasattr(exception, 'code'):
            if exception.code == 'rate_limit_exceeded':
                # 速率限制错误，延长等待时间
                base_delay *= 2
            elif exception.code == 'server_error':
                # 服务器错误，使用标准延迟
                pass

        return base_delay + jitter

class CircuitBreaker:
    def __init__(self, config: Dict[str, Any]):
        self.failure_threshold = config.get("failure_threshold", 5)
        self.recovery_timeout = config.get("recovery_timeout", 60)
        self.state = defaultdict(lambda: "closed")  # closed, open, half_open
        self.failure_counts = defaultdict(int)
        self.last_failure_time = defaultdict(float)

    def is_open(self, agent_type: str) -> bool:
        """检查熔断器是否开启"""
        state = self.state[agent_type]

        if state == "closed":
            return False
        elif state == "open":
            # 检查是否可以进入半开状态
            if time.time() - self.last_failure_time[agent_type] > self.recovery_timeout:
                self.state[agent_type] = "half_open"
                logger.info(f"Circuit breaker for {agent_type} entering half-open state")
                return False
            return True
        else:  # half_open
            return False

    def record_success(self, agent_type: str) -> None:
        """记录成功调用"""
        if self.state[agent_type] == "half_open":
            self.state[agent_type] = "closed"
            logger.info(f"Circuit breaker for {agent_type} closed")

        self.failure_counts[agent_type] = 0

    def record_failure(self, agent_type: str) -> None:
        """记录失败调用"""
        self.failure_counts[agent_type] += 1
        self.last_failure_time[agent_type] = time.time()

        if (self.failure_counts[agent_type] >= self.failure_threshold and
            self.state[agent_type] != "open"):
            self.state[agent_type] = "open"
            logger.warning(
                f"Circuit breaker for {agent_type} opened after "
                f"{self.failure_counts[agent_type]} failures"
            )
```

这个架构文档深入分析了Magentic-UI项目中OpenAI的集成架构，包括：

1. **模型客户端配置管理** - 分层配置系统，支持不同智能体的特定配置
2. **API调用生命周期** - 完整的请求处理流程，包括缓存、速率限制和指标收集
3. **智能缓存策略** - 基于内容的缓存系统，减少API调用成本
4. **成本优化机制** - Token使用优化和使用统计跟踪
5. **错误处理和重试** - 智能重试策略和熔断器模式
6. **性能监控** - 全面的指标收集和分析

该架构确保了OpenAI集成的可靠性、可扩展性和成本效益，为多智能体协作系统提供了强大的AI能力支持。
