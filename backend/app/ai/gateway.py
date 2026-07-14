"""Unified multi-model gateway, wrapping LiteLLM.

TODO(Phase 4): implement
- MODEL_REGISTRY: dict mapping friendly model names -> LiteLLM model strings
  (OpenAI, Anthropic, Google, DeepSeek), keyed off settings.*_API_KEY.
- async def complete(model: str, messages: list[dict], **kwargs) -> str
- async def stream(model: str, messages: list[dict], **kwargs) -> AsyncIterator[str]
"""
