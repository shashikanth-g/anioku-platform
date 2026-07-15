"""Deployment routes: trigger/inspect deploys to Vercel/Railway.

TODO(Phase 10): implement using app.services.deploy_service.
"""

from fastapi import APIRouter

router = APIRouter(prefix="/deploy", tags=["deploy"])
