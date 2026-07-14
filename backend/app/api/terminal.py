"""Terminal routes: session creation/teardown (I/O itself flows over socket.io).

TODO(Phase 3): implement using app.runtime.terminal + app.runtime.docker_manager.
"""
from fastapi import APIRouter

router = APIRouter(prefix="/terminal", tags=["terminal"])
