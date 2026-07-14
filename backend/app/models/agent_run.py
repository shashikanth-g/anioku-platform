"""AgentRun ORM model.

TODO(Phase 8): id (UUID pk), project_id (fk Project), agent_name, status
(pending/running/succeeded/failed), input, output, started_at, finished_at.
Tracks a single LangGraph multi-agent orchestration run for observability and
replay.
"""
