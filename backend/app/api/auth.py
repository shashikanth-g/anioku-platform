"""Auth routes: POST /register, POST /login, POST /refresh, GET /me.

TODO(Phase 1): implement using app.core.security and app.services.auth_service.
"""
from fastapi import APIRouter

router = APIRouter(prefix="/auth", tags=["auth"])
