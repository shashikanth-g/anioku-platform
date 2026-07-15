from datetime import datetime

from pydantic import BaseModel, ConfigDict


class FileNode(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    path: str
    is_dir: bool
    size: int
    updated_at: datetime


class FileContentRead(BaseModel):
    path: str
    content: str


class FileWriteRequest(BaseModel):
    content: str


class FileCreateRequest(BaseModel):
    path: str
    is_dir: bool = False


class FileRenameRequest(BaseModel):
    new_path: str
