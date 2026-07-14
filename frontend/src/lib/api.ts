// Typed fetch client for the backend REST API (mirrors backend/app/api/*.py,
// all under NEXT_PUBLIC_API_URL + /api/v1).
//
// TODO(Phase 1): implement
// - a small wrapper around fetch() that injects the auth header, the
//   NEXT_PUBLIC_API_URL base, and JSON parses/throws on non-2xx.
// - one typed function per endpoint as routers land (login, listWorkspaces,
//   listProjects, readFile, writeFile, ...).

export {};
