"""Agent tools: the actions LangGraph agents can invoke against a project.

TODO(Phase 5/8): implement, each routed through app.runtime.docker_manager for
sandboxed execution:
- read_file(project_id, path) -> str
- write_file(project_id, path, content) -> None
- run_command(project_id, command: str) -> CommandResult
- search_code(project_id, query: str) -> list[SearchHit]   (delegates to ai.context.retrieve)
- git ops: git_diff, git_commit  (delegates to app.services.git_service)
"""
