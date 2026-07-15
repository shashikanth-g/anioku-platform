import uuid
from typing import TYPE_CHECKING

from pgvector.sqlalchemy import Vector
from sqlalchemy import Enum, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, CreatedAtMixin, UUIDPKMixin
from app.models.enums import MemoryKind

if TYPE_CHECKING:
    from app.models.project import Project


class MemoryEntry(UUIDPKMixin, CreatedAtMixin, Base):
    __tablename__ = "memory_entries"

    project_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    kind: Mapped[MemoryKind] = mapped_column(
        Enum(MemoryKind, name="memory_kind_enum", values_callable=lambda e: [m.value for m in e]),
        nullable=False,
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    embedding: Mapped[list[float]] = mapped_column(Vector(1536), nullable=False)

    project: Mapped["Project"] = relationship(back_populates="memory_entries")
