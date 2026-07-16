"""Workspace routes: CRUD + membership."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db, require_workspace_role
from app.models.enums import WorkspaceRole
from app.models.user import User
from app.models.workspace_member import WorkspaceMember
from app.schemas.common import Page
from app.schemas.workspace import (
    WorkspaceCreate,
    WorkspaceMemberInvite,
    WorkspaceMemberRead,
    WorkspaceMemberRoleUpdate,
    WorkspaceRead,
    WorkspaceUpdate,
)
from app.services import workspace_service

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


@router.post("", response_model=WorkspaceRead, status_code=status.HTTP_201_CREATED)
async def create_workspace(
    payload: WorkspaceCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> WorkspaceRead:
    workspace = await workspace_service.create_workspace(
        db, owner=current_user, name=payload.name, settings=payload.settings
    )
    return WorkspaceRead.model_validate(workspace)


@router.get("", response_model=Page[WorkspaceRead])
async def list_workspaces(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Page[WorkspaceRead]:
    items, total = await workspace_service.list_workspaces_for_user(
        db, user=current_user, limit=limit, offset=offset
    )
    return Page(
        items=[WorkspaceRead.model_validate(i) for i in items],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/{workspace_id}", response_model=WorkspaceRead)
async def get_workspace(
    workspace_id: uuid.UUID,
    _membership: WorkspaceMember = Depends(require_workspace_role()),
    db: AsyncSession = Depends(get_db),
) -> WorkspaceRead:
    workspace = await workspace_service.get_workspace(db, workspace_id)
    if workspace is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Workspace not found")
    return WorkspaceRead.model_validate(workspace)


@router.patch("/{workspace_id}", response_model=WorkspaceRead)
async def update_workspace(
    workspace_id: uuid.UUID,
    payload: WorkspaceUpdate,
    _membership: WorkspaceMember = Depends(require_workspace_role(WorkspaceRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> WorkspaceRead:
    workspace = await workspace_service.get_workspace(db, workspace_id)
    if workspace is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Workspace not found")
    workspace = await workspace_service.update_workspace(
        db, workspace, name=payload.name, settings=payload.settings
    )
    return WorkspaceRead.model_validate(workspace)


@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workspace(
    workspace_id: uuid.UUID,
    _membership: WorkspaceMember = Depends(require_workspace_role(WorkspaceRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> None:
    workspace = await workspace_service.get_workspace(db, workspace_id)
    if workspace is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Workspace not found")
    await workspace_service.delete_workspace(db, workspace)


@router.get("/{workspace_id}/members", response_model=list[WorkspaceMemberRead])
async def list_members(
    workspace_id: uuid.UUID,
    _membership: WorkspaceMember = Depends(require_workspace_role()),
    db: AsyncSession = Depends(get_db),
) -> list[WorkspaceMemberRead]:
    members = await workspace_service.list_members(db, workspace_id)
    return [WorkspaceMemberRead.from_member(m) for m in members]


@router.post(
    "/{workspace_id}/members",
    response_model=WorkspaceMemberRead,
    status_code=status.HTTP_201_CREATED,
)
async def invite_member(
    workspace_id: uuid.UUID,
    payload: WorkspaceMemberInvite,
    _membership: WorkspaceMember = Depends(require_workspace_role(WorkspaceRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> WorkspaceMemberRead:
    workspace = await workspace_service.get_workspace(db, workspace_id)
    if workspace is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Workspace not found")
    try:
        membership = await workspace_service.invite_member(
            db, workspace, email=payload.email, role=payload.role
        )
    except workspace_service.UserNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No user found with that email")
    return WorkspaceMemberRead.from_member(membership)


@router.patch("/{workspace_id}/members/{user_id}", response_model=WorkspaceMemberRead)
async def update_member_role(
    workspace_id: uuid.UUID,
    user_id: uuid.UUID,
    payload: WorkspaceMemberRoleUpdate,
    _membership: WorkspaceMember = Depends(require_workspace_role(WorkspaceRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> WorkspaceMemberRead:
    workspace = await workspace_service.get_workspace(db, workspace_id)
    if workspace is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Workspace not found")
    try:
        membership = await workspace_service.update_member_role(
            db, workspace, user_id=user_id, role=payload.role
        )
    except workspace_service.UserNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Member not found")
    except workspace_service.OwnerRoleChangeError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc))
    return WorkspaceMemberRead.from_member(membership)


@router.delete("/{workspace_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    workspace_id: uuid.UUID,
    user_id: uuid.UUID,
    _membership: WorkspaceMember = Depends(require_workspace_role(WorkspaceRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> None:
    workspace = await workspace_service.get_workspace(db, workspace_id)
    if workspace is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Workspace not found")
    try:
        await workspace_service.remove_member(db, workspace, user_id=user_id)
    except workspace_service.UserNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Member not found")
    except workspace_service.OwnerRoleChangeError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc))
