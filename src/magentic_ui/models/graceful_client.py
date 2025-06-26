import openai
import yaml
import json
import asyncio
from pydantic import BaseModel
import logging
import random
import time
from typing import (
    Any,
    Dict,
    List,
    Mapping,
    Optional,
    Sequence,
    Type,
    Set,
    AsyncGenerator,
    Union,
)

from autogen_core.models import (
    ChatCompletionClient,
    CreateResult,
    UserMessage,
    LLMMessage,
    RequestUsage,
    ModelCapabilities,  # type: ignore
    ModelInfo,
)
from autogen_core import CancellationToken
from autogen_core.tools import Tool, ToolSchema


class GracefulRetryClient(ChatCompletionClient):
    """
    This class is a gateway to multiple clients, it will try to use the clients in a round robin fashion
    Every time create() is called, a new client is selected from the list of clients
    This means that, for a single trajectory which requires N GPT-4 calls, it is not guaranteed that all calls will be made by the same client
    """

    def __init__(
        self,
        clients: List[ChatCompletionClient],
        support_json: bool = True,  # if all clients do
        logger: Optional[Type[logging.Logger]] = None,
        max_retries: int = 8,
    ):
        self._clients = clients
        assert len(clients) > 0, "No clients provided"
        self.logger = logger or logging.getLogger(__name__)
        self.max_retries = max_retries
        self.support_json = support_json
        self.blocklist: Set[ChatCompletionClient] = set()

    @staticmethod
    def create_from_configs(
        configs: List[Dict[str, Any]],
        logger: Optional[Type[logging.Logger]] = None,
        max_retries: int = 8,
    ):
        clients = [ChatCompletionClient.load_component(config) for config in configs]
        assert len(clients) > 0, "No clients provided"
        return GracefulRetryClient(
            clients=clients, logger=logger, max_retries=max_retries
        )

    def next_client(self) -> ChatCompletionClient:
        """
        Self-healing property: only select from clients that are not in the blocklist, blocklist grows whenever we encounter a client that is not available
        """
        valid_clients = [
            client for client in self._clients if client not in self.blocklist
        ]
        idx = random.choice(list(range(len(valid_clients))))
        return valid_clients[idx]

    async def create(
        self,
        messages: Sequence[LLMMessage],
        *,
        tools: Sequence[Tool | ToolSchema] = [],
        json_output: Optional[bool | type[BaseModel]] = None,
        extra_create_args: Mapping[str, Any] = {},
        cancellation_token: Optional[CancellationToken] = None,
    ) -> CreateResult:
        tries = self.max_retries

        # print(f"Create from messages: {messages}")

        while tries > 0:
            client = self.next_client()
            try:
                result = await client.create(
                    messages=messages,
                    tools=tools,
                    json_output=json_output,
                    extra_create_args=extra_create_args,
                    cancellation_token=cancellation_token,
                )
                return result

            except openai.InternalServerError as e:
                tries -= 1
                print(
                    f"ERROR: GracefulRetryClient.create() InternalServerError: {client.model_info}, {e}"
                )
                sleep_time = 2
                time.sleep(sleep_time)
                continue
            except openai.RateLimitError as e:
                tries -= 1
                print(
                    f"ERROR: GracefulRetryClient.create() RateLimitError: {client.model_info}, {e}"
                )
                sleep_time = 2  # ** (self.max_retries - tries) # Retry faster
                time.sleep(sleep_time)
                continue
            except openai.NotFoundError as e:
                self.blocklist.add(client)
                print(
                    f"ERROR: GracefulRetryClient.create() PermissionDeniedError:, BLOCKING {client.model_info} and switching to new client {e}"
                )
                time.sleep(1)
                continue
            except openai.PermissionDeniedError as e:
                self.blocklist.add(client)
                print(
                    f"ERROR: GracefulRetryClient.create() PermissionDeniedError: {client.model_info}, BLOCKING {client.model_info} and switching to new client {e}"
                )
                time.sleep(1)
                continue
            except openai.APIConnectionError as e:
                self.blocklist.add(client)
                print(
                    f"ERROR: GracefulRetryClient.create() APIConnectionError: {client.model_info}, BLOCKING {client.model_info} and switching to new client {e}"
                )
                time.sleep(1)
                continue
            except openai.AuthenticationError as e:
                print(
                    f"ERROR: GracefulRetryClient.create() AuthenticationError: {client.model_info}, {e}"
                )
                self.blocklist.add(client)
                continue
            except openai.APIStatusError as e:
                if "DeploymentNotFound" in str(e):
                    print(
                        f"ERROR: GracefulRetryClient.create() DeploymentNotFound: {client.model_info}, BLOCKING {client.model_info} and switching to new client {e}"
                    )
                    self.blocklist.add(client)
                    time.sleep(1)
                    continue
                elif "Request body too large" in str(e):
                    print(
                        f"ERROR: GracefulRetryClient.create() Request body too large: {client.model_info}, {e}"
                    )
                    tries -= 1
                    time.sleep(1)
                    continue
                else:
                    print(
                        f"ERROR: GracefulRetryClient.create() APIStatusError: {client.model_info}, {e}"
                    )
                    tries -= 1
                    time.sleep(1)
                    continue
            except Exception:
                tries -= 1
                self.blocklist.add(client)
                sleep_time = 2  # ** (self.max_retries - tries) # Retry faster
                time.sleep(sleep_time)
                continue
        valid_clients = [
            client for client in self._clients if client not in self.blocklist
        ]
        raise Exception(
            f"GracefulRetryClient.create(): All clients are exhausted even after {self.max_retries} retries to {len(valid_clients)}/{len(self._clients)} clients. Blocklist: {len(self.blocklist)}"
        )

    def create_stream(
        self,
        messages: Sequence[LLMMessage],
        *,
        tools: Sequence[Tool | ToolSchema] = [],
        json_output: Optional[bool | type[BaseModel]] = None,
        extra_create_args: Mapping[str, Any] = {},
        cancellation_token: Optional[CancellationToken] = None,
    ) -> AsyncGenerator[Union[str, CreateResult], None]:
        raise NotImplementedError(
            "GracefulRetryClient.create_stream() is not implemented"
        )

    async def close(self) -> None:
        for client in self._clients:
            await client.close()

    def actual_usage(self) -> RequestUsage:
        prompt_tokens = sum(
            [client.actual_usage().prompt_tokens for client in self._clients]
        )
        completion_tokens = sum(
            [client.actual_usage().completion_tokens for client in self._clients]
        )
        return RequestUsage(
            prompt_tokens=prompt_tokens, completion_tokens=completion_tokens
        )

    def total_usage(self) -> RequestUsage:
        prompt_tokens = sum(
            [client.total_usage().prompt_tokens for client in self._clients]
        )
        completion_tokens = sum(
            [client.total_usage().completion_tokens for client in self._clients]
        )
        return RequestUsage(
            prompt_tokens=prompt_tokens, completion_tokens=completion_tokens
        )

    def count_tokens(
        self, messages: Sequence[LLMMessage], *, tools: Sequence[Tool | ToolSchema] = []
    ) -> int:
        # Assume all clients are the same model
        return self._clients[0].count_tokens(messages, tools=tools)

    def remaining_tokens(
        self, messages: Sequence[LLMMessage], *, tools: Sequence[Tool | ToolSchema] = []
    ) -> int:
        return self._clients[0].remaining_tokens(messages=messages, tools=tools)

    @property
    def capabilities(self) -> ModelCapabilities:  # type: ignore
        return self._clients[0].capabilities

    @property
    def model_info(self) -> ModelInfo:
        return self._clients[0].model_info


async def main():
    config_path = "experiments/endpoint_configs/multi_config.yaml"
    with open(config_path, "r") as f:
        if config_path.endswith((".yml", ".yaml")):
            config = yaml.safe_load(f)
        else:
            config = json.load(f)

    print("making client")
    breakpoint()
    client = GracefulRetryClient.create_from_configs(config["model_clients"])
    print("client made")

    print("making request")
    result = await client.create(
        messages=[
            UserMessage(content="test", source="test"),
        ]
    )
    print("request made")
    print(result)


if __name__ == "__main__":
    asyncio.run(main())
