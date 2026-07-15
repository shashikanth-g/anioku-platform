"""Disk I/O + metadata sync for project files — the single authority for
reading/writing project file bytes. app/models/project_file.py rows are
metadata only; every function here keeps them in lockstep with the
filesystem under PROJECTS_ROOT/<project_id>/.
"""

import shutil
import uuid
from pathlib import Path, PurePosixPath

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.project import Project
from app.models.project_file import ProjectFile

TEMPLATES_ROOT = Path(__file__).resolve().parent.parent / "templates"


class PathTraversalError(ValueError):
    """Raised when a requested path would resolve outside the project root."""


class NotFoundOnDiskError(FileNotFoundError):
    pass


def project_root(project_id: uuid.UUID) -> Path:
    root = Path(settings.PROJECTS_ROOT) / str(project_id)
    root.mkdir(parents=True, exist_ok=True)
    return root.resolve()


def resolve_path(project_id: uuid.UUID, rel_path: str) -> Path:
    if not rel_path or "\x00" in rel_path:
        raise PathTraversalError(rel_path)
    pure = PurePosixPath(rel_path)
    if pure.is_absolute() or pure.drive:
        raise PathTraversalError(rel_path)
    root = project_root(project_id)
    candidate = (root / rel_path).resolve()
    if candidate != root:
        try:
            candidate.relative_to(root)
        except ValueError as exc:
            raise PathTraversalError(rel_path) from exc
    return candidate


def _normalize(rel_path: str) -> str:
    return str(PurePosixPath(rel_path)).strip("/")


def _like_prefix(norm: str) -> str:
    escaped = norm.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"{escaped}/%"


async def _upsert_file_row(
    db: AsyncSession, project_id: uuid.UUID, rel_path: str, *, is_dir: bool, size: int
) -> ProjectFile:
    norm = _normalize(rel_path)
    result = await db.execute(
        select(ProjectFile).where(ProjectFile.project_id == project_id, ProjectFile.path == norm)
    )
    row = result.scalar_one_or_none()
    if row is None:
        row = ProjectFile(project_id=project_id, path=norm, is_dir=is_dir, size=size)
        db.add(row)
    else:
        row.is_dir = is_dir
        row.size = size
    await db.flush()
    return row


async def _ensure_parent_dirs(db: AsyncSession, project_id: uuid.UUID, rel_path: str) -> None:
    parent = PurePosixPath(_normalize(rel_path)).parent
    if str(parent) in (".", ""):
        return
    parts = parent.parts
    for i in range(1, len(parts) + 1):
        ancestor = str(PurePosixPath(*parts[:i]))
        await _upsert_file_row(db, project_id, ancestor, is_dir=True, size=0)


async def instantiate_template(db: AsyncSession, *, project: Project, template: str) -> None:
    src = TEMPLATES_ROOT / template
    dest = project_root(project.id)
    if src.is_dir():
        shutil.copytree(src, dest, dirs_exist_ok=True)
    for path in sorted(dest.rglob("*")):
        rel = path.relative_to(dest).as_posix()
        if path.is_dir():
            await _upsert_file_row(db, project.id, rel, is_dir=True, size=0)
        else:
            await _upsert_file_row(db, project.id, rel, is_dir=False, size=path.stat().st_size)


async def get_tree(db: AsyncSession, project_id: uuid.UUID) -> list[ProjectFile]:
    result = await db.execute(
        select(ProjectFile).where(ProjectFile.project_id == project_id).order_by(ProjectFile.path)
    )
    return list(result.scalars().all())


async def read_file(db: AsyncSession, project_id: uuid.UUID, rel_path: str) -> str:
    path = resolve_path(project_id, rel_path)
    norm = _normalize(rel_path)
    result = await db.execute(
        select(ProjectFile).where(
            ProjectFile.project_id == project_id,
            ProjectFile.path == norm,
            ProjectFile.is_dir.is_(False),
        )
    )
    if result.scalar_one_or_none() is None:
        raise NotFoundOnDiskError(rel_path)
    return path.read_text(encoding="utf-8")


async def write_file(
    db: AsyncSession, project_id: uuid.UUID, rel_path: str, content: str
) -> ProjectFile:
    path = resolve_path(project_id, rel_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    await _ensure_parent_dirs(db, project_id, rel_path)
    row = await _upsert_file_row(db, project_id, rel_path, is_dir=False, size=path.stat().st_size)
    await db.commit()
    await db.refresh(row)
    return row


async def create_entry(
    db: AsyncSession, project_id: uuid.UUID, rel_path: str, *, is_dir: bool
) -> ProjectFile:
    path = resolve_path(project_id, rel_path)
    if is_dir:
        path.mkdir(parents=True, exist_ok=True)
    else:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.touch(exist_ok=True)
    await _ensure_parent_dirs(db, project_id, rel_path)
    size = 0 if is_dir else path.stat().st_size
    row = await _upsert_file_row(db, project_id, rel_path, is_dir=is_dir, size=size)
    await db.commit()
    await db.refresh(row)
    return row


async def delete_entry(db: AsyncSession, project_id: uuid.UUID, rel_path: str) -> None:
    path = resolve_path(project_id, rel_path)
    norm = _normalize(rel_path)
    if path.is_dir():
        shutil.rmtree(path, ignore_errors=True)
        await db.execute(
            delete(ProjectFile).where(
                ProjectFile.project_id == project_id,
                (ProjectFile.path == norm)
                | (ProjectFile.path.like(_like_prefix(norm), escape="\\")),
            )
        )
    else:
        path.unlink(missing_ok=True)
        await db.execute(
            delete(ProjectFile).where(
                ProjectFile.project_id == project_id, ProjectFile.path == norm
            )
        )
    await db.commit()


async def rename_entry(
    db: AsyncSession, project_id: uuid.UUID, old_path: str, new_path: str
) -> ProjectFile:
    src = resolve_path(project_id, old_path)
    dst = resolve_path(project_id, new_path)
    old_norm = _normalize(old_path)
    new_norm = _normalize(new_path)
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(str(src), str(dst))
    await _ensure_parent_dirs(db, project_id, new_path)

    result = await db.execute(
        select(ProjectFile).where(
            ProjectFile.project_id == project_id,
            (ProjectFile.path == old_norm)
            | (ProjectFile.path.like(_like_prefix(old_norm), escape="\\")),
        )
    )
    rows = list(result.scalars().all())
    moved_root: ProjectFile | None = None
    for row in rows:
        suffix = row.path[len(old_norm) :]
        row.path = f"{new_norm}{suffix}"
        if row.path == new_norm:
            moved_root = row
    await db.flush()
    if moved_root is None:
        is_dir = dst.is_dir()
        size = 0 if is_dir else dst.stat().st_size
        moved_root = await _upsert_file_row(db, project_id, new_path, is_dir=is_dir, size=size)
    await db.commit()
    await db.refresh(moved_root)
    return moved_root


def delete_project_directory(project_id: uuid.UUID) -> None:
    root = Path(settings.PROJECTS_ROOT) / str(project_id)
    shutil.rmtree(root, ignore_errors=True)
