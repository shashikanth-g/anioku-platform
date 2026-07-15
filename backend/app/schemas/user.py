import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import Plan


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    name: str
    avatar_url: str | None
    plan: Plan
    created_at: datetime
