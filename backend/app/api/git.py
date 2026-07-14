"""Git routes: status, diff, commit, push/pull, branches, AI commit messages.

TODO(Phase 7): implement using app.services.git_service (GitPython).
"""
from fastapi import APIRouter

router = APIRouter(prefix="/git", tags=["git"])
