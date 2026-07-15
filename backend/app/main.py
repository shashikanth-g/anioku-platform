"""ANKU backend entrypoint: FastAPI app combined with the socket.io ASGI app.

Resource routers (auth, workspaces, projects, files, terminal, git, ai, agents,
deploy, search) are added here as they're implemented, each under
settings.API_V1_PREFIX. See app/api/*.py.

`app` (the object uvicorn serves, per the Dockerfile/docker-compose command
`uvicorn app.main:app`) is the combined ASGI app: socket.io handles requests
under /socket.io, everything else falls through to the FastAPI app.
"""

import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, files, projects, workspaces
from app.core.config import settings
from app.realtime.server import sio

fastapi_app = FastAPI(title=settings.APP_NAME)

fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

fastapi_app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
fastapi_app.include_router(workspaces.router, prefix=settings.API_V1_PREFIX)
fastapi_app.include_router(projects.router, prefix=settings.API_V1_PREFIX)
fastapi_app.include_router(files.router, prefix=settings.API_V1_PREFIX)


@fastapi_app.get(f"{settings.API_V1_PREFIX}/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


app = socketio.ASGIApp(sio, other_asgi_app=fastapi_app)
