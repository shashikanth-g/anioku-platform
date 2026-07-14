"""AI chat routes: single-model completion/streaming via the LiteLLM gateway.

TODO(Phase 4): implement using app.ai.gateway.
"""
from fastapi import APIRouter

router = APIRouter(prefix="/ai", tags=["ai"])
