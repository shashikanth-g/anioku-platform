import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

from app.models.enums import ContainerStatus

TemplateName = Literal["blank", "node", "next", "python", "fastapi"]


class ProjectCreate(BaseModel):
    name: str
    description: str | None = None
    template: TemplateName = "blank"
    language: str | None = None
    framework: str | None = None


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    git_remote: str | None = None


class ProjectRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    workspace_id: uuid.UUID
    name: str
    description: str | None
    template: str
    language: str | None
    framework: str | None
    container_id: str | None
    container_status: ContainerStatus
    preview_port: int | None
    git_remote: str | None
    created_at: datetime
