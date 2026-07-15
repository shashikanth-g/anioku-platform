"""Multi-agent routes: kick off/inspect LangGraph orchestration runs.

TODO(Phase 8): implement using app.ai.orchestrator + app.models.agent_run.
"""

from fastapi import APIRouter

router = APIRouter(prefix="/agents", tags=["agents"])
