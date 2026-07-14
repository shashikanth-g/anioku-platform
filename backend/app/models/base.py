"""Declarative base shared by every ORM model, and the metadata Alembic targets."""
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass
