"""Memory ORM model — pgvector-backed embeddings for project-aware AI context.

TODO(Phase 5): id (UUID pk), project_id (fk Project), source_path, chunk_text,
embedding (Vector(1536) via pgvector, matches text-embedding-3-small), metadata
(json: line ranges, symbol names), created_at. Indexed with an IVFFlat/HNSW
index for similarity search in app/ai/context.py.
"""
