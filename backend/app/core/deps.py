"""Shared FastAPI dependencies.

TODO(Phase 1): implement
- get_db() -> AsyncGenerator[AsyncSession, None]   (async sessionmaker bound to settings.DATABASE_URL)
- get_current_user(token: str = Depends(oauth2_scheme)) -> User
- get_current_workspace(workspace_id: UUID, ...) -> Workspace  (membership check)
"""
