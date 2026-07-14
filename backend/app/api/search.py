"""Search routes: semantic code search over a project's pgvector index.

TODO(Phase 5): implement using app.ai.indexer + app.ai.context.
"""
from fastapi import APIRouter

router = APIRouter(prefix="/search", tags=["search"])
