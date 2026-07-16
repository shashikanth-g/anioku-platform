// Typed fetch client for the backend REST API (mirrors backend/app/api/*.py,
// all under NEXT_PUBLIC_API_URL + /api/v1). Cookies (HttpOnly access/refresh
// JWTs) are sent automatically via credentials: "include"; on a 401 this
// client makes a single attempt to refresh the access token and retries the
// original request once before giving up.
import type {
  AuthResponse,
  FileContent,
  FileNode,
  LoginRequest,
  Page,
  Project,
  ProjectCreate,
  ProjectUpdate,
  SignupRequest,
  User,
  Workspace,
  WorkspaceCreate,
  WorkspaceMember,
  WorkspaceMemberInvite,
  WorkspaceMemberRoleUpdate,
  WorkspaceUpdate,
} from "@/types";

const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_BASE = `${API_ORIGIN}/api/v1`;

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

function qs(params?: Record<string, string | number | undefined>): string {
  if (!params) return "";
  const entries = Object.entries(params).filter(([, v]) => v !== undefined) as [
    string,
    string | number,
  ][];
  if (entries.length === 0) return "";
  return `?${new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString()}`;
}

// Concurrent 401s share a single in-flight refresh call instead of each
// firing their own POST /auth/refresh.
let refreshPromise: Promise<boolean> | null = null;

function refreshAccessToken(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

const NO_REFRESH_PATHS = new Set([
  "/auth/login",
  "/auth/signup",
  "/auth/refresh",
]);

async function request<T>(
  path: string,
  options: RequestInit = {},
  _retried = false,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401 && !_retried && !NO_REFRESH_PATHS.has(path)) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return request<T>(path, options, true);
    }
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const isJson =
    res.headers.get("content-type")?.includes("application/json") ?? false;
  const body = isJson ? await res.json() : undefined;

  if (!res.ok) {
    const message = (body && (body.detail ?? body.message)) || res.statusText;
    throw new ApiError(res.status, message, body);
  }

  return body as T;
}

export const api = {
  auth: {
    signup: (payload: SignupRequest) =>
      request<AuthResponse>("/auth/signup", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    login: (payload: LoginRequest) =>
      request<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    logout: () => request<void>("/auth/logout", { method: "POST" }),
    me: () => request<User>("/auth/me"),
  },
  workspaces: {
    list: (params?: { limit?: number; offset?: number }) =>
      request<Page<Workspace>>(`/workspaces${qs(params)}`),
    create: (payload: WorkspaceCreate) =>
      request<Workspace>("/workspaces", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    get: (id: string) => request<Workspace>(`/workspaces/${id}`),
    update: (id: string, payload: WorkspaceUpdate) =>
      request<Workspace>(`/workspaces/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    remove: (id: string) =>
      request<void>(`/workspaces/${id}`, { method: "DELETE" }),
    listMembers: (id: string) =>
      request<WorkspaceMember[]>(`/workspaces/${id}/members`),
    inviteMember: (id: string, payload: WorkspaceMemberInvite) =>
      request<WorkspaceMember>(`/workspaces/${id}/members`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    updateMemberRole: (
      id: string,
      userId: string,
      payload: WorkspaceMemberRoleUpdate,
    ) =>
      request<WorkspaceMember>(`/workspaces/${id}/members/${userId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    removeMember: (id: string, userId: string) =>
      request<void>(`/workspaces/${id}/members/${userId}`, {
        method: "DELETE",
      }),
  },
  projects: {
    list: (workspaceId: string, params?: { limit?: number; offset?: number }) =>
      request<Page<Project>>(
        `/workspaces/${workspaceId}/projects${qs(params)}`,
      ),
    create: (workspaceId: string, payload: ProjectCreate) =>
      request<Project>(`/workspaces/${workspaceId}/projects`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    get: (id: string) => request<Project>(`/projects/${id}`),
    update: (id: string, payload: ProjectUpdate) =>
      request<Project>(`/projects/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    remove: (id: string) =>
      request<void>(`/projects/${id}`, { method: "DELETE" }),
  },
  files: {
    tree: (projectId: string) =>
      request<FileNode[]>(`/projects/${projectId}/files`),
    read: (projectId: string, path: string) =>
      request<FileContent>(
        `/projects/${projectId}/files/content?path=${encodeURIComponent(path)}`,
      ),
    write: (projectId: string, path: string, content: string) =>
      request<FileNode>(
        `/projects/${projectId}/files/content?path=${encodeURIComponent(path)}`,
        {
          method: "PUT",
          body: JSON.stringify({ content }),
        },
      ),
    create: (projectId: string, path: string, isDir = false) =>
      request<FileNode>(`/projects/${projectId}/files`, {
        method: "POST",
        body: JSON.stringify({ path, is_dir: isDir }),
      }),
    remove: (projectId: string, path: string) =>
      request<void>(
        `/projects/${projectId}/files?path=${encodeURIComponent(path)}`,
        {
          method: "DELETE",
        },
      ),
    rename: (projectId: string, path: string, newPath: string) =>
      request<FileNode>(
        `/projects/${projectId}/files?path=${encodeURIComponent(path)}`,
        {
          method: "PATCH",
          body: JSON.stringify({ new_path: newPath }),
        },
      ),
  },
};
