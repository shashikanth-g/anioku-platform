"""Per-project sandbox container lifecycle, via the docker SDK for Python
(talks to the host daemon over the socket mounted into the backend container).

TODO(Phase 3): implement
- async def create_container(project_id) -> Container   (from infra/project-runtime image,
  mounts PROJECTS_ROOT/<project_id> as the workdir)
- async def start_container(project_id) / stop_container(project_id) / remove_container(project_id)
- async def exec_command(project_id, command: str) -> CommandResult
"""
