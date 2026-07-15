import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, CreatedAtMixin, UUIDPKMixin
from app.models.enums import MessageRole

if TYPE_CHECKING:
    from app.models.conversation import Conversation


class Message(UUIDPKMixin, CreatedAtMixin, Base):
    __tablename__ = "messages"

    conversation_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role: Mapped[MessageRole] = mapped_column(
        Enum(MessageRole, name="message_role_enum", values_callable=lambda e: [m.value for m in e]),
        nullable=False,
    )
    agent_name: Mapped[str | None] = mapped_column(String(64), nullable=True)
    model: Mapped[str | None] = mapped_column(String(128), nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    # Named `metadata_` in Python since `metadata` is reserved by DeclarativeBase;
    # the DB column itself is still named `metadata`, matching the spec.
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSONB, nullable=True)

    conversation: Mapped["Conversation"] = relationship(back_populates="messages")
