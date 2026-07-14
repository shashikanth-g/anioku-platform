"""Live preview port proxy: exposes a running project's dev server port through
the platform so the frontend LivePreview iframe can load it.

TODO(Phase 3): implement
- async def get_preview_url(project_id) -> str
- reverse-proxy or dynamic port mapping logic against the sandbox container started
  by docker_manager.
"""
