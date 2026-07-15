"""File routes: tree listing, read, write, create, delete, rename — all
delegate to app.services.file_service, the single authority for disk I/O.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, require_project_role
from app.models.enums import WorkspaceRole
from app.models.project import Project
from app.schemas.file import (
    FileContentRead,
    FileCreateRequest,
    FileNode,
    FileRenameRequest,
    FileWriteRequest,
)
from app.services import file_service

router = APIRouter(prefix="/projects/{project_id}/files", tags=["files"])

READ_ROLES: tuple[WorkspaceRole, ...] = ()
WRITE_ROLES = (WorkspaceRole.ADMIN, WorkspaceRole.EDITOR)


@router.get("", response_model=list[FileNode])
async def get_tree(
    project: Project = Depends(require_project_role(*READ_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> list[FileNode]:
    rows = await file_service.get_tree(db, project.id)
    return [FileNode.model_validate(r) for r in rows]


@router.get("/content", response_model=FileContentRead)
async def read_file(
    path: str = Query(...),
    project: Project = Depends(require_project_role(*READ_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> FileContentRead:
    try:
        content = await file_service.read_file(db, project.id, path)
    except file_service.PathTraversalError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid path")
    except file_service.NotFoundOnDiskError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "File not found")
    return FileContentRead(path=path, content=content)


@router.put("/content", response_model=FileNode)
async def write_file(
    payload: FileWriteRequest,
    path: str = Query(...),
    project: Project = Depends(require_project_role(*WRITE_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> FileNode:
    try:
        row = await file_service.write_file(db, project.id, path, payload.content)
    except file_service.PathTraversalError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid path")
    return FileNode.model_validate(row)


@router.post("", response_model=FileNode, status_code=status.HTTP_201_CREATED)
async def create_entry(
    payload: FileCreateRequest,
    project: Project = Depends(require_project_role(*WRITE_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> FileNode:
    try:
        row = await file_service.create_entry(db, project.id, payload.path, is_dir=payload.is_dir)
    except file_service.PathTraversalError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid path")
    return FileNode.model_validate(row)


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def delete_entry(
    path: str = Query(...),
    project: Project = Depends(require_project_role(*WRITE_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> None:
    try:
        await file_service.delete_entry(db, project.id, path)
    except file_service.PathTraversalError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid path")


@router.patch("", response_model=FileNode)
async def rename_entry(
    payload: FileRenameRequest,
    path: str = Query(...),
    project: Project = Depends(require_project_role(*WRITE_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> FileNode:
    try:
        row = await file_service.rename_entry(db, project.id, path, payload.new_path)
    except file_service.PathTraversalError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid path")
    return FileNode.model_validate(row)
