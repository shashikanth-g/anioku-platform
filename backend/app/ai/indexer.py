"""Codebase indexer: walks a project's files, chunks them, embeds via
OpenAI text-embedding-3-small, and upserts into pgvector (app.models.memory.Memory).

TODO(Phase 5): implement
- def chunk_file(path: str, content: str) -> list[str]
- async def embed_chunks(chunks: list[str]) -> list[list[float]]
- async def index_project(project_id) -> None   (invoked as a Celery task on file changes)
"""
