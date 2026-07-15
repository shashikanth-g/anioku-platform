"""Python enums shared by the ORM models and Pydantic schemas — the single
source of truth for every fixed-vocabulary column, mapped to native Postgres
enum types via SQLAlchemy's Enum(...) in each model.
"""

import enum


class Plan(str, enum.Enum):
    FREE = "free"
    STARTER = "starter"
    PRO = "pro"
    TEAM = "team"


class WorkspaceRole(str, enum.Enum):
    ADMIN = "admin"
    EDITOR = "editor"
    VIEWER = "viewer"


class ContainerStatus(str, enum.Enum):
    STOPPED = "stopped"
    STARTING = "starting"
    RUNNING = "running"
    ERROR = "error"


class MessageRole(str, enum.Enum):
    USER = "user"
    ASSISTANT = "assistant"
    AGENT = "agent"
    SYSTEM = "system"


class AgentRunStatus(str, enum.Enum):
    QUEUED = "queued"
    RUNNING = "running"
    DONE = "done"
    FAILED = "failed"


class DeploymentTarget(str, enum.Enum):
    VERCEL = "vercel"
    RAILWAY = "railway"
    DOCKER = "docker"


class MemoryKind(str, enum.Enum):
    DECISION = "decision"
    CONVENTION = "convention"
    ARCHITECTURE = "architecture"
    ISSUE = "issue"
