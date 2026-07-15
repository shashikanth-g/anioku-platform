import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, CreatedAtMixin, UUIDPKMixin
from app.models.enums import DeploymentTarget

if TYPE_CHECKING:
    from app.models.project import Project


class Deployment(UUIDPKMixin, CreatedAtMixin, Base):
    __tablename__ = "deployments"

    project_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    target: Mapped[DeploymentTarget] = mapped_column(
        Enum(
            DeploymentTarget,
            name="deployment_target_enum",
            values_callable=lambda e: [m.value for m in e],
        ),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default="pending", server_default="pending"
    )
    url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    logs: Mapped[str | None] = mapped_column(Text, nullable=True)

    project: Mapped["Project"] = relationship(back_populates="deployments")
