import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, CreatedAtMixin, UUIDPKMixin
from app.models.enums import ContainerStatus

if TYPE_CHECKING:
    from app.models.agent_run import AgentRun
    from app.models.conversation import Conversation
    from app.models.deployment import Deployment
    from app.models.memory import MemoryEntry
    from app.models.project_file import ProjectFile
    from app.models.workspace import Workspace


class Project(UUIDPKMixin, CreatedAtMixin, Base):
    __tablename__ = "projects"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    template: Mapped[str] = mapped_column(String(64), nullable=False)
    language: Mapped[str | None] = mapped_column(String(64), nullable=True)
    framework: Mapped[str | None] = mapped_column(String(64), nullable=True)
    container_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    container_status: Mapped[ContainerStatus] = mapped_column(
        Enum(
            ContainerStatus,
            name="container_status_enum",
            values_callable=lambda e: [m.value for m in e],
        ),
        nullable=False,
        default=ContainerStatus.STOPPED,
        server_default=ContainerStatus.STOPPED.value,
    )
    preview_port: Mapped[int | None] = mapped_column(Integer, nullable=True)
    git_remote: Mapped[str | None] = mapped_column(String(1024), nullable=True)

    workspace: Mapped["Workspace"] = relationship(back_populates="projects")
    files: Mapped[list["ProjectFile"]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )
    conversations: Mapped[list["Conversation"]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )
    agent_runs: Mapped[list["AgentRun"]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )
    deployments: Mapped[list["Deployment"]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )
    memory_entries: Mapped[list["MemoryEntry"]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )
