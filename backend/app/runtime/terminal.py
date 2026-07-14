"""PTY terminal sessions bridging xterm.js (socket.io) to a running sandbox
container's shell.

TODO(Phase 3): implement
- async def open_session(project_id) -> TerminalSession   (docker exec with a pty, via docker_manager)
- async def write(session_id, data: str) -> None
- async def resize(session_id, cols: int, rows: int) -> None
"""
