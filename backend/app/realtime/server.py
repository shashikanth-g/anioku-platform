"""Socket.io server instance, mounted into the FastAPI ASGI app in app/main.py.

Event handlers are registered by presence.py, sync.py, and rooms.py (Phase 6);
this module only owns the AsyncServer/ASGIApp wiring so app/main.py has a
single stable import.

Event naming convention: "domain:action", e.g. "file:update", "terminal:output",
"presence:join", "chat:stream".
"""
import socketio

sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")
socket_app = socketio.ASGIApp(sio)
