"""Celery task definitions.

TODO(Phase 5/8/10): implement
- @celery_app.task def index_project_task(project_id) -> None   (calls app.ai.indexer.index_project)
- @celery_app.task def run_agent_task(project_id, goal: str) -> None   (calls app.ai.orchestrator.run)
- @celery_app.task def deploy_project_task(project_id, provider: str) -> None   (calls app.services.deploy_service)
"""

from app.workers.celery_app import celery_app

__all__ = ["celery_app"]
