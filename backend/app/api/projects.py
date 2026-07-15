"""Project routes: create from a template within a workspace, then CRUD by id."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, require_project_role, require_workspace_role
from app.models.enums import WorkspaceRole
from app.models.project import Project
from app.models.workspace_member import WorkspaceMember
from app.schemas.common import Page
from app.schemas.project import ProjectCreate, ProjectRead, ProjectUpdate
from app.services import project_service, workspace_service

router = APIRouter(tags=["projects"])


@router.post(
    "/workspaces/{workspace_id}/projects",
    response_model=ProjectRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_project(
    workspace_id: uuid.UUID,
    payload: ProjectCreate,
    _membership: WorkspaceMember = Depends(
        require_workspace_role(WorkspaceRole.ADMIN, WorkspaceRole.EDITOR)
    ),
    db: AsyncSession = Depends(get_db),
) -> ProjectRead:
    workspace = await workspace_service.get_workspace(db, workspace_id)
    if workspace is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Workspace not found")
    project = await project_service.create_project(
        db,
        workspace=workspace,
        name=payload.name,
        description=payload.description,
        template=payload.template,
        language=payload.language,
        framework=payload.framework,
    )
    return ProjectRead.model_validate(project)


@router.get("/workspaces/{workspace_id}/projects", response_model=Page[ProjectRead])
async def list_projects(
    workspace_id: uuid.UUID,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    _membership: WorkspaceMember = Depends(require_workspace_role()),
    db: AsyncSession = Depends(get_db),
) -> Page[ProjectRead]:
    items, total = await project_service.list_projects(
        db, workspace_id=workspace_id, limit=limit, offset=offset
    )
    return Page(
        items=[ProjectRead.model_validate(i) for i in items],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/projects/{project_id}", response_model=ProjectRead)
async def get_project(project: Project = Depends(require_project_role())) -> ProjectRead:
    return ProjectRead.model_validate(project)


@router.patch("/projects/{project_id}", response_model=ProjectRead)
async def update_project(
    payload: ProjectUpdate,
    project: Project = Depends(require_project_role(WorkspaceRole.ADMIN, WorkspaceRole.EDITOR)),
    db: AsyncSession = Depends(get_db),
) -> ProjectRead:
    project = await project_service.update_project(
        db,
        project,
        name=payload.name,
        description=payload.description,
        git_remote=payload.git_remote,
    )
    return ProjectRead.model_validate(project)


@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project: Project = Depends(require_project_role(WorkspaceRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> None:
    await project_service.delete_project(db, project)
