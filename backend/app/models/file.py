"""File ORM model.

TODO(Phase 1): id (UUID pk), project_id (fk Project), path, content or
storage_ref, language, size_bytes, created_at, updated_at. Represents a file
tracked in a project's workspace (metadata; actual bytes may live on disk under
PROJECTS_ROOT with this row as the index).
"""
