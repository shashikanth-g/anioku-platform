"""LangGraph multi-agent orchestration graph.

TODO(Phase 8): implement
- build_graph() -> a LangGraph StateGraph wiring planner -> architect ->
  {frontend, backend, database} -> testing -> review -> security -> docs -> devops
  nodes (see app/ai/agents/*), with shared state persisted to AgentRun rows.
- async def run(project_id, goal: str) -> AgentRun
"""
