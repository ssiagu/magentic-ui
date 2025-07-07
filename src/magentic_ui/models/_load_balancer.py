from collections import OrderedDict
from enum import Enum
from threading import Lock
from typing import Any, AsyncGenerator, List, Mapping, Optional, Sequence, Union

from autogen_core import CancellationToken, Component, ComponentModel
from autogen_core.models import (
    ChatCompletionClient,
    CreateResult,
    LLMMessage,
    ModelInfo,
)
from loguru import logger
from pydantic import BaseModel


class LoadBalanceStrategy(Enum):
    GREEDY = 0
    ROUND_ROBIN = 1


class LoadBalancerChatCompletionClientConfig(BaseModel):
    clients: List[Union[ComponentModel, Mapping[str, Any]]]
    strategy: LoadBalanceStrategy = LoadBalanceStrategy.GREEDY


class LoadBalancerChatCompletionClient(
    ChatCompletionClient, Component[LoadBalancerChatCompletionClientConfig]
):
    """A load balancer that distributes requests among multiple ChatCompletionClients.

    Arguments:
        clients (List[ChatCompletionClient]): The clients to balance requests among
        strategy (LoadBalanceStrategy, optional): The strategy 

        
    Greedy:
        1. Use the first model in the list
        1a. If success: Exit (next request will use this model again)
        1b. If fail: Move model to end of list and return to 1.
        2. If all clients failed: raise group exception

    Round Robin:
        1. Try the next model
        1a. If success: Move model to end of list and exit (next request will use next model)
        1b. If fail: Move model to end of list and return to 1.
        2. If all clients failed: raise group exception
    """

    component_type = "model_client"
    component_config_schema = LoadBalancerChatCompletionClientConfig
    component_provider_override = f"{__name__}.LoadBalancerChatCompletionClient"

    def __init__(
        self,
        clients: List[ChatCompletionClient],
        strategy: LoadBalanceStrategy = LoadBalanceStrategy.GREEDY,
    ) -> None:
        super().__init__()
        if not clients:
            raise ValueError("At least one client must be provided")

        self._clients: OrderedDict[int, ChatCompletionClient] = OrderedDict()
        for client in clients:
            self._clients[id(client)] = client

        self._lock = Lock()
        self.strategy = strategy

    def _client_failed(self, client_id: int):
        with self._lock:
            if client_id in self._clients:
                self._clients.move_to_end(client_id)
            else:
                logger.warning(f"Cannot fail unrecognized client {client_id}.")

    def _client_succeeded(self, client_id: int):
        if self.strategy == LoadBalanceStrategy.GREEDY:
            # NoOp, keep using good clints until they fail
            return
        elif self.strategy == LoadBalanceStrategy.ROUND_ROBIN:
            # Move the client to the end
            with self._lock:
                if client_id in self._clients:
                    self._clients.move_to_end(client_id)
                else:
                    logger.warning(f"Cannot move unrecognized client {client_id}.")
        else:
            raise ValueError(f"Urecognized LoadBalanceStrategy: {self.strategy}")

    def _get_next_models(self):
        with self._lock:
            return self._clients.copy()

    @property
    def model_info(self) -> ModelInfo:
        """Return model info from the first available client."""
        exceptions: List[Exception] = []

        for client in self._clients.values():
            try:
                return client.model_info
            except Exception as e:
                logger.warning(f"Failed to get model info from client {client}: {e}")
                exceptions.append(e)
                continue

        if exceptions:
            raise ExceptionGroup("All clients failed to get model info", exceptions)
        else:
            raise ValueError("No clients available")

    def actual_usage(self):
        """Return aggregated actual usage from all clients."""
        if not self._clients:
            raise ValueError("No clients")

        total_prompt_tokens = 0
        total_completion_tokens = 0
        exceptions: List[Exception] = []

        for client in self._clients.values():
            try:
                usage = client.actual_usage()
                total_prompt_tokens += usage.prompt_tokens
                total_completion_tokens += usage.completion_tokens
            except Exception as e:
                logger.warning(f"Failed to get actual usage from client {client}: {e}")
                exceptions.append(e)
                continue

        if len(exceptions) == len(self._clients):
            raise ExceptionGroup("All clients failed to get actual_usage", exceptions)

        from autogen_core.models import RequestUsage

        return RequestUsage(
            prompt_tokens=total_prompt_tokens, completion_tokens=total_completion_tokens
        )

    def total_usage(self):
        """Return aggregated total usage from all clients."""
        if not self._clients:
            raise ValueError("No clients")

        total_prompt_tokens = 0
        total_completion_tokens = 0
        exceptions: List[Exception] = []

        for client in self._clients.values():
            try:
                usage = client.total_usage()
                total_prompt_tokens += usage.prompt_tokens
                total_completion_tokens += usage.completion_tokens
            except Exception as e:
                logger.warning(f"Failed to get total usage from client {client}: {e}")
                exceptions.append(e)
                continue

        if len(exceptions) == len(self._clients):
            raise ExceptionGroup("All clients failed to get total_usage", exceptions)

        from autogen_core.models import RequestUsage

        return RequestUsage(
            prompt_tokens=total_prompt_tokens, completion_tokens=total_completion_tokens
        )

    def remaining_tokens(
        self, messages: Sequence[LLMMessage], *, tools: Optional[Sequence[Any]] = None
    ) -> int:
        """Return remaining tokens from the first available client."""
        exceptions: List[Exception] = []

        for client in self._clients.values():
            try:
                if tools is not None:
                    return client.remaining_tokens(messages, tools=tools)
                else:
                    return client.remaining_tokens(messages)
            except Exception as e:
                logger.warning(
                    f"Failed to get remaining tokens from client {client}: {e}"
                )
                exceptions.append(e)
                continue

        if exceptions:
            raise ExceptionGroup(
                "All clients failed to get remaining tokens", exceptions
            )
        else:
            raise ValueError("No clients available")

    def count_tokens(
        self, messages: Sequence[LLMMessage], *, tools: Optional[Sequence[Any]] = None
    ) -> int:
        """Return token count from the first available client."""
        exceptions: List[Exception] = []

        for client in self._clients.values():
            try:
                if tools is not None:
                    return client.count_tokens(messages, tools=tools)
                else:
                    return client.count_tokens(messages)
            except Exception as e:
                logger.warning(f"Failed to count tokens from client {client}: {e}")
                exceptions.append(e)
                continue

        if exceptions:
            raise ExceptionGroup("All clients failed to count tokens", exceptions)
        else:
            raise ValueError("No clients available")

    @property
    def capabilities(self):
        """Return capabilities from the first available client."""
        exceptions: List[Exception] = []

        for client in self._clients.values():
            try:
                return client.capabilities
            except Exception as e:
                logger.warning(f"Failed to get capabilities from client {client}: {e}")
                exceptions.append(e)
                continue

        if exceptions:
            raise ExceptionGroup("All clients failed to get capabilities", exceptions)
        else:
            raise ValueError("No clients available")

    def create_stream(
        self,
        messages: Sequence[LLMMessage],
        *,
        cancellation_token: Optional[CancellationToken] = None,
        **kwargs: Any,
    ):
        """Create a streaming response using the first available client."""
        exceptions: List[Exception] = []

        # For streaming, we'll try clients in order and move failed ones to the end
        next_clients = self._get_next_models()

        async def wrap_stream(
            client_id: int, stream: AsyncGenerator[str | CreateResult, None]
        ):
            try:
                async for item in stream:
                    yield item
                self._client_succeeded(client_id)
            except Exception:
                # Don't log, whoever is consuming this generator is handling the errors
                self._client_failed(client_id)
                raise

        for client_id, client in next_clients.items():
            try:
                return wrap_stream(
                    client_id,
                    client.create_stream(
                        messages=messages,
                        cancellation_token=cancellation_token,
                        **kwargs,
                    ),
                )
            except Exception as e:
                logger.warning(f"Failed to create streaming request for client {client_id}: {e}")
                self._client_failed(client_id)
                exceptions.append(e)
                continue

        if exceptions:
            raise ExceptionGroup("All clients failed to create stream", exceptions)
        else:
            raise RuntimeError("No clients available for streaming")

    async def create(
        self,
        messages: Sequence[LLMMessage],
        *,
        cancellation_token: Optional[CancellationToken] = None,
        **kwargs: Any,
    ) -> CreateResult:
        """Create a chat completion using the load balancer with simple retry logic."""
        next_clients = self._get_next_models()

        exceptions: List[Exception] = []

        for client_id, client in next_clients.items():
            try:
                result = await client.create(
                    messages=messages, cancellation_token=cancellation_token, **kwargs
                )
                self._client_succeeded(client_id)
                return result

            except Exception as e:
                self._client_failed(client_id)
                logger.warning(f"Request failed with client {client}: {e}")
                exceptions.append(e)
                continue

        # If we get here, all clients failed
        if exceptions:
            raise ExceptionGroup("Request field with all clients.", exceptions)
        else:
            raise RuntimeError("No clients available")

    async def close(self) -> None:
        """Close all underlying clients."""
        for client in self._clients.values():
            try:
                await client.close()
            except Exception as e:
                logger.warning(f"Error closing client {client}: {e}")

    def _to_config(self) -> LoadBalancerChatCompletionClientConfig:
        """Convert to configuration object."""
        client_configs: List[Union[ComponentModel, Mapping[str, Any]]] = []

        for client in self._clients.values():
            client_configs.append(client.dump_component())

        return LoadBalancerChatCompletionClientConfig(
            clients=client_configs, strategy=self.strategy
        )

    @classmethod
    def _from_config(
        cls, config: LoadBalancerChatCompletionClientConfig
    ) -> "LoadBalancerChatCompletionClient":
        """Create instance from configuration."""
        clients: List[ChatCompletionClient] = []
        for client_config in config.clients:
            try:
                if isinstance(client_config, ComponentModel):
                    client = ChatCompletionClient.load_component(client_config)
                elif isinstance(client_config, dict):
                    client = ChatCompletionClient.load_component(client_config)
                else:
                    logger.warning(f"Invalid client config type: {type(client_config)}")
                    continue
                clients.append(client)
            except Exception as e:
                logger.error(f"Failed to load client from config: {e}")
                continue

        return cls(clients, strategy=config.strategy)
