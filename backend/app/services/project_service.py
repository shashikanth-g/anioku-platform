"""Project CRUD business logic."""

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project
from app.models.workspace import Workspace
from app.services import file_service


async def create_project(
    db: AsyncSession,
    *,
    workspace: Workspace,
    name: str,
    description: str | None,
    template: str,
    language: str | None,
    framework: str | None,
) -> Project:
    project = Project(
        workspace_id=workspace.id,
        name=name,
        description=description,
        template=template,
        language=language,
        framework=framework,
    )
    db.add(project)
    await db.flush()
    await file_service.instantiate_template(db, project=project, template=template)
    await db.commit()
    await db.refresh(project)
    return project


async def list_projects(
    db: AsyncSession, *, workspace_id: uuid.UUID, limit: int, offset: int
) -> tuple[list[Project], int]:
    base = select(Project).where(Project.workspace_id == workspace_id)
    total = (await db.execute(select(func.count()).select_from(base.subquery()))).scalar_one()
    result = await db.execute(base.order_by(Project.created_at.desc()).limit(limit).offset(offset))
    return list(result.scalars().all()), total


async def get_project(db: AsyncSession, project_id: uuid.UUID) -> Project | None:
    return await db.get(Project, project_id)


async def update_project(
    db: AsyncSession,
    project: Project,
    *,
    name: str | None,
    description: str | None,
    git_remote: str | None,
) -> Project:
    if name is not None:
        project.name = name
    if description is not None:
        project.description = description
    if git_remote is not None:
        project.git_remote = git_remote
    await db.commit()
    await db.refresh(project)
    return project


async def delete_project(db: AsyncSession, project: Project) -> None:
    file_service.delete_project_directory(project.id)
    await db.delete(project)
    await db.commit()
