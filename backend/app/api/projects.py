"""Project routes: CRUD within a workspace.

TODO(Phase 1): implement using app.services.project_service.
"""
from fastapi import APIRouter

router = APIRouter(prefix="/projects", tags=["projects"])
