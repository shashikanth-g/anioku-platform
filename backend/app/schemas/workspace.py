import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from pydantic import BaseModel, ConfigDict, EmailStr

from app.models.enums import WorkspaceRole

if TYPE_CHECKING:
    from app.models.workspace_member import WorkspaceMember


class WorkspaceCreate(BaseModel):
    name: str
    settings: dict = {}


class WorkspaceUpdate(BaseModel):
    name: str | None = None
    settings: dict | None = None


class WorkspaceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    owner_id: uuid.UUID
    settings: dict
    created_at: datetime


class WorkspaceMemberRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    workspace_id: uuid.UUID
    user_id: uuid.UUID
    role: WorkspaceRole
    email: str
    name: str

    @classmethod
    def from_member(cls, member: "WorkspaceMember") -> "WorkspaceMemberRead":
        """Build from a WorkspaceMember ORM row with `.user` eager-loaded —
        `email`/`name` live on the related User, not on WorkspaceMember
        itself, so plain from_attributes() can't pick them up."""
        return cls(
            workspace_id=member.workspace_id,
            user_id=member.user_id,
            role=member.role,
            email=member.user.email,
            name=member.user.name,
        )


class WorkspaceMemberInvite(BaseModel):
    email: EmailStr
    role: WorkspaceRole = WorkspaceRole.VIEWER


class WorkspaceMemberRoleUpdate(BaseModel):
    role: WorkspaceRole
