import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr

from app.models.enums import WorkspaceRole


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


class WorkspaceMemberInvite(BaseModel):
    email: EmailStr
    role: WorkspaceRole = WorkspaceRole.VIEWER


class WorkspaceMemberRoleUpdate(BaseModel):
    role: WorkspaceRole
