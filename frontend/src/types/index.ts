// Shared TypeScript interfaces mirroring backend Pydantic schemas
// (backend/app/schemas/*.py and backend/app/models/enums.py). Keep field
// names/types in lockstep with the Python side.

export type Plan = "free" | "starter" | "pro" | "team";

export type WorkspaceRole = "admin" | "editor" | "viewer";

export type ContainerStatus = "stopped" | "starting" | "running" | "error";

// --- User / auth (mirrors schemas/user.py, schemas/auth.py) ---

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  plan: Plan;
  created_at: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
}

// --- Workspace (mirrors schemas/workspace.py) ---

export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  settings: Record<string, unknown>;
  created_at: string;
}

export interface WorkspaceCreate {
  name: string;
  settings?: Record<string, unknown>;
}

export interface WorkspaceUpdate {
  name?: string;
  settings?: Record<string, unknown>;
}

export interface WorkspaceMember {
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  email: string;
  name: string;
}

export interface WorkspaceMemberInvite {
  email: string;
  role: WorkspaceRole;
}

export interface WorkspaceMemberRoleUpdate {
  role: WorkspaceRole;
}

// --- Project (mirrors schemas/project.py) ---

export type TemplateName = "blank" | "node" | "next" | "python" | "fastapi";

export interface Project {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  template: string;
  language: string | null;
  framework: string | null;
  container_id: string | null;
  container_status: ContainerStatus;
  preview_port: number | null;
  git_remote: string | null;
  created_at: string;
}

export interface ProjectCreate {
  name: string;
  description?: string | null;
  template: TemplateName;
  language?: string | null;
  framework?: string | null;
}

export interface ProjectUpdate {
  name?: string;
  description?: string;
  git_remote?: string;
}

// --- Files (mirrors schemas/file.py) ---

export interface FileNode {
  path: string;
  is_dir: boolean;
  size: number;
  updated_at: string;
}

export interface FileContent {
  path: string;
  content: string;
}

// --- Shared pagination envelope (mirrors schemas/common.py) ---

export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}
