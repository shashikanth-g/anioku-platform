"""Project context builder: retrieval (pgvector similarity search over
app.models.memory.Memory) -> prompt assembly for chat and agent calls.

TODO(Phase 5): implement
- async def retrieve(project_id, query: str, k: int = 8) -> list[Memory]
- def assemble_prompt(system: str, retrieved: list[Memory], history: list[dict]) -> list[dict]
"""
