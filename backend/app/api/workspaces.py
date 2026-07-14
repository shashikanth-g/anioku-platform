"""Workspace routes: CRUD + membership.

TODO(Phase 1): implement using app.services.workspace_service.
"""
from fastapi import APIRouter

router = APIRouter(prefix="/workspaces", tags=["workspaces"])
