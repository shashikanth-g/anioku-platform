"""Shared FastAPI dependencies: DB session, current user, and workspace/project
role-check dependency factories.
"""

import uuid
from collections.abc import AsyncGenerator

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.core.security import InvalidTokenError, TokenType, decode_token
from app.models.enums import WorkspaceRole
from app.models.project import Project
from app.models.user import User
from app.models.workspace_member import WorkspaceMember

engine = create_async_engine(settings.DATABASE_URL, pool_pre_ping=True)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session


async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)) -> User:
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    try:
        payload = decode_token(token, TokenType.ACCESS)
    except InvalidTokenError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")
    user = await db.get(User, uuid.UUID(payload["sub"]))
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    return user


async def get_workspace_membership(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> WorkspaceMember:
    membership = await db.get(WorkspaceMember, (workspace_id, current_user.id))
    if membership is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Workspace not found")
    return membership


def require_workspace_role(*roles: WorkspaceRole):
    """Dependency factory. No roles = any member may proceed (read access);
    pass specific roles to restrict to them (e.g. write/admin actions)."""

    async def checker(
        membership: WorkspaceMember = Depends(get_workspace_membership),
    ) -> WorkspaceMember:
        if roles and membership.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Insufficient permissions")
        return membership

    return checker


async def get_project_or_404(project_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> Project:
    project = await db.get(Project, project_id)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
    return project


async def get_project_membership(
    project: Project = Depends(get_project_or_404),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> tuple[Project, WorkspaceMember]:
    membership = await db.get(WorkspaceMember, (project.workspace_id, current_user.id))
    if membership is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
    return project, membership


def require_project_role(*roles: WorkspaceRole):
    """Dependency factory mirroring require_workspace_role, scoped to a project
    (resolves the project's workspace and checks membership there). Returns the
    Project so route handlers get it for free."""

    async def checker(
        project_and_membership: tuple[Project, WorkspaceMember] = Depends(get_project_membership),
    ) -> Project:
        project, membership = project_and_membership
        if roles and membership.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Insufficient permissions")
        return project

    return checker
