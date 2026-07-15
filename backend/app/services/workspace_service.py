"""Workspace CRUD + membership business logic."""

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import WorkspaceRole
from app.models.user import User
from app.models.workspace import Workspace
from app.models.workspace_member import WorkspaceMember


class UserNotFoundError(Exception):
    pass


class OwnerRoleChangeError(Exception):
    """Raised when an operation would demote or remove the workspace owner."""


async def create_workspace(
    db: AsyncSession, *, owner: User, name: str, settings: dict | None = None
) -> Workspace:
    workspace = Workspace(name=name, owner_id=owner.id, settings=settings or {})
    db.add(workspace)
    await db.flush()
    db.add(WorkspaceMember(workspace_id=workspace.id, user_id=owner.id, role=WorkspaceRole.ADMIN))
    await db.commit()
    await db.refresh(workspace)
    return workspace


async def list_workspaces_for_user(
    db: AsyncSession, *, user: User, limit: int, offset: int
) -> tuple[list[Workspace], int]:
    base = (
        select(Workspace)
        .join(WorkspaceMember, WorkspaceMember.workspace_id == Workspace.id)
        .where(WorkspaceMember.user_id == user.id)
    )
    total = (await db.execute(select(func.count()).select_from(base.subquery()))).scalar_one()
    result = await db.execute(
        base.order_by(Workspace.created_at.desc()).limit(limit).offset(offset)
    )
    return list(result.scalars().all()), total


async def get_workspace(db: AsyncSession, workspace_id: uuid.UUID) -> Workspace | None:
    return await db.get(Workspace, workspace_id)


async def update_workspace(
    db: AsyncSession, workspace: Workspace, *, name: str | None, settings: dict | None
) -> Workspace:
    if name is not None:
        workspace.name = name
    if settings is not None:
        workspace.settings = settings
    await db.commit()
    await db.refresh(workspace)
    return workspace


async def delete_workspace(db: AsyncSession, workspace: Workspace) -> None:
    await db.delete(workspace)
    await db.commit()


async def get_membership(
    db: AsyncSession, workspace_id: uuid.UUID, user_id: uuid.UUID
) -> WorkspaceMember | None:
    return await db.get(WorkspaceMember, (workspace_id, user_id))


async def list_members(db: AsyncSession, workspace_id: uuid.UUID) -> list[WorkspaceMember]:
    result = await db.execute(
        select(WorkspaceMember).where(WorkspaceMember.workspace_id == workspace_id)
    )
    return list(result.scalars().all())


async def invite_member(
    db: AsyncSession, workspace: Workspace, *, email: str, role: WorkspaceRole
) -> WorkspaceMember:
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user is None:
        raise UserNotFoundError(email)
    existing = await get_membership(db, workspace.id, user.id)
    if existing is not None:
        existing.role = role
        await db.commit()
        await db.refresh(existing)
        return existing
    membership = WorkspaceMember(workspace_id=workspace.id, user_id=user.id, role=role)
    db.add(membership)
    await db.commit()
    await db.refresh(membership)
    return membership


async def update_member_role(
    db: AsyncSession, workspace: Workspace, *, user_id: uuid.UUID, role: WorkspaceRole
) -> WorkspaceMember:
    if workspace.owner_id == user_id and role != WorkspaceRole.ADMIN:
        raise OwnerRoleChangeError("cannot demote the workspace owner")
    membership = await get_membership(db, workspace.id, user_id)
    if membership is None:
        raise UserNotFoundError(str(user_id))
    membership.role = role
    await db.commit()
    await db.refresh(membership)
    return membership


async def remove_member(db: AsyncSession, workspace: Workspace, *, user_id: uuid.UUID) -> None:
    if workspace.owner_id == user_id:
        raise OwnerRoleChangeError("cannot remove the workspace owner")
    membership = await get_membership(db, workspace.id, user_id)
    if membership is None:
        raise UserNotFoundError(str(user_id))
    await db.delete(membership)
    await db.commit()
