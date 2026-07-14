"""File routes: tree listing, read, write, rename, delete.

TODO(Phase 1/2): implement using app.services.file_service.
"""
from fastapi import APIRouter

router = APIRouter(prefix="/files", tags=["files"])
